import { z } from 'zod';
import { route, readJson, requireViewer, fail, ok } from '@/lib/api';
import { supabase, supabaseAdmin } from '@/lib/supabase/server';
import { getCatalog } from '@/lib/data';
import { sendUserPush, pushReady } from '@/lib/push';
import { distanceKm } from '@/lib/geo';

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('visit'),
    slug: z.string().min(1).max(100),
    key: z.uuid(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    accuracy: z.number().min(0).max(150).optional(),
  }),
  z.object({ action: z.literal('deleteVisit'), id: z.uuid() }),
  z.object({ action: z.literal('readNotification'), id: z.uuid() }),
  z.object({
    action: z.literal('family'),
    operation: z.enum(['invite', 'accept', 'remove', 'leave', 'revoke']),
    token: z.uuid().optional(),
    member: z.uuid().optional(),
  }),
  z.object({
    action: z.literal('submitPlace'),
    name: z.string().trim().min(3).max(160),
    address: z.string().trim().min(5).max(250),
    region: z.string().trim().min(2).max(80),
    summary: z.string().trim().min(30).max(2000),
    latitude: z.number().min(8).max(12),
    longitude: z.number().min(105).max(108),
    source: z
      .url()
      .refine((value) => {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password;
      })
      .max(1000),
    consent: z.literal(true),
  }),
  z.object({
    action: z.literal('trip'),
    operation: z.enum(['start', 'stop', 'point', 'delete']),
    name: z.string().trim().min(1).max(100).optional(),
    session: z.uuid().optional(),
    sequence: z.number().int().min(0).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    accuracy: z.number().min(0).max(150).optional(),
    time: z.iso.datetime().optional(),
    consent: z.boolean().optional(),
  }),
]);
export const POST = route(async (request) => {
  const viewer = await requireViewer();
  const body = await readJson(request, schema);
  const db = await supabase();
  if (body.action === 'visit') {
    const quota = await supabaseAdmin().rpc('consume_workspace_quota', {
      p_user: viewer.id,
      p_bucket: 'visit',
      p_limit: 30,
      p_seconds: 60,
    });
    if (quota.error || !quota.data) fail('rateLimit', 429);
    const entry = (await getCatalog()).find((item) => item.slug === body.slug);
    if (!entry) fail('invalidInput', 422);
    const supplied = [body.latitude, body.longitude, body.accuracy].filter(
      (value) => value !== undefined,
    ).length;
    if (supplied !== 0 && supplied !== 3) fail('invalidInput', 422);
    const gps =
      body.latitude !== undefined && body.longitude !== undefined && body.accuracy !== undefined;
    if (
      gps &&
      (entry.latitude === null ||
        entry.longitude === null ||
        distanceKm(
          { latitude: body.latitude!, longitude: body.longitude! },
          { latitude: entry.latitude, longitude: entry.longitude },
        ) > 0.3)
    )
      fail('tooFar', 422);
    const { error } = await supabaseAdmin()
      .from('discovery_visits')
      .upsert(
        {
          user_id: viewer.id,
          client_key: body.key,
          entry_slug: entry.slug,
          place_name: entry.name,
          latitude: entry.latitude,
          longitude: entry.longitude,
          method: gps ? 'gps' : 'manual',
        },
        { onConflict: 'user_id,client_key', ignoreDuplicates: true },
      );
    if (error) fail('error', 503);
    return ok();
  }
  let result;
  if (body.action === 'deleteVisit')
    result = await db.from('discovery_visits').delete().eq('id', body.id).eq('user_id', viewer.id);
  if (body.action === 'readNotification')
    result = await supabaseAdmin()
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', body.id)
      .eq('user_id', viewer.id);
  if (body.action === 'family')
    result = await db.rpc('family_action', {
      p_action: body.operation,
      p_token: body.token ?? null,
      p_member: body.member ?? null,
    });
  if (body.action === 'submitPlace')
    result = await db.rpc('submit_place', {
      p_name: body.name,
      p_address: body.address,
      p_region: body.region,
      p_summary: body.summary,
      p_lat: body.latitude,
      p_lng: body.longitude,
      p_source: body.source,
    });
  if (body.action === 'trip') {
    if (body.operation === 'start' && (!body.consent || !body.name)) fail('invalidInput', 422);
    if (body.operation !== 'start' && !body.session) fail('invalidInput', 422);
    result =
      body.operation === 'delete'
        ? await db.from('travel_sessions').delete().eq('id', body.session).eq('user_id', viewer.id)
        : await db.rpc('trip_action', {
            p_action: body.operation,
            p_name: body.name || '',
            p_session: body.session ?? null,
            p_sequence: body.sequence ?? null,
            p_lat: body.latitude ?? null,
            p_lng: body.longitude ?? null,
            p_accuracy: body.accuracy ?? null,
            p_time: body.time ?? null,
          });
  }
  if (!result || result.error) {
    const message = result?.error?.message || '';
    const codes = [
      'FAMILY_FULL',
      'FAMILY_REQUIRED',
      'INVITE_INVALID',
      'FAMILY_ALREADY_JOINED',
      'FAMILY_EXPIRED',
      'RATE_LIMIT',
      'GPS_JUMP',
      'INVALID_POINT',
      'TRIP_FINISHED',
    ];
    fail(codes.find((code) => message.includes(code)) || 'error', 400);
  }
  if (body.action === 'submitPlace' && pushReady()) {
    const admins = await supabaseAdmin()
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(10);
    await Promise.allSettled(
      (admins.data || []).map((admin) =>
        sendUserPush(
          admin.user_id,
          'Địa điểm mới chờ duyệt',
          body.name,
          '/vi/admin/dashboard?tab=moderation',
        ),
      ),
    );
  }
  return ok(result.data ?? { success: true });
});
