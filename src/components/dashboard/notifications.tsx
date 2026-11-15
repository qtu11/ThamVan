'use client';
import { useState } from 'react';
import { Bell, BellOff, MapPin, Send, Smartphone } from 'lucide-react';
import { NEARBY_ALERTS_KEY, useNearbyAlertsOn } from '@/components/nearby-alerts';
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
  const nearby = useNearbyAlertsOn();
  async function toggleNearby() {
    setMessage('');
    setError(false);
    if (nearby) {
      localStorage.removeItem(NEARBY_ALERTS_KEY);
    } else {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !navigator.geolocation) {
        setError(true);
        setMessage(
          c(
            'Trình duyệt chưa hỗ trợ. Trên iPhone, thêm website vào Màn hình chính rồi mở từ biểu tượng.',
            'Not supported here. On iPhone, add the site to your Home Screen and open it from the icon.',
            '当前浏览器不支持。在 iPhone 上请先添加到主屏幕并从图标打开。',
          ),
        );
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError(true);
        setMessage(
          c(
            'Chưa được cấp quyền thông báo.',
            'Notification permission was not granted.',
            '尚未授予通知权限。',
          ),
        );
        return;
      }
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      localStorage.setItem(NEARBY_ALERTS_KEY, 'on');
      setMessage(
        c(
          'Đã bật. Khi bạn đến gần một địa điểm di sản trong 3 km, thông báo sẽ hiện trên màn hình khóa (khi app đang mở hoặc chạy nền).',
          'On. When you come within 3 km of a heritage place, an alert shows on your lock screen (while the app is open or in the background).',
          '已开启。当您接近 3 公里内的文化遗产时，将在锁屏上提示（应用打开或在后台时）。',
        ),
      );
    }
    window.dispatchEvent(new Event('tv-nearby-alerts'));
  }
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
          c(
            'Thiết bị chưa hỗ trợ Web Push. Trên iPhone, thêm website vào Màn hình chính rồi mở lại từ biểu tượng.',
            'This browser does not support Web Push. On iPhone, add the site to your Home Screen first.',
            '当前浏览器不支持 Web Push。在 iPhone 上请先添加到主屏幕并从图标打开。',
          ),
        );
      if (!ready || !signedIn)
        throw new Error(
          c(
            'Cần đăng nhập và cấu hình kênh thông báo trước khi kết nối.',
            'Sign in and wait for notification service setup before subscribing.',
            '需先登录并等待推送通道配置完成后才可订阅。',
          ),
        );
      if (action === 'test') {
        const result = await api('/api/push', { action: 'test' });
        if (!result.sent)
          throw new Error(
            c(
              'Chưa có thiết bị nhận được yêu cầu gửi. Hãy bật thông báo rồi thử lại.',
              'No subscribed device accepted the test push. Enable notifications and try again.',
              '尚无设备接收测试推送，请先开启通知后再试。',
            ),
          );
        setMessage(
          c(
            `Kênh push đã chấp nhận gửi đến ${result.sent} thiết bị. Việc hiển thị phụ thuộc cài đặt hệ điều hành.`,
            `Push gateway accepted delivery to ${result.sent} device(s). Display depends on OS notification settings.`,
            `推送网关已接收发往 ${result.sent} 台设备的请求，最终展示取决于系统设置。`,
          ),
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
        setMessage(
          c(
            'Đã tắt thông báo trên thiết bị này.',
            'Notifications disabled on this device.',
            '已在此设备上停用通知。',
          ),
        );
        return;
      }
      const permission = await permissionRequest;
      if (permission !== 'granted')
        throw new Error(
          c(
            'Chưa được cấp quyền thông báo. Bạn có thể thay đổi quyền trong cài đặt trình duyệt.',
            'Notification permission was not granted. You can update permission in browser settings.',
            '尚未授予通知权限，您可在浏览器设置中调整。',
          ),
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
      setMessage(
        c(
          'Đã kết nối thông báo cho thiết bị này.',
          'Notifications connected for this device.',
          '已为此设备绑定通知推送。',
        ),
      );
    } catch (error) {
      setError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : c(
              'Không kết nối được thông báo.',
              'Unable to connect notifications.',
              '无法连接推送通知。',
            ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="dash-panel">
      <div className="dash-panel-heading">
        <div>
          <small>{c('THÔNG BÁO TRÌNH DUYỆT', 'WEB PUSH', '网页推送通知')}</small>
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
        <button className={`button ${nearby ? 'quiet' : 'secondary'}`} onClick={toggleNearby}>
          <MapPin size={15} />
          {nearby
            ? c('Tắt báo địa điểm gần (3 km)', 'Stop nearby alerts (3 km)', '关闭附近提醒（3 公里）')
            : c('Báo địa điểm gần tôi (3 km)', 'Alert me to places within 3 km', '提醒我 3 公里内的地点')}
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
