import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Category theme palette definitions
const THEMES = {
  education: {
    bg1: '#07162c',
    bg2: '#0e2b54',
    accent: '#38bdf8',
    pillBg: 'rgba(56, 189, 248, 0.18)',
    pillBorder: '#38bdf8',
    pillText: '#7dd3fc',
    icon: 'M12 3L1 9l11 6 9-4.91V17h2V9L12 3z M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z',
    label: 'GIÁO DỤC & ĐÀO TẠO',
  },
  finance: {
    bg1: '#141416',
    bg2: '#28231d',
    accent: '#fbbf24',
    pillBg: 'rgba(251, 191, 36, 0.18)',
    pillBorder: '#fbbf24',
    pillText: '#fde68a',
    icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm1 14.93V18h-2v-1.07A4.002 4.002 0 018 13h2a2 2 0 002 2c1.1 0 2-.9 2-2s-.9-2-2-2a4 4 0 01-4-4c0-1.85 1.28-3.41 3-3.86V4h2v1.07A4.002 4.002 0 0116 9h-2a2 2 0 00-2-2c-1.1 0-2 .9-2 2s.9 2 2 2a4 4 0 014 4c0 1.85-1.28 3.41-3 3.93z',
    label: 'TÀI CHÍNH & NGÂN HÀNG',
  },
  health: {
    bg1: '#041f1e',
    bg2: '#0a3b38',
    accent: '#34d399',
    pillBg: 'rgba(52, 211, 153, 0.18)',
    pillBorder: '#34d399',
    pillText: '#a7f3d0',
    icon: 'M19 10.5h-4.5V6h-5v4.5H5v5h4.5V20h5v-4.5H19v-5z',
    label: 'Y TẾ & SỨC KHỎE',
  },
  food: {
    bg1: '#1f0d14',
    bg2: '#3d1424',
    accent: '#f43f5e',
    pillBg: 'rgba(244, 63, 94, 0.18)',
    pillBorder: '#f43f5e',
    pillText: '#fecdd3',
    icon: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z',
    label: 'ẨM THỰC & NHÀ HÀNG',
  },
  cafe: {
    bg1: '#1a110d',
    bg2: '#382218',
    accent: '#fb923c',
    pillBg: 'rgba(251, 146, 60, 0.18)',
    pillBorder: '#fb923c',
    pillText: '#fed7aa',
    icon: 'M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z',
    label: 'CÀ PHÊ & KHÔNG GIAN',
  },
  residence: {
    bg1: '#0b132b',
    bg2: '#1c2541',
    accent: '#60a5fa',
    pillBg: 'rgba(96, 165, 250, 0.18)',
    pillBorder: '#60a5fa',
    pillText: '#bfdbfe',
    icon: 'M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z',
    label: 'ĐÔ THỊ & CĂN HỘ',
  },
  spa: {
    bg1: '#0a1d1c',
    bg2: '#163835',
    accent: '#2dd4bf',
    pillBg: 'rgba(45, 212, 191, 0.18)',
    pillBorder: '#2dd4bf',
    pillText: '#99f6e4',
    icon: 'M12 2C6.5 2 2 6.5 2 12c0 3.5 1.8 6.6 4.5 8.4V22h11v-1.6c2.7-1.8 4.5-4.9 4.5-8.4 0-5.5-4.5-10-10-10zm0 14c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z',
    label: 'SPA & THƯ GIÃN',
  },
  default: {
    bg1: '#0f172a',
    bg2: '#1e293b',
    accent: '#94a3b8',
    pillBg: 'rgba(148, 163, 184, 0.18)',
    pillBorder: '#94a3b8',
    pillText: '#cbd5e1',
    icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z',
    label: 'ĐỊA ĐIỂM SÀI GÒN',
  },
};

export function getThemeForCategory(cat) {
  if (!cat) return THEMES.default;
  const c = cat.toLowerCase();
  if (
    c.includes('giáo dục') ||
    c.includes('tiểu học') ||
    c.includes('thpt') ||
    c.includes('đại học')
  )
    return THEMES.education;
  if (c.includes('ngân hàng') || c.includes('tài chính')) return THEMES.finance;
  if (c.includes('bệnh viện') || c.includes('y tế')) return THEMES.health;
  if (
    c.includes('nhà hàng') ||
    c.includes('ẩm thực') ||
    c.includes('quán ăn') ||
    c.includes('bar') ||
    c.includes('beer')
  )
    return THEMES.food;
  if (c.includes('cà phê') || c.includes('cafe')) return THEMES.cafe;
  if (
    c.includes('căn hộ') ||
    c.includes('khu đô thị') ||
    c.includes('cao ốc') ||
    c.includes('resort') ||
    c.includes('khách sạn')
  )
    return THEMES.residence;
  if (c.includes('spa') || c.includes('massage') || c.includes('thư giãn')) return THEMES.spa;
  return THEMES.default;
}

