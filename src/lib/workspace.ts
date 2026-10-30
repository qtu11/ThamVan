import 'server-only';
import { cache } from 'react';
import { getViewer } from './data';
import { supabase } from './supabase/server';
import type { MembershipAccess } from './plans';
import { z } from 'zod';
const accessSchema = z.object({
  plan: z.enum(['free', 'premium', 'family']),
  owner_id: z.uuid().nullable(),
  expires_at: z.iso.datetime({ offset: true }).nullable(),
  challenge_used: z.number().int().nonnegative(),
  challenge_limit: z.number().int().nonnegative().nullable(),
  is_owner: z.boolean(),
});

export type Visit = {
  id: string;
  entry_slug: string;
  place_name: string;
  latitude: number | null;
  longitude: number | null;
  method: string;
  visited_at: string;
};
export type Trip = { id: string; name: string; started_at: string; ended_at: string | null };
export type TrackPoint = {
  sequence: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  recorded_at: string;
};
export type PlanOrder = {
  id: string;
  order_code: number;
  plan_id: 'premium' | 'family';
  amount: number;
  status: string;
  provider: string;
  method: string;
  created_at: string;
  paid_at: string | null;
  processing_fee: number | null;
};
export type Submission = {
  id: string;
  name: string;
  address: string;
  region: string;
  summary: string;
  source_url: string;
  status: string;
  review_note: string;
  latitude: number;
  longitude: number;
  created_at: string;
};
export type Notice = {
  id: string;
  kind: string;
  title: string;
  body: string;
  url: string;
  read_at: string | null;
  created_at: string;
};
export type Itinerary = {
  id: string;
  title: string;
  days: ItineraryDay[];
  created_at: string;
  provider_model: string;
};
export type ItineraryDay = {
  day: number;
  stops: { slug: string; time: string; reason: string; minutes: number }[];
};
export type AccountWorkspace = {
  access: MembershipAccess;
  visits: Visit[];
  trips: Trip[];
  orders: PlanOrder[];
  submissions: Submission[];
  notifications: Notice[];
  itineraries: Itinerary[];
  family: { member_id: string; joined_at: string }[];
};

export const getMembership = cache(async (): Promise<MembershipAccess | null> => {
  const viewer = await getViewer();
  if (!viewer) return null;
  const db = await supabase();
  const { data, error } = await db.rpc('my_membership');
  const parsed = accessSchema.safeParse(data);
  if (error || !parsed.success) throw new Error('MEMBERSHIP_UNAVAILABLE');
  return parsed.data;
});
export const getAccountWorkspace = cache(async (): Promise<AccountWorkspace | null> => {
  const viewer = await getViewer();
  if (!viewer) return null;
  const db = await supabase();
  const [access, visits, trips, orders, submissions, notifications, itineraries, family] =
    await Promise.all([
      getMembership(),
      db
        .from('discovery_visits')
        .select('*')
        .eq('user_id', viewer.id)
        .order('visited_at', { ascending: false })
        .limit(100),
      db
        .from('travel_sessions')
        .select('id,name,started_at,ended_at')
        .eq('user_id', viewer.id)
        .order('started_at', { ascending: false })
        .limit(30),
      db
        .from('plan_orders')
        .select(
          'id,order_code,plan_id,amount,status,provider,method,created_at,paid_at,processing_fee',
        )
        .eq('user_id', viewer.id)
        .order('created_at', { ascending: false })
        .limit(50),
      db
        .from('place_submissions')
        .select('*')
        .eq('user_id', viewer.id)
        .order('created_at', { ascending: false })
        .limit(50),
      db
        .from('user_notifications')
        .select('*')
        .eq('user_id', viewer.id)
        .order('created_at', { ascending: false })
        .limit(50),
      db
        .from('itineraries')
        .select('*')
        .eq('user_id', viewer.id)
        .order('created_at', { ascending: false })
        .limit(20),
      db.from('family_members').select('member_id,joined_at').eq('owner_id', viewer.id),
    ]);
  if (
    !access ||
    [visits, trips, orders, submissions, notifications, itineraries, family].some(
      (result) => result.error,
    )
  )
    throw new Error('WORKSPACE_UNAVAILABLE');
  return {
    access,
    visits: visits.data as Visit[],
    trips: trips.data as Trip[],
    orders: orders.data as PlanOrder[],
    submissions: submissions.data as Submission[],
    notifications: notifications.data as Notice[],
    itineraries: itineraries.data as Itinerary[],
    family: family.data || [],
  };
});
