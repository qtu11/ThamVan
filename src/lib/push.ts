import 'server-only';
import webpush from 'web-push';
import { supabaseAdmin } from './supabase/server';
export const pushReady = () =>
  Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT,
  );
export function allowedPushEndpoint(raw: string) {
  try {
    const url = new URL(raw);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === '443') &&
      (url.hostname === 'fcm.googleapis.com' ||
        url.hostname === 'updates.push.services.mozilla.com' ||
        url.hostname === 'web.push.apple.com' ||
        url.hostname.endsWith('.notify.windows.com'))
    );
  } catch {
    return false;
  }
}
export async function sendUserPush(userId: string, title: string, body: string, url: string) {
  if (!pushReady()) return { sent: 0, failed: 0 };
  const db = supabaseAdmin();
  const result = await db
    .from('push_subscriptions')
    .select('id,endpoint,keys')
    .eq('user_id', userId)
    .limit(5);
  if (result.error) return { sent: 0, failed: 1 };
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  let sent = 0,
    failed = 0;
  await Promise.allSettled(
    result.data.map(async (subscription) => {
      if (!allowedPushEndpoint(subscription.endpoint)) {
        failed++;
        return;
      }
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: subscription.keys },
          JSON.stringify({ title, body, url }),
          { TTL: 3600, timeout: 8000 },
        );
        sent++;
      } catch (error) {
        failed++;
        const status = error instanceof webpush.WebPushError ? error.statusCode : 0;
        if (status === 404 || status === 410)
          await db
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id)
            .eq('user_id', userId);
      }
    }),
  );
  return { sent, failed };
}