export function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function wrapText(text, maxCharsPerLine = 34) {
  const words = String(text || '')
    .trim()
    .split(/\s+/);
  const lines = [];
  let current = '';

  for (const w of words) {
    if ((current + ' ' + w).trim().length <= maxCharsPerLine) {
      current = (current + ' ' + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function createLocationCardSvg(place) {
  const theme = getThemeForCategory(place.category);
  const lines = wrapText(place.name, 32);
  const titleFontSize = lines.length > 2 ? 46 : 52;
  const titleLineHeight = titleFontSize * 1.25;

  const titleStartYSvg = 380 - ((lines.length - 1) * titleLineHeight) / 2;
  const titleTspans = lines
    .map(
      (line, idx) =>
        `<tspan x="600" dy="${idx === 0 ? 0 : titleLineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join('');

  const addressClean = escapeXml(
    (place.address || 'Thành phố Hồ Chí Minh, Việt Nam').replace(/, TP\.HCM/gi, ' • TP.HCM'),
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bg1}" />
      <stop offset="60%" stop-color="${theme.bg2}" />
      <stop offset="100%" stop-color="${theme.bg1}" />
    </linearGradient>

    <!-- Radial Accent Light -->
    <radialGradient id="glowTop" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.22" />
      <stop offset="100%" stop-color="${theme.bg1}" stop-opacity="0" />
    </radialGradient>

    <!-- Linear Accent Bar -->
    <linearGradient id="accentBar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0" />
      <stop offset="30%" stop-color="${theme.accent}" stop-opacity="0.9" />
      <stop offset="70%" stop-color="${theme.accent}" stop-opacity="0.9" />
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0" />
    </linearGradient>
  </defs>

  <!-- Deep Canvas Background -->
  <rect width="1200" height="800" fill="url(#bgGrad)" />
  <rect width="1200" height="800" fill="url(#glowTop)" />

  <!-- Subtle Architectural Grid Pattern -->
  <g opacity="0.06" stroke="#ffffff" stroke-width="1">
    ${Array.from({ length: 15 }, (_, i) => `<line x1="${(i + 1) * 80}" y1="0" x2="${(i + 1) * 80}" y2="800" />`).join('')}
    ${Array.from({ length: 9 }, (_, i) => `<line x1="0" y1="${(i + 1) * 80}" x2="1200" y2="${(i + 1) * 80}" />`).join('')}
  </g>

  <!-- Concentric Architectural Rings -->
  <g opacity="0.08" stroke="${theme.accent}" stroke-width="1.5" fill="none">
    <circle cx="600" cy="380" r="160" stroke-dasharray="8 6" />
    <circle cx="600" cy="380" r="280" stroke-dasharray="12 10" />
    <circle cx="600" cy="380" r="390" />
  </g>

  <!-- Luxury Outer Border Frame -->
  <rect x="40" y="40" width="1120" height="720" rx="24" fill="none" stroke="rgba(255, 255, 255, 0.12)" stroke-width="2" />
  <rect x="52" y="52" width="1096" height="696" rx="16" fill="none" stroke="${theme.accent}" stroke-width="1" opacity="0.35" />

  <!-- Corner Brackets -->
  <path d="M70 100 L70 70 L100 70" stroke="${theme.accent}" stroke-width="3" fill="none" />
  <path d="M1130 100 L1130 70 L1100 70" stroke="${theme.accent}" stroke-width="3" fill="none" />
  <path d="M70 700 L70 730 L100 730" stroke="${theme.accent}" stroke-width="3" fill="none" />
  <path d="M1130 700 L1130 730 L1100 730" stroke="${theme.accent}" stroke-width="3" fill="none" />

  <!-- TOP BAR: Category Pill (Left) & Place ID (Right) -->
  <g transform="translate(80, 80)">
    <!-- Category Pill Badge -->
    <rect x="0" y="0" width="310" height="46" rx="23" fill="${theme.pillBg}" stroke="${theme.pillBorder}" stroke-width="1.5" />
    <g transform="translate(18, 11) scale(1)">
      <path d="${theme.icon}" fill="${theme.accent}" />
    </g>
    <text x="54" y="29" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="700" fill="${theme.pillText}" letter-spacing="1.5">
      ${escapeXml(place.category ? place.category.toUpperCase() : theme.label)}
    </text>

    <!-- Location ID Badge -->
    <rect x="910" y="0" width="130" height="46" rx="23" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1.5" />
    <text x="975" y="29" font-family="'Consolas', 'Courier New', monospace" font-size="18" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="1">
      ${escapeXml(place.id)}
    </text>
  </g>

  <!-- CENTER AREA: Place Name -->
  <g>
    <text x="600" y="${titleStartYSvg}" font-family="'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="${titleFontSize}" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="-0.5">
      ${titleTspans}
    </text>
  </g>

  <!-- Glowing Accent Divider -->
  <rect x="360" y="475" width="480" height="3" rx="1.5" fill="url(#accentBar)" />

  <!-- Address Line with Map Pin Icon -->
  <g transform="translate(600, 530)">
    <!-- Map Pin Icon -->
    <g transform="translate(-18, -22) scale(1.1)">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${theme.accent}" />
    </g>
    <text x="14" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="500" fill="#cbd5e1" text-anchor="middle">
      ${addressClean}
    </text>
  </g>

  <!-- BOTTOM BAR: City & Brand Signature -->
  <g transform="translate(80, 695)">
    <text x="0" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="rgba(255, 255, 255, 0.55)" letter-spacing="2">
      THÁM VĂN • MẪU THẺ ĐỒ HỌA, KHÔNG PHẢI ẢNH ĐỊA ĐIỂM
    </text>
    <text x="1040" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="${theme.accent}" opacity="0.85" text-anchor="end" letter-spacing="1.5">
      BẢN ĐỒ KHÁM PHÁ &amp; DI SẢN
    </text>
  </g>
</svg>`;
}

async function testSample() {
  const sample = {
    id: 'HCM-0012',
    name: 'Đền Sri Mariamman',
    category: 'Tín ngưỡng - đền Hindu',
    address: '45 Trương Định, Bến Thành, Quận 1, TP.HCM',
  };
  const svg = createLocationCardSvg(sample);
  const outDir = new URL('../asset/design-samples/', import.meta.url);
  await mkdir(outDir, { recursive: true });
  const outPath = fileURLToPath(new URL('sample-card-mariamman.jpg', outDir));
  await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(outPath);
  console.log('Saved test card to', outPath);
}

if (process.argv[1].endsWith('generate-sample-card.mjs')) {
  testSample();
}
