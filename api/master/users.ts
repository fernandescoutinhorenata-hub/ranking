import { supabaseAdmin } from '../../src/lib/supabase';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
  if (req.headers.authorization !== 'Bearer Wrestling2015*') return res.status(401).json({ error: 'Unauthorized' });

  const nick = req.query.nick;
  if (!nick) return res.status(400).json({ error: 'Missing nick query' });

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, nick, role, created_at')
      .ilike('nick', `%${nick}%`)
      .limit(10);

    if (error) throw error;
    res.status(200).json(data || []);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
