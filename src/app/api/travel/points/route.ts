import { getViewer } from '@/lib/data';
import { supabase } from '@/lib/supabase/server';
export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: 'authRequired' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('session');
  if (!id || !/^[\da-f-]{36}$/i.test(id))
    return Response.json({ error: 'invalidInput' }, { status: 422 });
  const db = await supabase();
  const { data: trip } = await db
    .from('travel_sessions')
    .select('id')
    .eq('id', id)
    .eq('user_id', viewer.id)
    .maybeSingle();
  if (!trip) return Response.json({ error: 'forbidden' }, { status: 403 });
  const { data, error } = await db
    .from('travel_points')
    .select('sequence,latitude,longitude,accuracy,recorded_at')
    .eq('session_id', id)
    .order('sequence')
    .limit(2000);
  if (error) return Response.json({ error: 'error' }, { status: 503 });
  return Response.json(
    { points: data, limit: 2000 },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
