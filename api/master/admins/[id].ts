import { supabaseAdmin } from '../../../src/lib/supabase';

export default async function handler(req: any, res: any) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method Not Allowed' });
  if (req.headers.authorization !== 'Bearer Wrestling2015*') return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing ID' });

  try {
    const { error } = await supabaseAdmin.from('users').delete().eq('id', id).eq('role', 'ADMIN');
    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
