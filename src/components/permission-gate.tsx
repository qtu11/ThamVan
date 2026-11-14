'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Camera, FileText, Images, MapPin, ShieldCheck } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { copy } from '@/lib/locale-copy';
import { consentItems, type ConsentItem } from '@/lib/device-consent';

/**
 * Shown once per device, before the camera opens. Every box must be ticked to continue;
 * the browser's own permission prompts follow right after.
 */
export function PermissionGate({
  locale,
  onAccept,
}: {
  locale: Locale;
  onAccept: (choice: Record<ConsentItem, boolean>) => void;
}) {
  const [choice, setChoice] = useState<Record<ConsentItem, boolean>>({
    location: false,
    terms: false,
    camera: false,
    photos: false,
  });
  const all = consentItems.every((item) => choice[item]);
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const items: { id: ConsentItem; Icon: typeof MapPin; title: string; body: React.ReactNode }[] = [
    {
      id: 'location',
      Icon: MapPin,
      title: c('Lấy vị trí của thiết bị', 'Use this device’s location', '获取本设备的位置'),
      body: c(
        'Để AI biết bạn đang đứng ở đâu và trả lời vật trong ảnh dùng để làm gì tại nơi đó, đồng thời hiển thị bạn trên bản đồ. Giao diện không hiện tọa độ hay địa chỉ IP.',
        'So the AI knows where you are standing and can say what the thing in your photo is for at that spot, and so the map can show you. Coordinates and IP addresses are never displayed.',
        '让 AI 知道你所在的位置，说明照片中的物体在此处的用途，并在地图上显示你。界面不会显示坐标或 IP 地址。',
      ),
    },
    {
      id: 'terms',
      Icon: FileText,
      title: c(
        'Đồng ý Chính sách quyền riêng tư và Điều khoản sử dụng',
        'Agree to the Privacy Policy and Terms of Use',
        '同意隐私政策与使用条款',
      ),
      body: (
        <>
          {c(
            'Ảnh bạn chụp hoặc chọn được gửi tới dịch vụ AI để phân tích và không được đăng công khai. Đọc ',
            'Photos you take or pick are sent to the AI service for analysis and are never published. Read the ',
            '你拍摄或选择的图片会发送给 AI 服务进行分析，不会公开发布。请阅读',
          )}
          <Link href={`/${locale}/privacy`} target="_blank" rel="noopener">
            {c('Chính sách quyền riêng tư', 'Privacy Policy', '隐私政策')}
          </Link>
          {c(' và ', ' and ', '和')}
          <Link href={`/${locale}/terms`} target="_blank" rel="noopener">
            {c('Điều khoản sử dụng', 'Terms of Use', '使用条款')}
          </Link>
          .
        </>
      ),
    },
    {
      id: 'camera',
      Icon: Camera,
      title: c('Quyền camera', 'Camera access', '相机权限'),
      body: c(
        'Camera chỉ bật khi bạn mở màn hình chụp và tắt ngay khi bạn rời đi.',
        'The camera runs only while the capture screen is open and stops when you leave.',
        '相机仅在拍摄界面打开时运行，离开后立即关闭。',
      ),
    },
    {
      id: 'photos',
      Icon: Images,
      title: c(
        'Liên kết thư mục hình ảnh của thiết bị',
        'Link this device’s photo library',
        '关联本设备的相册',
      ),
      body: c(
        'Để chọn ảnh có sẵn thay vì chụp mới. Ứng dụng chỉ nhận đúng tấm ảnh bạn chọn.',
        'So you can pick an existing photo instead of taking a new one. The app only receives the photo you choose.',
        '可选择已有照片而无需重新拍摄。应用只会收到你选中的那一张。',
      ),
    },
  ];
  return (
    <div className="lens-gate" role="dialog" aria-modal="true" aria-labelledby="lens-gate-title">
      <form
        className="lens-gate-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (all) onAccept(choice);
        }}
      >
        <p className="lens-gate-eyebrow">
          <ShieldCheck size={15} /> THÁM VĂN LENS
        </p>
        <h2 id="lens-gate-title">
          {c('Bật quyền trước khi chụp', 'Turn on access before you shoot', '拍摄前请开启权限')}
        </h2>
        <p className="lens-gate-lead">
          {c(
            'Chỉ hỏi một lần cho thiết bị này. Sau khi bạn tiếp tục, trình duyệt sẽ xin quyền vị trí và camera.',
            'Asked once for this device. After you continue, the browser will request location and camera access.',
            '此设备只询问一次。继续后，浏览器会请求位置和相机权限。',
          )}
        </p>
        <label className="lens-gate-all">
          <input
            type="checkbox"
            checked={all}
            onChange={(event) =>
              setChoice({
                location: event.target.checked,
                terms: event.target.checked,
                camera: event.target.checked,
                photos: event.target.checked,
              })
            }
          />
          <span>{c('Chọn tất cả', 'Select all', '全选')}</span>
        </label>
        <ul className="lens-gate-list">
          {items.map(({ id, Icon, title, body }) => (
            <li key={id}>
              <input
                id={`lens-consent-${id}`}
                type="checkbox"
                checked={choice[id]}
                aria-describedby={`lens-consent-${id}-note`}
                onChange={(event) =>
                  setChoice((current) => ({ ...current, [id]: event.target.checked }))
                }
              />
              <div>
                <label htmlFor={`lens-consent-${id}`}>
                  <Icon size={16} aria-hidden="true" />
                  {title}
                </label>
                <p id={`lens-consent-${id}-note`}>{body}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="lens-gate-actions">
          <Link className="lens-gate-later" href={`/${locale}`}>
            {c('Để sau', 'Not now', '稍后')}
          </Link>
          <button type="submit" className="lens-gate-continue" disabled={!all}>
            {c('Tiếp tục & mở camera', 'Continue & open camera', '继续并打开相机')}
          </button>
        </div>
        {!all && (
          <p className="lens-gate-hint" role="status">
            {c(
              'Hãy tích đủ 4 mục để tiếp tục.',
              'Tick all four items to continue.',
              '请勾选全部 4 项后继续。',
            )}
          </p>
        )}
      </form>
    </div>
  );
}
