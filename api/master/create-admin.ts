import { supabaseAdmin } from '../../src/lib/supabase';
import bcrypt from 'bcryptjs';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (req.headers.authorization !== 'Bearer Wrestling2015*') return res.status(401).json({ error: 'Unauthorized' });

  const { nick, password, role } = req.body;
  if (!nick || !password || role !== 'ADMIN') return res.status(400).json({ error: 'Missing data' });

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([{ nick, password_hash, role, status: 'ATIVO' }])
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
