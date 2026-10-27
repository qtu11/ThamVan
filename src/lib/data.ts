import 'server-only';
import { cache } from 'react';
import { catalog, starterChallenges } from '@/data/catalog';
import { supabase } from './supabase/server';
import { hasSupabase } from './env';
import type { Heritage, Challenge, Viewer, Profile, Saved, Progress } from './types';
import { acceptedCurrentTerms } from './auth-policy';
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!hasSupabase()) return null;
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const [profile, role] = await Promise.all([
    db
      .from('profiles')
      .select('id,display_name,locale,radius_km,notifications,terms_version,consented_at')
      .eq('id', user.id)
      .single(),
    db.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
  ]);
  if (profile.error || role.error) throw new Error('ACCOUNT_LOAD_FAILED');
  return {
    id: user.id,
    email: user.email || '',
    profile: profile.data as Profile,
    admin: role.data?.role === 'admin',
    acceptedTerms: acceptedCurrentTerms(profile.data),
    providers: [...new Set((user.identities || []).map((identity) => identity.provider))],
  };
});
export const getHcmPlacesData = cache(async (): Promise<Heritage[]> => {
  const { getHcmPlaces } = await import('@/data/hcm-places');
  return getHcmPlaces();
});
/** Discovery catalog = danh bạ TP.HCM (starter HCM chỉ dùng khi danh bạ trống). */
export const getCatalog = cache(async (): Promise<Heritage[]> => {
  const hcm = await getHcmPlacesData();
  return hcm.length ? hcm : catalog;
});
export const getAllMapPlaces = cache(async (): Promise<Heritage[]> => getHcmPlacesData());
export const getChallenges = cache(async (): Promise<Challenge[]> => {
  if (!hasSupabase()) return starterChallenges;
  const db = await supabase();
  const { data, error } = await db
    .from('challenges')
    .select('*')
    .eq('status', 'published')
    .order('created_at')
    .limit(200);
  if (error) throw new Error('CHALLENGES_LOAD_FAILED');
  return data as Challenge[];
});
export async function getPersonalData(): Promise<{ saved: Saved[]; progress: Progress[] }> {
  const viewer = await getViewer();
  if (!viewer) return { saved: [], progress: [] };
  const db = await supabase();
  const [saved, progress] = await Promise.all([
    db
      .from('saved_entries')
      .select('entry_id,collection,saved_at,visited_at')
      .eq('user_id', viewer.id)
      .order('saved_at', { ascending: false }),
    db
      .from('challenge_progress')
      .select('challenge_id,joined_at,completed_at,awarded_points')
      .eq('user_id', viewer.id),
  ]);
  if (saved.error || progress.error) throw new Error('PERSONAL_DATA_LOAD_FAILED');
  return { saved: saved.data, progress: progress.data };
}
