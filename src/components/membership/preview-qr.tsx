import { copy } from '@/lib/locale-copy';
import './preview-qr.css';
import type { Locale } from '@/lib/types';

const SIZE = 29;

/** Small deterministic PRNG so the pattern is stable between server and client renders. */
function noise(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
}

/** Modules covered by a finder pattern (only two corners: real QR codes need all three). */
const inFinder = (x: number, y: number) =>
  (x < 8 && y < 8) || (x >= SIZE - 8 && y < 8);

export function previewQrModules(seed: string) {
  const random = noise(seed);
  const cells: [number, number][] = [];
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) if (!inFinder(x, y) && random() < 0.5) cells.push([x, y]);
  return cells;
}

/**
 * A QR-looking illustration for checkout preview. It is deliberately not a QR code: there is no
 * bottom-left finder pattern, no format/timing information and no encoded data, so no scanner
 * can decode it, and it carries a visible "preview" stamp.
 */
export function PreviewQr({ seed, locale, label }: { seed: string; locale: Locale; label: string }) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} rx={1.6} fill="currentColor" />
      <rect x={x + 1} y={y + 1} width={5} height={5} rx={1.1} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.8} fill="currentColor" />
    </g>
  );
  return (
    <figure className="preview-qr" aria-label={label}>
      <div className="preview-qr-frame">
        <svg viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`} role="img" aria-hidden="true">
          <rect x={-2} y={-2} width={SIZE + 4} height={SIZE + 4} fill="#fff" />
          {previewQrModules(seed).map(([x, y]) => (
            <rect key={`${x}:${y}`} x={x + 0.12} y={y + 0.12} width={0.76} height={0.76} rx={0.3} fill="currentColor" />
          ))}
          {finder(0, 0)}
          {finder(SIZE - 7, 0)}
        </svg>
        <span className="preview-qr-stamp">{c('XEM TRƯỚC', 'PREVIEW', '预览')}</span>
      </div>
      <figcaption>
        <strong>{label}</strong>
        <small>
          {c(
            'Mã minh họa, không quét được. Cổng thanh toán chưa được quản trị viên bật nên chưa thu tiền.',
            'Illustration only, it cannot be scanned. Payments have not been enabled by an admin, so nothing is charged.',
            '仅为示意图，无法扫描。管理员尚未开启付款，不会产生任何扣款。',
          )}
        </small>
      </figcaption>
    </figure>
  );
}
