'use client';
import { useSyncExternalStore, useState } from 'react';
import { ArrowDownToLine, Check, Compass, MapPin, Plus } from 'lucide-react';
import { copy } from '@/lib/locale-copy';
import type { Locale } from '@/lib/types';

const names = ['Bạch Đằng', 'Ba Son', 'Chợ Lớn'];
const subscribe = (callback: () => void) => {
  window.addEventListener('storage', callback);
  window.addEventListener('tv-passport', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('tv-passport', callback);
  };
};
function snapshot() {
  try {
    return localStorage.getItem('tv-cultural-passport') || '[]';
  } catch {
    return '[]';
  }
}
export function PassportPreview({ locale }: { locale: Locale }) {
  const stored = useSyncExternalStore(subscribe, snapshot, () => '[]');
  const [error, setError] = useState(false);
  let stamps: string[] = [];
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed))
      stamps = parsed.filter(
        (value): value is string => typeof value === 'string' && names.includes(value),
      );
  } catch {
    /* Use an empty passport for invalid storage. */
  }
  function toggle(name: string) {
    try {
      localStorage.setItem(
        'tv-cultural-passport',
        JSON.stringify(
          stamps.includes(name) ? stamps.filter((item) => item !== name) : [...stamps, name],
        ),
      );
      window.dispatchEvent(new Event('tv-passport'));
      setError(false);
    } catch {
      setError(true);
    }
  }
  function download() {
    const text = `THÁM VĂN — ${copy(locale, 'Hộ chiếu khám phá', 'Cultural passport', '文化护照')}\n${copy(locale, 'Dấu tự đánh dấu, không xác minh vị trí.', 'Self-marked stamps, not location verified.', '手动印章，未经位置验证。')}\n\n${stamps.length ? stamps.map((item) => `✓ ${item}`).join('\n') : '—'}`;
    const url = URL.createObjectURL(
      new Blob(['\ufeff', text], { type: 'text/plain;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tham-van-passport.txt';
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="passport-stage">
      <span className="passport-orbit orbit-one" aria-hidden="true" />
      <span className="passport-orbit orbit-two" aria-hidden="true" />
      <div className="passport-card">
        <div className="passport-top">
          <Compass size={25} />
          <span>
            THÁM VĂN<small>CULTURAL PASSPORT</small>
          </span>
          <span className="passport-flower" aria-hidden="true">
            ✳
          </span>
        </div>
        <div className="passport-title">
          <span>SAIGON EDITION</span>
          <h3>
            {copy(
              locale,
              'Đi để thấy. Chạm để nhớ.',
              'Walk. Discover. Remember.',
              '漫步，发现，铭记。',
            )}
          </h3>
          <p>
            {copy(
              locale,
              'Mỗi dấu, một lần bạn bước ra ngoài.',
              'Every stamp, a moment out in the city.',
              '每个印章，都是一次城市探索。',
            )}
          </p>
        </div>
        <div className="passport-stamps">
          {names.map((name, index) => (
            <button
              key={name}
              className={stamps.includes(name) ? 'stamped' : ''}
              aria-pressed={stamps.includes(name)}
              onClick={() => toggle(name)}
              aria-label={`${copy(locale, 'Đánh dấu', 'Mark', '标记')} ${name}`}
            >
              <span>
                {stamps.includes(name) ? (
                  <Check size={25} />
                ) : index === 0 ? (
                  <MapPin size={25} />
                ) : (
                  <Plus size={25} />
                )}
              </span>
              <strong>{name}</strong>
              <small>
                {stamps.includes(name)
                  ? copy(locale, 'ĐÃ ĐÁNH DẤU', 'STAMPED', '已标记')
                  : copy(locale, 'THÊM DẤU', 'ADD STAMP', '添加印章')}
              </small>
            </button>
          ))}
        </div>
        <div className="passport-bottom">
          <span>
            {stamps.length.toString().padStart(2, '0')} / 03{' '}
            {copy(locale, 'DẤU CỦA BẠN', 'YOUR STAMPS', '你的印章')}
          </span>
          <button
            onClick={download}
            aria-label={copy(locale, 'Tải hộ chiếu', 'Download passport', '下载护照')}
          >
            <ArrowDownToLine size={17} />
          </button>
        </div>
      </div>
      <p className="passport-note" role="status">
        {error
          ? copy(
              locale,
              'Trình duyệt chưa cho phép lưu. Hãy bật bộ nhớ trang rồi thử lại.',
              'Browser storage is unavailable. Enable site storage and try again.',
              '浏览器存储不可用，请启用后重试。',
            )
          : copy(
              locale,
              'Thử chạm vào một dấu · Lưu trên trình duyệt này',
              'Try a stamp · Saved in this browser',
              '点击试试 · 保存在此浏览器中',
            )}
      </p>
    </div>
  );
}
