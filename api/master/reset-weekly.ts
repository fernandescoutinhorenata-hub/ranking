import { supabaseAdmin } from '../../src/lib/supabase';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (req.headers.authorization !== 'Bearer Wrestling2015*') return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { error } = await supabaseAdmin.from('users').update({ weekly_points: 0 }).neq('id', 'dummy');
    
    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
