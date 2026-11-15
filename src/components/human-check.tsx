'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, RotateCw, X, ChevronsRight, Loader2 } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { copy } from '@/lib/locale-copy';
import { api } from './ui';

/* ------------------------------------------------------------------
   Puzzle geometry (SVG user units). Canvas 300 x 170.
   Piece: 36x36 square with a top tab and a right tab (bbox ~41x41).
   ------------------------------------------------------------------ */
const W = 300;
const H = 170;
const START_X = 8;
const RANGE = 250; // piece x travels START_X .. START_X + RANGE
const PIECE = 'M0,6 H13 A5,5 0 1,1 23,6 H36 V17 A5,5 0 1,1 36,27 V42 H0 Z';

type Challenge = { challenge: string; template: number; x: number; y: number };
type Phase = 'idle' | 'loading' | 'puzzle' | 'verifying' | 'success' | 'failed';

/* ---------------------------- 5 templates ---------------------------- */
function SceneSunset({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b1e54" />
          <stop offset="0.55" stopColor="#d9644a" />
          <stop offset="1" stopColor="#f6c56b" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      <circle cx="205" cy="112" r="34" fill="#ffd98a" opacity="0.9" />
      <g fill="#2a1630">
        <rect x="0" y="120" width="40" height="50" />
        <rect x="38" y="98" width="22" height="72" />
        <rect x="62" y="110" width="30" height="60" />
        <path d="M100 170 V70 L112 52 L124 70 V170 Z" />
        <rect x="106" y="80" width="12" height="3" fill="#f6c56b" opacity="0.6" />
        <rect x="130" y="104" width="26" height="66" />
        <rect x="160" y="88" width="18" height="82" />
        <rect x="182" y="124" width="40" height="46" />
        <path d="M226 170 V92 H250 V78 H258 V170 Z" />
        <rect x="262" y="112" width="38" height="58" />
      </g>
      <g fill="#ffcf7a" opacity="0.75">
        {[42, 48, 54, 66, 76, 134, 142, 164, 170, 230, 240, 268, 280].map((x, i) => (
          <rect key={x} x={x} y={118 + (i % 4) * 10} width="3" height="4" />
        ))}
      </g>
      <path d="M20 40 q10 -6 20 0 q10 -6 18 2" stroke="#2a1630" fill="none" strokeWidth="1.5" />
      <path d="M240 30 q8 -5 16 0 q8 -5 14 2" stroke="#2a1630" fill="none" strokeWidth="1.5" />
    </g>
  );
}

function SceneLotus({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-pond`} cx="0.5" cy="0.4" r="0.8">
          <stop offset="0" stopColor="#5fa58c" />
          <stop offset="1" stopColor="#14463a" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-pond)`} />
      {[
        [40, 40, 26],
        [130, 130, 30],
        [250, 50, 24],
        [200, 140, 22],
        [80, 120, 18],
        [175, 60, 16],
      ].map(([cx, cy, r]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={r} fill="#2f7d4f" />
          <path d={`M${cx} ${cy} L${cx + r} ${cy - 4} L${cx + r} ${cy + 4} Z`} fill="#14463a" />
          <circle cx={cx} cy={cy} r={r * 0.6} fill="none" stroke="#4fa36a" strokeWidth="1" />
        </g>
      ))}
      {[
        [95, 70],
        [225, 100],
        [30, 140],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <ellipse rx="7" ry="16" fill="#f3a6c0" transform="rotate(-35)" />
          <ellipse rx="7" ry="16" fill="#f3a6c0" transform="rotate(35)" />
          <ellipse rx="7" ry="17" fill="#f8c8d8" />
          <circle r="4" cy="4" fill="#f6d36b" />
        </g>
      ))}
      <path d="M0 95 q40 -8 80 0 t80 0 t80 0 t80 0" stroke="#9fd4c0" fill="none" opacity="0.35" />
    </g>
  );
}

