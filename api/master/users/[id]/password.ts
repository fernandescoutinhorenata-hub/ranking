import { supabaseAdmin } from '../../../../src/lib/supabase';
import bcrypt from 'bcryptjs';

export default async function handler(req: any, res: any) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method Not Allowed' });
  if (req.headers.authorization !== 'Bearer Wrestling2015*') return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  const { password } = req.body;
  if (!id || !password) return res.status(400).json({ error: 'Missing data' });

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const { error } = await supabaseAdmin.from('users').update({ password_hash }).eq('id', id);

    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
