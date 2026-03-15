import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { getISOWeek } from 'date-fns';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Database Setup
const db = new Database('rankfire.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    discordId TEXT UNIQUE,
    discordName TEXT,
    discordAvatar TEXT,
    role TEXT DEFAULT 'PLAYER',
    totalPoints INTEGER DEFAULT 0,
    weeklyPoints INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    userId TEXT,
    imageUrl TEXT,
    status TEXT DEFAULT 'PENDING',
    reviewedBy TEXT,
    reviewedAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    weekNumber INTEGER,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS weekly_resets (
    id TEXT PRIMARY KEY,
    weekNumber INTEGER UNIQUE,
    resetAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Middleware to authenticate JWT
  const authenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
      });
    } else {
      res.sendStatus(401);
    }
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.user && req.user.role === 'ADMIN') {
      next();
    } else {
      res.sendStatus(403);
    }
  };

  // --- API ROUTES ---

  // Auth: Discord Login Redirect
  app.get('/api/auth/discord', (req, res) => {
    if (!DISCORD_CLIENT_ID) {
      return res.status(500).json({ error: 'DISCORD_CLIENT_ID not configured' });
    }
    const redirectUri = encodeURIComponent(`${APP_URL}/api/auth/callback`);
    const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify`;
    res.redirect(url);
  });

  // Auth: Discord Callback
  app.get('/api/auth/callback', async (req, res) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).send('No code provided');

    try {
      const redirectUri = `${APP_URL}/api/auth/callback`;
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID!,
          client_secret: DISCORD_CLIENT_SECRET!,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const discordUser = await userResponse.json();

      // Upsert user
      const stmt = db.prepare('SELECT * FROM users WHERE discordId = ?');
      let user = stmt.get(discordUser.id) as any;

      if (!user) {
        const insert = db.prepare('INSERT INTO users (id, discordId, discordName, discordAvatar) VALUES (?, ?, ?, ?)');
        const id = Math.random().toString(36).substring(2, 15);
        insert.run(id, discordUser.id, discordUser.username, discordUser.avatar);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      } else {
        const update = db.prepare('UPDATE users SET discordName = ?, discordAvatar = ? WHERE id = ?');
        update.run(discordUser.username, discordUser.avatar, user.id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      }

      const jwtToken = jwt.sign({ id: user.id, discordId: user.discordId, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      
      // Redirect to frontend with token
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${jwtToken}' }, '*');
                window.close();
              } else {
                window.location.href = '/?token=${jwtToken}';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('OAuth error:', error);
      res.status(500).send('Authentication failed: ' + error.message);
    }
  });

  // Auth: Get Current User
  app.get('/api/auth/me', authenticate, (req: any, res) => {
    const user = db.prepare('SELECT id, discordId, discordName, discordAvatar, role, totalPoints, weeklyPoints FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });

  // Submissions: Create
  app.post('/api/submissions', authenticate, upload.single('image'), (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const userId = req.user.id;
    
    // Check limits: max 3 pending
    const pendingCount = db.prepare("SELECT COUNT(*) as count FROM submissions WHERE userId = ? AND status = 'PENDING'").get(userId) as any;
    if (pendingCount.count >= 3) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Maximum 3 pending submissions allowed' });
    }

    const id = Math.random().toString(36).substring(2, 15);
    const imageUrl = `/uploads/${req.file.filename}`;
    const weekNumber = getISOWeek(new Date());

    const insert = db.prepare('INSERT INTO submissions (id, userId, imageUrl, weekNumber) VALUES (?, ?, ?, ?)');
    insert.run(id, userId, imageUrl, weekNumber);

    res.json({ success: true, submissionId: id });
  });

  // Submissions: My Submissions
  app.get('/api/submissions/my', authenticate, (req: any, res) => {
    const submissions = db.prepare('SELECT * FROM submissions WHERE userId = ? ORDER BY createdAt DESC LIMIT 20').all(req.user.id);
    res.json(submissions);
  });

  // Submissions: Pending (Admin)
  app.get('/api/submissions/pending', authenticate, requireAdmin, (req, res) => {
    const submissions = db.prepare(`
      SELECT s.*, u.discordId, u.discordName, u.discordAvatar 
      FROM submissions s 
      JOIN users u ON s.userId = u.id 
      WHERE s.status = 'PENDING' 
      ORDER BY s.createdAt ASC
    `).all();
    res.json(submissions);
  });

  // Submissions: Review (Admin)
  app.post('/api/submissions/:id/review', authenticate, requireAdmin, (req: any, res) => {
    const { action } = req.body;
    const submissionId = req.params.id;
    const adminId = req.user.discordId;

    const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId) as any;
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    if (submission.status !== 'PENDING') return res.status(400).json({ error: 'Submission already reviewed' });

    if (action === 'approve') {
      const updateSub = db.prepare("UPDATE submissions SET status = 'APPROVED', reviewedBy = ?, reviewedAt = CURRENT_TIMESTAMP WHERE id = ?");
      updateSub.run(adminId, submissionId);

      const updateUser = db.prepare('UPDATE users SET totalPoints = totalPoints + 1, weeklyPoints = weeklyPoints + 1 WHERE id = ?');
      updateUser.run(submission.userId);
    } else if (action === 'reject') {
      const updateSub = db.prepare("UPDATE submissions SET status = 'REJECTED', reviewedBy = ?, reviewedAt = CURRENT_TIMESTAMP WHERE id = ?");
      updateSub.run(adminId, submissionId);
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({ success: true });
  });

  // Ranking
  app.get('/api/ranking', (req, res) => {
    const type = req.query.type === 'overall' ? 'totalPoints' : 'weeklyPoints';
    const users = db.prepare(`
      SELECT id, discordId, discordName, discordAvatar, weeklyPoints, totalPoints 
      FROM users 
      ORDER BY ${type} DESC, createdAt ASC 
      LIMIT 50
    `).all();
    res.json(users);
  });

  // Admin: Reset Weekly
  app.post('/api/admin/reset-weekly', authenticate, requireAdmin, (req, res) => {
    const weekNumber = getISOWeek(new Date());
    
    try {
      db.prepare('BEGIN').run();
      db.prepare('UPDATE users SET weeklyPoints = 0').run();
      db.prepare('INSERT INTO weekly_resets (id, weekNumber) VALUES (?, ?)').run(Math.random().toString(36).substring(2, 15), weekNumber);
      db.prepare('COMMIT').run();
      res.json({ success: true, resetAt: new Date() });
    } catch (error: any) {
      db.prepare('ROLLBACK').run();
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Promote User (For testing/setup)
  app.post('/api/admin/promote', (req, res) => {
    // In a real app, this should be protected by a secret key or done manually in DB.
    // We add this for easy setup in AI Studio.
    const { discordId, secret } = req.body;
    if (secret !== process.env.ADMIN_SECRET && process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Invalid secret' });
    }
    const update = db.prepare("UPDATE users SET role = 'ADMIN' WHERE discordId = ?");
    const result = update.run(discordId);
    if (result.changes > 0) {
      res.json({ success: true, message: 'User promoted to ADMIN' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