function SceneLanterns({ id }: { id: string }) {
  const colors = ['#e2483d', '#f2a33a', '#d6336c', '#f5d04c', '#e8742f', '#b8325a'];
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-night`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d1b3a" />
          <stop offset="1" stopColor="#24305e" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#ffd27a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-night)`} />
      {[12, 58, 140, 210, 280, 96, 250].map((x, i) => (
        <circle key={x} cx={x} cy={8 + (i * 13) % 30} r="1" fill="#fff" opacity="0.7" />
      ))}
      <path d="M0 18 Q75 48 150 22 T300 26" stroke="#8a7a5a" fill="none" />
      <path d="M0 74 Q75 100 150 78 T300 82" stroke="#8a7a5a" fill="none" />
      {[25, 70, 120, 175, 225, 272].map((x, i) => {
        const y = (i % 2 ? 38 : 32) + (i > 2 ? 2 : 0);
        return (
          <g key={x} transform={`translate(${x} ${y})`}>
            <circle r="24" fill={`url(#${id}-glow)`} />
            <ellipse rx="11" ry="14" fill={colors[i]} />
            <rect x="-5" y="-17" width="10" height="4" fill="#3a2a1a" />
            <rect x="-5" y="13" width="10" height="3" fill="#3a2a1a" />
            <line y1="16" y2="26" stroke={colors[i]} />
          </g>
        );
      })}
      {[45, 100, 150, 200, 255].map((x, i) => (
        <g key={x} transform={`translate(${x} ${96 + (i % 2) * 6})`}>
          <circle r="22" fill={`url(#${id}-glow)`} />
          <ellipse rx="10" ry="13" fill={colors[(i + 3) % colors.length]} />
          <rect x="-4" y="-16" width="8" height="4" fill="#3a2a1a" />
        </g>
      ))}
      <rect y="140" width={W} height="30" fill="#141c38" />
      <path d="M0 150 h300" stroke="#ffd27a" strokeOpacity="0.25" strokeDasharray="6 8" />
    </g>
  );
}

function SceneRiver({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-day`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd0ef" />
          <stop offset="1" stopColor="#e6f4f8" />
        </linearGradient>
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b98a52" />
          <stop offset="1" stopColor="#7a5530" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-day)`} />
      <circle cx="250" cy="30" r="14" fill="#fff3b0" />
      <path d="M0 78 Q50 60 90 74 T180 70 T300 72 V90 H0 Z" fill="#3f8a4a" />
      {[20, 60, 140, 210, 270].map((x) => (
        <g key={x} transform={`translate(${x} 72)`}>
          <rect x="-1.5" y="-26" width="3" height="26" fill="#6b4a2a" />
          <path d="M0 -26 q-14 2 -18 10 M0 -26 q14 2 18 10 M0 -26 q-6 -10 -16 -12 M0 -26 q6 -10 16 -12" stroke="#2f7a3a" strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      ))}
      <rect y="88" width={W} height="82" fill={`url(#${id}-water)`} />
      {[100, 116, 132, 148, 162].map((y, i) => (
        <path key={y} d={`M${-20 + i * 9} ${y} q15 -5 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0`} stroke="#e8c48c" strokeOpacity="0.45" fill="none" />
      ))}
      <g transform="translate(150 122)">
        <path d="M-40 0 H40 L30 12 H-30 Z" fill="#5a2e1a" />
        <path d="M-20 0 V-14 H18 V0" fill="#d9a441" />
        <path d="M-24 -14 Q0 -26 22 -14" fill="#8a3b22" />
      </g>
      <g transform="translate(60 150)">
        <path d="M-22 0 H22 L16 7 H-16 Z" fill="#3a1e12" />
        <path d="M-4 0 L2 -14 L8 0 Z" fill="#f2e3c0" />
      </g>
    </g>
  );
}

