'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, LocateFixed } from 'lucide-react';
import { api } from '@/components/ui';
import { copy } from '@/lib/locale-copy';
import { workspaceError } from '@/lib/workspace-errors';
import type { Locale } from '@/lib/types';
import { uuid } from '@/lib/uuid';


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
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          throw new Error('geolocationUnavailable');
        }
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
      await api('/api/workspace', { action: 'visit', slug, key: uuid(), ...location });
      setMessage(
        useGps
          ? copy(
              locale,
              'Đã lưu check-in theo vị trí GPS thực địa.',
              'GPS field check-in recorded.',
              '已按实地 GPS 位置完成打卡记录。',
            )
          : copy(
              locale,
              'Đã lưu lượt ghé do bạn tự đánh dấu vào sổ hành trình.',
              'Self-marked visit recorded in your field journal.',
              '已将本次自行标记的到访记录保存至旅程档案。',
            ),
      );
      router.refresh();
    } catch (error) {
      setMessage(workspaceError(error instanceof Error ? error.message : 'error', locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="visit-card">
      <strong className="visit-card-title">
        {copy(
          locale,
          'Bạn đã ghé địa điểm này?',
          'Have you visited this place?',
          '你去过这个地点吗？',
        )}
      </strong>
      <div className="visit-actions-row">
        <button type="button" className="button secondary" disabled={busy} onClick={() => record(false)}>
          <CheckCircle2 size={16} />
          {copy(locale, 'Đánh dấu đã ghé', 'Mark as visited', '标记为已到访')}
        </button>
        {gps && (
          <button type="button" className="button secondary" disabled={busy} onClick={() => record(true)}>
            <LocateFixed size={16} />
            {copy(locale, 'Check-in GPS', 'GPS check-in', 'GPS 实地打卡')}
          </button>
        )}
      </div>
      <p className="help-text">
        {copy(
          locale,
          'Tự đánh dấu không xác nhận vị trí. Check-in GPS cần ở trong bán kính 300 m; chỉ lưu địa điểm, không lưu tọa độ thiết bị vào lượt ghé.',
          'Self-marking does not verify your location. GPS check-in requires being within 300 m and records only the place, never your device coordinates.',
          '自行标记不校验实时位置；GPS 实地打卡需位于 300 米范围内，系统仅记录到访地点，不保存设备坐标。',
        )}
      </p>
      {message && (
        <p className="visit-status" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
