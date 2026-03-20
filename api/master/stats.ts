import { supabaseAdmin } from '../../src/lib/supabase';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
  if (req.headers.authorization !== 'Bearer Wrestling2015*') return res.status(401).json({ error: 'Unauthorized' });

  try {
    const [{ count: totalPlayers }, { count: totalAdmins }, { count: pendingSubmissions }, { data: usersData }] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'PLAYER'),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'ADMIN'),
      supabaseAdmin.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      supabaseAdmin.from('users').select('weekly_points').eq('role', 'PLAYER')
    ]);

    const weeklyPoints = usersData ? usersData.reduce((acc, curr) => acc + (curr.weekly_points || 0), 0) : 0;

    res.status(200).json({
      totalPlayers: totalPlayers || 0,
      totalAdmins: totalAdmins || 0,
      pendingSubmissions: pendingSubmissions || 0,
      weeklyPoints
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