function SceneTiles({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <pattern id={`${id}-tile`} width="50" height="50" patternUnits="userSpaceOnUse">
          <rect width="50" height="50" fill="#f3e6cf" />
          <path d="M25 2 L48 25 L25 48 L2 25 Z" fill="#14463a" />
          <circle cx="25" cy="25" r="11" fill="#c45a3b" />
          <circle cx="25" cy="25" r="5" fill="#f3e6cf" />
          <path d="M0 0 h10 a10 10 0 0 1 -10 10 Z M50 0 v10 a10 10 0 0 1 -10 -10 Z M0 50 v-10 a10 10 0 0 1 10 10 Z M50 50 h-10 a10 10 0 0 1 10 -10 Z" fill="#d9a441" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-tile)`} />
      <rect x="0" y="0" width={W} height={H} fill="none" stroke="#14463a" strokeWidth="6" />
      <path d="M0 85 H300 M150 0 V170" stroke="#f3e6cf" strokeOpacity="0.5" strokeWidth="2" />
    </g>
  );
}

const SCENES = [SceneSunset, SceneLotus, SceneLanterns, SceneRiver, SceneTiles];
const SCENE_NAMES: [string, string, string][] = [
  ['Hoàng hôn Sài Gòn', 'Saigon sunset', '西贡黄昏'],
  ['Hồ sen', 'Lotus pond', '荷花池'],
  ['Đèn lồng đêm hội', 'Lantern night', '灯笼之夜'],
  ['Sông nước miền Tây', 'Mekong river', '湄公河'],
  ['Gạch bông', 'Cement tiles', '花砖'],
];

/* ------------------------------ Widget ------------------------------ */
export function HumanCheck({
  locale,
  onToken,
}: {
  locale: Locale;
  onToken: (token: string) => void;
}) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const uid = useId().replace(/:/g, '');
  const [phase, setPhase] = useState<Phase>('idle');
  const [data, setData] = useState<Challenge | null>(null);
  const [value, setValue] = useState(0); // 0..RANGE
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startV: number; t0: number; samples: [number, number][] } | null>(null);
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenCb = useRef(onToken);
  useEffect(() => {
    tokenCb.current = onToken;
  }, [onToken]);
  useEffect(() => () => {
    if (expiry.current) clearTimeout(expiry.current);
  }, []);

  const load = useCallback(async () => {
    setPhase('loading');
    setValue(0);
    try {
      const next: Challenge = await api('/api/captcha', { action: 'issue' });
      setData(next);
      setPhase('puzzle');
    } catch {
      setPhase('failed');
    }
  }, []);

  function start() {
    if (phase === 'idle' || phase === 'failed') void load();
  }

  function close() {
    setPhase('idle');
    setData(null);
    setValue(0);
  }

  function scale() {
    const track = trackRef.current;
    if (!track) return 1;
    const handle = 44;
    return RANGE / Math.max(1, track.clientWidth - handle);
  }

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (phase !== 'puzzle') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startV: value, t0: performance.now(), samples: [[START_X + value, 0]] };
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    const v = Math.min(RANGE, Math.max(0, d.startV + (e.clientX - d.startX) * scale()));
    setValue(v);
    if (d.samples.length < 380) d.samples.push([Math.round((START_X + v) * 10) / 10, Math.round(performance.now() - d.t0)]);
  }

  async function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d || !data || phase !== 'puzzle') return;
    d.samples.push([Math.round((START_X + value) * 10) / 10, Math.round(performance.now() - d.t0)]);
    if (value < 4) return; // just a tap
    setPhase('verifying');
    try {
      const res: { token: string } = await api('/api/captcha', {
        action: 'verify',
        challenge: data.challenge,
        x: START_X + value,
        track: d.samples,
      });
      setPhase('success');
      tokenCb.current(res.token);
      if (expiry.current) clearTimeout(expiry.current);
      expiry.current = setTimeout(() => {
        tokenCb.current('');
        close();
      }, 110_000);
    } catch {
      setPhase('failed');
      tokenCb.current('');
      setTimeout(() => void load(), 900);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape' && phase !== 'success') close();
  }

  const Scene = data ? SCENES[data.template % SCENES.length] : null;
  const pieceX = START_X + value;
  const open = phase === 'puzzle' || phase === 'verifying' || (phase === 'failed' && !!data) || phase === 'loading';
  const checked = phase === 'success';

  return (
    <div className="human-check" onKeyDown={onKey}>
      <div
        className={`human-check-box${checked ? ' is-checked' : ''}`}
        onClick={() => {
          if (!checked && phase !== 'loading' && !open) start();
        }}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          className="human-check-tick"
          onClick={(e) => {
            e.stopPropagation();
            start();
          }}
          disabled={checked || phase === 'loading'}
          aria-label={c('Tôi không phải người máy', "I'm not a robot", '我不是机器人')}
        >
          {phase === 'loading' && !data ? (
            <Loader2 size={18} className="human-check-spin" />
          ) : checked ? (
            <Check size={22} strokeWidth={3} />
          ) : null}
        </button>
        <span className="human-check-label">
          {c('Tôi không phải người máy', "I'm not a robot", '我不是机器人')}
        </span>
        <span className="human-check-brand" aria-hidden="true">
          <RotateCw size={26} />
          <small>THÁM VĂN</small>
        </span>
      </div>
      {phase === 'failed' && !data && (
        <p className="human-check-error">
          {c('Không tải được mã xác minh. Bấm vào ô trên để thử lại.', 'Could not load puzzle. Tap above to retry.', '无法加载验证拼图，请点击重试。')}
        </p>
      )}

      {open && (
        <div
          className="human-check-pop"
          role="dialog"
          aria-modal="false"
          aria-label={c('Xác minh bằng ghép hình', 'Puzzle verification', '拼图验证')}
        >
          <header>
            <div>
              <strong>{c('Kéo mảnh ghép vào chỗ trống', 'Drag the piece into the gap', '将拼图拖入缺口')}</strong>
              {data && <span>{c(...SCENE_NAMES[data.template % SCENE_NAMES.length])}</span>}
            </div>
            <div className="human-check-actions">
              <button type="button" onClick={() => void load()} aria-label={c('Đổi hình khác', 'New puzzle', '换一张')} disabled={phase === 'verifying'}>
                <RotateCw size={16} />
              </button>
              <button type="button" onClick={close} aria-label={c('Đóng', 'Close', '关闭')}>
                <X size={16} />
              </button>
            </div>
          </header>

          <div className={`human-check-stage${phase === 'failed' ? ' is-failed' : ''}`}>
            {Scene && data ? (
              <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden="true">
                <defs>
                  <g id={`${uid}-scene`}>
                    <Scene id={uid} />
                  </g>
                  <clipPath id={`${uid}-clip`}>
                    <path d={PIECE} transform={`translate(${data.x} ${data.y})`} />
                  </clipPath>
                  <filter id={`${uid}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodOpacity="0.55" />
                  </filter>
                </defs>
                <use href={`#${uid}-scene`} />
                <path
                  d={PIECE}
                  transform={`translate(${data.x} ${data.y})`}
                  fill="rgba(0,0,0,0.5)"
                  stroke="rgba(255,255,255,0.85)"
                  strokeWidth="1.2"
                />
                <g transform={`translate(${pieceX - data.x} 0)`} filter={`url(#${uid}-shadow)`}>
                  <g clipPath={`url(#${uid}-clip)`}>
                    <use href={`#${uid}-scene`} />
                  </g>
                  <path d={PIECE} transform={`translate(${data.x} ${data.y})`} fill="none" stroke="#fff" strokeWidth="1.6" />
                </g>
              </svg>
            ) : (
              <div className="human-check-placeholder">
                <Loader2 size={22} className="human-check-spin" />
              </div>
            )}
            {phase === 'failed' && (
              <p className="human-check-msg">{c('Chưa khớp, thử lại nhé', 'Not quite, try again', '未对齐，请重试')}</p>
            )}
          </div>

          <div className={`human-check-track${dragging ? ' is-dragging' : ''}`} ref={trackRef}>
            <div className="human-check-fill" style={{ width: `calc((100% - 44px) * ${value / RANGE} + 22px)` }} />
            <span className="human-check-hint">{c('Kéo sang phải', 'Slide to the right', '向右滑动')}</span>
            <button
              type="button"
              className="human-check-handle"
              style={{ left: `calc((100% - 44px) * ${value / RANGE})` }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              disabled={phase !== 'puzzle'}
              aria-label={c('Thanh kéo mảnh ghép', 'Puzzle slider', '拼图滑块')}
            >
              {phase === 'verifying' ? <Loader2 size={18} className="human-check-spin" /> : <ChevronsRight size={20} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
