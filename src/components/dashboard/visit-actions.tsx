'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, LocateFixed } from 'lucide-react';
import { api } from '@/components/ui';
import { workspaceError } from '@/lib/workspace-errors';
import type { Locale } from '@/lib/types';
export function VisitActions({
  slug,
  locale,
  signedIn,
  gps,
}: {
  slug: string;
  locale: Locale;
  signedIn: boolean;
  gps: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const router = useRouter();
  async function record(useGps: boolean) {
    if (!signedIn) {
      router.push(`/${locale}/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      let location = {};
      if (useGps) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 15000,
          }),
        );
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
      }
      await api('/api/workspace', { action: 'visit', slug, key: crypto.randomUUID(), ...location });
      setMessage(
        useGps ? 'Đã lưu check-in theo vị trí cung cấp.' : 'Đã lưu lượt ghé do bạn tự đánh dấu.',
      );
      router.refresh();
    } catch (error) {
      setMessage(workspaceError(error instanceof Error ? error.message : 'error', locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      style={{
        margin: '25px 0',
        padding: 20,
        border: '1px solid #dfe7dc',
        borderRadius: 14,
        background: '#f5f8f1',
      }}
    >
      <strong style={{ fontSize: 14 }}>Bạn đã ghé địa điểm này?</strong>
      <div
        className="dash-actions"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 15 }}
      >
        <button className="button secondary" disabled={busy} onClick={() => record(false)}>
          <CheckCircle2 size={16} />
          Đánh dấu đã ghé
        </button>
        {gps && (
          <button className="button secondary" disabled={busy} onClick={() => record(true)}>
            <LocateFixed size={16} />
            Check-in GPS
          </button>
        )}
      </div>
      <p className="help-text">
        Tự đánh dấu không xác nhận vị trí. Check-in GPS cần ở trong bán kính 300 m; chỉ lưu địa
        điểm, không lưu tọa độ hiện tại của thiết bị vào lượt ghé.
      </p>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
