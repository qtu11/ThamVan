'use client';
import { useState } from 'react';
import { Bell, BellOff, Send, Smartphone } from 'lucide-react';
import { api } from '@/components/ui';
import { copy } from '@/lib/locale-copy';
import type { Locale } from '@/lib/types';
export function PushSettings({
  locale,
  ready,
  signedIn,
}: {
  locale: Locale;
  ready: boolean;
  signedIn: boolean;
}) {
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  async function run(action: 'enable' | 'disable' | 'test') {
    setBusy(true);
    setMessage('');
    setError(false);
    try {
      if (
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      )
        throw new Error(
          'Thiết bị chưa hỗ trợ Web Push. Trên iPhone, thêm website vào Màn hình chính rồi mở lại từ biểu tượng.',
        );
      if (!ready || !signedIn)
        throw new Error('Cần đăng nhập và cấu hình kênh thông báo trước khi kết nối.');
      if (action === 'test') {
        const result = await api('/api/push', { action: 'test' });
        if (!result.sent)
          throw new Error('Chưa có thiết bị nhận được yêu cầu gửi. Hãy bật thông báo rồi thử lại.');
        setMessage(
          `Kênh push đã chấp nhận gửi đến ${result.sent} thiết bị. Việc hiển thị phụ thuộc cài đặt hệ điều hành.`,
        );
        return;
      }
      // Ask from the click's user activation, before service-worker network work.
      const permissionRequest = action === 'enable' ? Notification.requestPermission() : null;
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (action === 'disable') {
        if (existing) {
          await api('/api/push', { action: 'unsubscribe', endpoint: existing.endpoint });
          await existing.unsubscribe();
        }
        setMessage('Đã tắt thông báo trên thiết bị này.');
        return;
      }
      const permission = await permissionRequest;
      if (permission !== 'granted')
        throw new Error(
          'Chưa được cấp quyền thông báo. Bạn có thể thay đổi quyền trong cài đặt trình duyệt.',
        );
      const raw = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const decoded = atob(
        (raw + '='.repeat((4 - (raw.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'),
      );
      const key = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        }));
      const json = subscription.toJSON();
      await api('/api/push', {
        action: 'subscribe',
        endpoint: subscription.endpoint,
        keys: json.keys,
      });
      setMessage('Đã kết nối thông báo cho thiết bị này.');
    } catch (error) {
      setError(true);
      setMessage(error instanceof Error ? error.message : 'Không kết nối được thông báo.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="dash-panel">
      <div className="dash-panel-heading">
        <div>
          <small>WEB PUSH</small>
          <h2>{c('Thông báo đến điện thoại', 'Notifications on your phone', '手机通知')}</h2>
        </div>
        <Smartphone size={25} />
      </div>
      <p>
        {c(
          'Nhận phản hồi đề xuất địa điểm và cập nhật hành trình. Chỉ gửi khi bạn chủ động đồng ý.',
          'Receive place-review feedback and travel updates after you opt in.',
          '主动开启后接收地点审核和行程更新。',
        )}
      </p>
      <div className="dash-notice">
        {c(
          'iPhone/iPad: thêm website vào Màn hình chính, mở từ biểu tượng rồi bật thông báo. Android: dùng trình duyệt hỗ trợ và cho phép thông báo. Không thể bảo đảm luôn hiện trên màn hình khóa.',
          'On iPhone/iPad, add the site to your Home Screen and open it there before enabling notifications. Android requires a supported browser and permission. Lock-screen display is controlled by the device.',
          'iPhone/iPad请先添加到主屏幕并从图标打开。Android需要兼容浏览器及权限，锁屏显示由设备决定。',
        )}
      </div>
      {!ready && (
        <p className="help-text">
          {c(
            'Kênh Web Push chưa được cấu hình trên website.',
            'Web Push is not configured on this website.',
            '网站尚未配置Web Push。',
          )}
        </p>
      )}
      <div className="dash-actions">
        <button
          className="button"
          disabled={busy || !ready || !signedIn}
          onClick={() => run('enable')}
        >
          <Bell size={16} />
          {c('Bật thông báo', 'Enable notifications', '开启通知')}
        </button>
        <button
          className="button secondary"
          disabled={busy || !ready || !signedIn}
          onClick={() => run('test')}
        >
          <Send size={15} />
          {c('Gửi thử đến tôi', 'Send me a test', '发送测试')}
        </button>
        <button
          className="button quiet"
          disabled={busy || !ready || !signedIn}
          onClick={() => run('disable')}
        >
          <BellOff size={15} />
          {c('Tắt thiết bị này', 'Disable this device', '停用此设备')}
        </button>
      </div>
      {message && (
        <p className={`status ${error ? 'danger' : 'success'}`} role={error ? 'alert' : 'status'}>
          {message}
        </p>
      )}
    </section>
  );
}
