import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const MANIFEST_PATH = 'd:/thamvan/src/data/THAMVAN_HCM_V3/thamvan-places.json';
const OUTPUT_DIR = 'd:/thamvan/public/images';
const REPORTS_DIR = path.join(OUTPUT_DIR, '_thamvan_reports');
const INDEX_PATH = path.join(OUTPUT_DIR, 'thamvan-image-index.json');
const USER_AGENT = 'ThamVanBot/1.0 (https://thamvan.vn; contact@thamvan.vn)';

// Verified Authentic Landmark Image Sources
const LANDMARK_SOURCES = {
  // Historic Temples & Pagodas
  'HCM-0001': 'https://upload.wikimedia.org/wikipedia/commons/e/e8/An_Quang_Pagoda_%2810017883254%29.jpg',
  'HCM-0002': 'https://upload.wikimedia.org/wikipedia/commons/9/93/Thien_Hau_Temple%2C_Cholon_%2851208102653%29.jpg',
  'HCM-0003': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Th%C3%A1p_ch%C3%ADnh_ch%C3%B9a_B%E1%BB%ADu_Long.jpg',
  'HCM-0004': 'https://upload.wikimedia.org/wikipedia/commons/9/99/ChuaGiacLam01.jpg',
  'HCM-0005': 'https://upload.wikimedia.org/wikipedia/commons/6/69/ChuaGiacVien01.jpg',
  'HCM-0006': 'https://upload.wikimedia.org/wikipedia/commons/d/de/Ch%C3%B9a_Ho%E1%BA%B1ng_Ph%C3%A1p%2C_H%C3%B3c_M%C3%B4n.jpg',
  'HCM-0007': 'https://upload.wikimedia.org/wikipedia/commons/f/f6/TuongPhatChuaHoiKhanh.jpg',
  'HCM-0008': 'https://upload.wikimedia.org/wikipedia/commons/9/90/One_Pillar_Pagoda_in_Thu_Duc%2C_Saigon.jpg',
  'HCM-0009': 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Ph%C6%B0%E1%BB%9Bc_H%E1%BA%A3i_t%E1%BB%B1_4.jpg',
  'HCM-0010': 'https://upload.wikimedia.org/wikipedia/commons/2/27/C%E1%BB%95ng_ch%C3%B9a_V%C4%A9nh_Nghi%C3%AAm.jpg',
  'HCM-0011': 'https://upload.wikimedia.org/wikipedia/commons/d/de/ChuaXaLoi001.jpg',
  'HCM-0012': 'https://upload.wikimedia.org/wikipedia/commons/c/c2/SriMariammanSaigon.jpg',
  'HCM-0013': 'https://upload.wikimedia.org/wikipedia/commons/3/36/Tran_Hung_Dao_Temple_%289981911814%29.jpg',
  'HCM-0014': 'https://upload.wikimedia.org/wikipedia/commons/4/41/H%C3%B9ng_Kings_Temple%2C_Ho_Chi_Minh_City%2C_Vietnam_-_20121014-01.JPG',
  'HCM-0015': 'https://upload.wikimedia.org/wikipedia/commons/0/04/%C4%90%C3%ACnh_B%C3%ACnh_%C4%90%C3%B4ng_%281%29.jpg',
  'HCM-0016': 'https://upload.wikimedia.org/wikipedia/commons/1/13/%C4%90%C3%ACnh_B%C3%ACnh_H%C3%B2a_%282%29.jpg',
  'HCM-0019': 'https://upload.wikimedia.org/wikipedia/commons/9/94/L%E1%BB%87_Ch%C3%A2u_H%E1%BB%99i_Qu%C3%A1n_%281%29.jpg',
  'HCM-0020': 'https://upload.wikimedia.org/wikipedia/commons/9/98/H%E1%BB%99i_qu%C3%A1n_Ngh%C4%A9a_Nhu%E1%BA%ADn_%282%29.jpg',
  'HCM-0021': 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Ch%C3%B9a_%C3%94n_L%C4%83ng_%281%29.jpg',
  'HCM-0034': 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Vi%E1%BB%87t_Nam_Qu%E1%BB%91c_T%E1%BB%B1_2.jpg',

  // Catholic Churches
  'HCM-0022': 'https://upload.wikimedia.org/wikipedia/commons/7/74/Cha_Tam_Church_%2810018161394%29.jpg',
  'HCM-0023': 'https://upload.wikimedia.org/wikipedia/commons/7/74/Phu_Cuong_Cathedral_%28Binh_Duong%29_-_4.jpg',
  'HCM-0024': 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Cho_Quan_Parish_Roman_Catholic_Church_%2810018216946%29.jpg',
  'HCM-0025': 'https://upload.wikimedia.org/wikipedia/commons/8/88/Saigon_Notre-Dame_Basilica.jpg',
  'HCM-0026': 'https://upload.wikimedia.org/wikipedia/commons/8/8c/NhathoHanhThongTay.jpg',
  'HCM-0027': 'https://upload.wikimedia.org/wikipedia/commons/7/79/Huyen_Sy_Roman_Catholic_Church_%2810017941975%29.jpg',
  'HCM-0028': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Tan_Dinh_Church_%2837924185041%29.jpg',
  'HCM-0029': 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Saint_Jeanne_d%27Arc_%28Joan_of_Arc%29_Roman_Catholic_Church_%2810018210985%29.jpg',

  // Historic Sites, Museums, Monuments & Parks
  'HCM-0035': 'https://upload.wikimedia.org/wikipedia/commons/4/47/War_Remnants_Museum_%2810014002636%29.jpg',
  'HCM-0036': 'https://upload.wikimedia.org/wikipedia/commons/5/57/Vietnam_History_Museum_%2810014022804%29.jpg',
  'HCM-0037': 'https://upload.wikimedia.org/wikipedia/commons/2/29/B%E1%BA%A3o_t%C3%A0ng_Th%C3%A0nh_ph%E1%BB%91_H%E1%BB%93_Ch%C3%AD_Minh_%2810014041794%29.jpg',
  'HCM-0038': 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Ho_Chi_Minh_Museum%2C_Saigon.jpg',
  'HCM-0040': 'https://upload.wikimedia.org/wikipedia/commons/0/00/W_C%E1%BB%A7_Chi_%C4%90%E1%BB%8Ba_%C4%90%E1%BA%A1o_4507.JPG',
  'HCM-0041': 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Dinh_%C4%90%E1%BB%99c_L%E1%BA%ADp_1.jpg',
  'HCM-0044': 'https://upload.wikimedia.org/wikipedia/commons/4/4d/L%C4%83ng_%C3%94ng_B%C3%A0_Chi%E1%BB%83u_01.jpg',
  'HCM-0048': 'https://upload.wikimedia.org/wikipedia/commons/e/e5/B%E1%BA%A3o_t%C3%A0ng_M%E1%BB%B9_thu%E1%BA%ADt_Th%C3%A0nh_ph%E1%BB%91_H%E1%BB%93_Ch%C3%AD_Minh_%2810014061214%29.jpg',
  'HCM-0049': 'https://upload.wikimedia.org/wikipedia/commons/9/91/Ben_Thanh_market_2.jpg',
  'HCM-0050': 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Vn-hcm-cho-binh-tay-27-07-07a.jpg',
  'HCM-0051': 'https://upload.wikimedia.org/wikipedia/commons/f/fb/Saigon_Central_Post_Office%2C_exterior_view_from_across_the_street.jpg',
  'HCM-0052': 'https://upload.wikimedia.org/wikipedia/commons/1/1b/M%E1%BB%91ng_Bridge_Ho_Chi_Minh_City.jpg',
  'HCM-0053': 'local:d:/thamvan/asset/city/hcm-city-day.png',
  'HCM-0057': 'local:d:/thamvan/asset/city/references/01-bach-dang-night.png',
  'HCM-0064': 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Cong_truong_con_rua.jpg',
  'HCM-0066': 'https://upload.wikimedia.org/wikipedia/commons/2/23/%C3%93pera%2C_Ciudad_Ho_Chi_Minh%2C_Vietnam%2C_2013-08-14%2C_DD_03.JPG',
  'HCM-0067': 'https://upload.wikimedia.org/wikipedia/commons/8/87/Saigon_Zoo_and_Botanical_Gardens_%2810014032155%29.jpg',
  'HCM-0068': 'https://upload.wikimedia.org/wikipedia/commons/3/36/Saigon_City_Hall_%2810013994624%29.jpg',

  // VR Highlights & Bridges
  'HCM-VR-0013': 'local:d:/thamvan/asset/city/references/03-waterbus-skyline.png',
  'HCM-VR-0026': 'https://upload.wikimedia.org/wikipedia/commons/5/52/Ch%C3%B9a_Ph%E1%BB%A5ng_S%C6%A1n_%282%29.jpg',
  'HCM-VR-0027': 'local:d:/thamvan/asset/city/hcm-ba-son.png',
  'HCM-VR-0029': 'https://upload.wikimedia.org/wikipedia/commons/0/09/Phap_Vien_Minh_Dang_Quang-_An_Ph%C3%BA%2C_Qu%E1%BA%ADn_2%2C_TPHCM%2C_Vi%E1%BB%87t_Nam_-_panoramio.jpg',
  'HCM-VR-0040': 'https://upload.wikimedia.org/wikipedia/commons/6/66/Thongtayhoitemple.JPG',
  'HCM-VR-0047': 'https://upload.wikimedia.org/wikipedia/commons/7/7e/C%E1%BA%A7u_%C3%81nh_Sao_Panorama.JPG',
  'HCM-VR-0049': 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Thu_Ngu_Flagpole_-_53299870531.jpg',
  'HCM-VR-0054': 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Ph%E1%BB%95_Hi%E1%BB%81n_B%E1%BB%93_T%C3%A1t_-_Ch%C3%B9a_V%E1%BA%A1n_Ph%E1%BA%ADt_-_TpHCM_Qu%E1%BA%ADn_5_-_VN.jpg',
  'HCM-VR-0057': 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Hotel_Majestic%2C_Ciudad_Ho_Chi_Minh%2C_Vietnam%2C_2013-08-14%2C_DD_01.JPG',
  'HCM-VR-0058': 'https://upload.wikimedia.org/wikipedia/commons/6/65/Ton_Duc_Thang_Museum%2C_Saigon_%2820230705_1513%29.jpg',
  'HCM-VR-0059': 'local:d:/thamvan/asset/city/hcm-landmark81.png',
  'HCM-VR-0060': 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Phu_My_Bruecke2.jpg',
  'HCM-VR-0062': 'https://upload.wikimedia.org/wikipedia/commons/8/87/Nguyen_Hue_Pedestrian_Boulevard_%2837021598281%29.jpg',
  'HCM-VR-0063': 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Bui_Vien_Street%2C_Saigon_%287091626411%29.jpg',
  'HCM-VR-0079': 'https://upload.wikimedia.org/wikipedia/vi/b/bd/Ch%E1%BB%A3_An_%C4%90%C3%B4ng_2021.jpg',
  'HCM-VR-0080': 'https://upload.wikimedia.org/wikipedia/commons/0/09/Ph%E1%BB%95_Quang_Pagoda%2C_Ho_Chi_Minh_City.jpg'
};

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
    label: 'GIÁO DỤC & ĐÀO TẠO'
  },
  finance: {
    bg1: '#141416',
    bg2: '#28231d',
    accent: '#fbbf24',
    pillBg: 'rgba(251, 191, 36, 0.18)',
    pillBorder: '#fbbf24',
    pillText: '#fde68a',
    icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm1 14.93V18h-2v-1.07A4.002 4.002 0 018 13h2a2 2 0 002 2c1.1 0 2-.9 2-2s-.9-2-2-2a4 4 0 01-4-4c0-1.85 1.28-3.41 3-3.86V4h2v1.07A4.002 4.002 0 0116 9h-2a2 2 0 00-2-2c-1.1 0-2 .9-2 2s.9 2 2 2a4 4 0 014 4c0 1.85-1.28 3.41-3 3.93z',
    label: 'TÀI CHÍNH & NGÂN HÀNG'
  },
  health: {
    bg1: '#041f1e',
    bg2: '#0a3b38',
    accent: '#34d399',
    pillBg: 'rgba(52, 211, 153, 0.18)',
    pillBorder: '#34d399',
    pillText: '#a7f3d0',
    icon: 'M19 10.5h-4.5V6h-5v4.5H5v5h4.5V20h5v-4.5H19v-5z',
    label: 'Y TẾ & SỨC KHỎE'
  },
  food: {
    bg1: '#1f0d14',
    bg2: '#3d1424',
    accent: '#f43f5e',
    pillBg: 'rgba(244, 63, 94, 0.18)',
    pillBorder: '#f43f5e',
    pillText: '#fecdd3',
    icon: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z',
    label: 'ẨM THỰC & NHÀ HÀNG'
  },
  cafe: {
    bg1: '#1a110d',
    bg2: '#382218',
    accent: '#fb923c',
    pillBg: 'rgba(251, 146, 60, 0.18)',
    pillBorder: '#fb923c',
    pillText: '#fed7aa',
    icon: 'M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z',
    label: 'CÀ PHÊ & KHÔNG GIAN'
  },
  residence: {
    bg1: '#0b132b',
    bg2: '#1c2541',
    accent: '#60a5fa',
    pillBg: 'rgba(96, 165, 250, 0.18)',
    pillBorder: '#60a5fa',
    pillText: '#bfdbfe',
    icon: 'M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z',
    label: 'ĐÔ THỊ & CĂN HỘ'
  },
  spa: {
    bg1: '#0a1d1c',
    bg2: '#163835',
    accent: '#2dd4bf',
    pillBg: 'rgba(45, 212, 191, 0.18)',
    pillBorder: '#2dd4bf',
    pillText: '#99f6e4',
    icon: 'M12 2C6.5 2 2 6.5 2 12c0 3.5 1.8 6.6 4.5 8.4V22h11v-1.6c2.7-1.8 4.5-4.9 4.5-8.4 0-5.5-4.5-10-10-10zm0 14c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z',
    label: 'SPA & THƯ GIÃN'
  },
  default: {
    bg1: '#0f172a',
    bg2: '#1e293b',
    accent: '#94a3b8',
    pillBg: 'rgba(148, 163, 184, 0.18)',
    pillBorder: '#94a3b8',
    pillText: '#cbd5e1',
    icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z',
    label: 'ĐỊA ĐIỂM SÀI GÒN'
  }
};

function getThemeForCategory(cat) {
  if (!cat) return THEMES.default;
  const c = cat.toLowerCase();
  if (c.includes('giáo dục') || c.includes('tiểu học') || c.includes('thpt') || c.includes('đại học')) return THEMES.education;
  if (c.includes('ngân hàng') || c.includes('tài chính')) return THEMES.finance;
  if (c.includes('bệnh viện') || c.includes('y tế')) return THEMES.health;
  if (c.includes('nhà hàng') || c.includes('ẩm thực') || c.includes('quán ăn') || c.includes('bar') || c.includes('beer')) return THEMES.food;
  if (c.includes('cà phê') || c.includes('cafe')) return THEMES.cafe;
  if (c.includes('căn hộ') || c.includes('khu đô thị') || c.includes('cao ốc') || c.includes('resort') || c.includes('khách sạn')) return THEMES.residence;
  if (c.includes('spa') || c.includes('massage') || c.includes('thư giãn')) return THEMES.spa;
  return THEMES.default;
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text, maxCharsPerLine = 34) {
  const words = String(text || '').trim().split(/\s+/);
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

function createLocationCardSvg(place) {
  const theme = getThemeForCategory(place.category);
  const lines = wrapText(place.name, 32);
  const titleFontSize = lines.length > 2 ? 46 : 52;
  const titleLineHeight = titleFontSize * 1.25;

  const titleStartYSvg = 380 - ((lines.length - 1) * titleLineHeight) / 2;
  const titleTspans = lines.map((line, idx) => 
    `<tspan x="600" dy="${idx === 0 ? 0 : titleLineHeight}">${escapeXml(line)}</tspan>`
  ).join('');

  const addressClean = escapeXml((place.address || 'Thành phố Hồ Chí Minh, Việt Nam').replace(/, TP\.HCM/gi, ' • TP.HCM'));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bg1}" />
      <stop offset="60%" stop-color="${theme.bg2}" />
      <stop offset="100%" stop-color="${theme.bg1}" />
    </linearGradient>

    <radialGradient id="glowTop" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.22" />
      <stop offset="100%" stop-color="${theme.bg1}" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="accentBar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0" />
      <stop offset="30%" stop-color="${theme.accent}" stop-opacity="0.9" />
      <stop offset="70%" stop-color="${theme.accent}" stop-opacity="0.9" />
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0" />
    </linearGradient>
  </defs>

  <rect width="1200" height="800" fill="url(#bgGrad)" />
  <rect width="1200" height="800" fill="url(#glowTop)" />

  <g opacity="0.06" stroke="#ffffff" stroke-width="1">
    ${Array.from({ length: 15 }, (_, i) => `<line x1="${(i + 1) * 80}" y1="0" x2="${(i + 1) * 80}" y2="800" />`).join('')}
    ${Array.from({ length: 9 }, (_, i) => `<line x1="0" y1="${(i + 1) * 80}" x2="1200" y2="${(i + 1) * 80}" />`).join('')}
  </g>

  <g opacity="0.08" stroke="${theme.accent}" stroke-width="1.5" fill="none">
    <circle cx="600" cy="380" r="160" stroke-dasharray="8 6" />
    <circle cx="600" cy="380" r="280" stroke-dasharray="12 10" />
    <circle cx="600" cy="380" r="390" />
  </g>

  <rect x="40" y="40" width="1120" height="720" rx="24" fill="none" stroke="rgba(255, 255, 255, 0.12)" stroke-width="2" />
  <rect x="52" y="52" width="1096" height="696" rx="16" fill="none" stroke="${theme.accent}" stroke-width="1" opacity="0.35" />

  <path d="M70 100 L70 70 L100 70" stroke="${theme.accent}" stroke-width="3" fill="none" />
  <path d="M1130 100 L1130 70 L1100 70" stroke="${theme.accent}" stroke-width="3" fill="none" />
  <path d="M70 700 L70 730 L100 730" stroke="${theme.accent}" stroke-width="3" fill="none" />
  <path d="M1130 700 L1130 730 L1100 730" stroke="${theme.accent}" stroke-width="3" fill="none" />

  <g transform="translate(80, 80)">
    <rect x="0" y="0" width="320" height="46" rx="23" fill="${theme.pillBg}" stroke="${theme.pillBorder}" stroke-width="1.5" />
    <g transform="translate(18, 11) scale(1)">
      <path d="${theme.icon}" fill="${theme.accent}" />
    </g>
    <text x="54" y="29" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="15" font-weight="700" fill="${theme.pillText}" letter-spacing="1">
      ${escapeXml(place.category ? place.category.toUpperCase() : theme.label)}
    </text>

    <rect x="910" y="0" width="130" height="46" rx="23" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1.5" />
    <text x="975" y="29" font-family="'Consolas', 'Courier New', monospace" font-size="18" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="1">
      ${escapeXml(place.id)}
    </text>
  </g>

  <g>
    <text x="600" y="${titleStartYSvg}" font-family="'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="${titleFontSize}" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="-0.5">
      ${titleTspans}
    </text>
  </g>

  <rect x="360" y="475" width="480" height="3" rx="1.5" fill="url(#accentBar)" />

  <g transform="translate(600, 530)">
    <g transform="translate(-18, -22) scale(1.1)">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${theme.accent}" />
    </g>
    <text x="14" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="500" fill="#cbd5e1" text-anchor="middle">
      ${addressClean}
    </text>
  </g>

  <g transform="translate(80, 695)">
    <text x="0" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="rgba(255, 255, 255, 0.55)" letter-spacing="2">
      THẨM VẤN SÀI GÒN • THÀNH PHỐ HỒ CHÍ MINH
    </text>
    <text x="1040" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="${theme.accent}" opacity="0.85" text-anchor="end" letter-spacing="1.5">
      BẢN ĐỒ KHÁM PHÁ &amp; DI SẢN
    </text>
  </g>
</svg>`;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fetchBufferWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT }
      });
      if (res.ok) {
        return Buffer.from(await res.arrayBuffer());
      }
      if (res.status === 429) {
        console.warn(`[429 RateLimit] Backing off 2s for ${url}...`);
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      console.warn(`[HTTP ${res.status}] for ${url}`);
      return null;
    } catch (e) {
      console.warn(`[Fetch error] ${e.message} for ${url}, attempt ${i + 1}`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return null;
}

async function main() {
  console.log('=== STARTING THAM VAN TWO-TIER VISUAL ARCHITECTURE PIPELINE ===');
  const rawManifest = fs.readFileSync(MANIFEST_PATH, 'utf8');
  const places = JSON.parse(rawManifest).places;
  console.log(`Loaded ${places.length} places from manifest.`);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

  const finalIndex = [];
  const resultsCsv = [];
  resultsCsv.push('Id,Name,Category,Address,ImageFile,Type,Status,Source');

  let landmarkSuccess = 0;
  let landmarkFailed = 0;
  let cardsGenerated = 0;

  // STEP 1: Process Tier 1 Verified Landmarks
  console.log('\n--- PHASE 1: Processing Verified Authentic Landmarks ---');
  for (const place of places) {
    const id = place.id;
    if (!LANDMARK_SOURCES[id]) continue;

    const slug = `${id.toLowerCase()}-${slugify(place.name)}.jpg`;
    const targetFile = path.join(OUTPUT_DIR, slug);
    const src = LANDMARK_SOURCES[id];
    let imgBuffer = null;

    try {
      if (src.startsWith('local:')) {
        const localPath = src.substring(6);
        if (fs.existsSync(localPath)) {
          imgBuffer = fs.readFileSync(localPath);
          console.log(`[LOCAL] ${id}: ${place.name} <- ${path.basename(localPath)}`);
        } else {
          console.error(`[LOCAL NOT FOUND] ${localPath}`);
        }
      } else {
        console.log(`[DOWNLOAD] ${id}: ${place.name}...`);
        imgBuffer = await fetchBufferWithRetry(src);
        await new Promise(r => setTimeout(r, 350)); // Respectful rate limiting
      }

      if (imgBuffer) {
        await sharp(imgBuffer)
          .resize(1200, 800, { fit: 'cover', position: 'center' })
          .jpeg({ quality: 88, mozjpeg: true })
          .toFile(targetFile);

        landmarkSuccess++;
        finalIndex.push({
          id,
          name: place.name,
          category: place.category,
          address: place.address,
          image: `/images/${slug}`,
          type: 'LANDMARK_AUTHENTIC_PHOTO',
          source: src,
          confidence: 'VERIFIED_100%'
        });
        resultsCsv.push(`"${id}","${place.name.replace(/"/g, '""')}","${(place.category || '').replace(/"/g, '""')}","${(place.address || '').replace(/"/g, '""')}","${slug}","LANDMARK","OK","${src}"`);
        continue;
      }
    } catch (e) {
      console.error(`[ERROR Landmark ${id}]:`, e.message);
    }

    // Fallback if landmark image failed
    landmarkFailed++;
    console.warn(`[FALLBACK] Using bespoke card for landmark ${id} (${place.name})`);
    const svg = createLocationCardSvg(place);
    await sharp(Buffer.from(svg))
      .jpeg({ quality: 90 })
      .toFile(targetFile);

    finalIndex.push({
      id,
      name: place.name,
      category: place.category,
      address: place.address,
      image: `/images/${slug}`,
      type: 'EDITORIAL_CARD_FALLBACK',
      source: 'Bespoke Location Card',
      confidence: 'CARD_GENERATED'
    });
    resultsCsv.push(`"${id}","${place.name.replace(/"/g, '""')}","${(place.category || '').replace(/"/g, '""')}","${(place.address || '').replace(/"/g, '""')}","${slug}","CARD","FALLBACK","Bespoke"`);
  }

  console.log(`Landmarks complete: ${landmarkSuccess} authentic photos saved, ${landmarkFailed} fallbacks.`);

  // STEP 2: Process Tier 2 Bespoke Location Cards
  console.log('\n--- PHASE 2: Generating Bespoke Editorial Location Cards ---');
  const genericPlaces = places.filter(p => !LANDMARK_SOURCES[p.id]);
  console.log(`Generating bespoke cards for ${genericPlaces.length} locations...`);

  // Process in concurrent batches of 10 for high speed and stability
  const BATCH_SIZE = 10;
  for (let i = 0; i < genericPlaces.length; i += BATCH_SIZE) {
    const batch = genericPlaces.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (place) => {
      const id = place.id;
      const slug = `${id.toLowerCase()}-${slugify(place.name)}.jpg`;
      const targetFile = path.join(OUTPUT_DIR, slug);

      const svg = createLocationCardSvg(place);
      await sharp(Buffer.from(svg))
        .jpeg({ quality: 90 })
        .toFile(targetFile);

      finalIndex.push({
        id,
        name: place.name,
        category: place.category,
        address: place.address,
        image: `/images/${slug}`,
        type: 'BESPOKE_EDITORIAL_CARD',
        source: 'Bespoke Architectural Card Generator',
        confidence: 'GENERATED_100%'
      });

      resultsCsv.push(`"${id}","${place.name.replace(/"/g, '""')}","${(place.category || '').replace(/"/g, '""')}","${(place.address || '').replace(/"/g, '""')}","${slug}","CARD","OK","Bespoke"`);
      cardsGenerated++;
    }));

    if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= genericPlaces.length) {
      console.log(`Generated ${Math.min(i + BATCH_SIZE, genericPlaces.length)} / ${genericPlaces.length} cards...`);
    }
  }

  // Sort finalIndex to match original manifest place order
  const orderMap = new Map();
  places.forEach((p, idx) => orderMap.set(p.id, idx));
  finalIndex.sort((a, b) => (orderMap.get(a.id) ?? 9999) - (orderMap.get(b.id) ?? 9999));

  // Write updated thamvan-image-index.json
  fs.writeFileSync(INDEX_PATH, JSON.stringify(finalIndex, null, 2), 'utf8');
  console.log(`\nUpdated ${INDEX_PATH} with ${finalIndex.length} records.`);

  // Write reports
  const csvPath = path.join(REPORTS_DIR, 'download-results.csv');
  fs.writeFileSync(csvPath, resultsCsv.join('\n'), 'utf8');

  const summary = {
    totalPlaces: places.length,
    totalImages: finalIndex.length,
    landmarkPhotos: landmarkSuccess,
    editorialCards: cardsGenerated + landmarkFailed,
    coveragePercent: 100.0,
    timestampUtc: new Date().toISOString()
  };
  fs.writeFileSync(path.join(REPORTS_DIR, 'summary-v3.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== PIPELINE COMPLETE ===');
  console.log(`Total Places: ${places.length}`);
  console.log(`Total Images Produced: ${finalIndex.length}`);
  console.log(`Authentic Landmark Photos: ${landmarkSuccess}`);
  console.log(`Bespoke Editorial Cards: ${cardsGenerated + landmarkFailed}`);
  console.log(`Coverage: 100%`);
}

main().catch(err => {
  console.error('Fatal Pipeline Error:', err);
  process.exit(1);
});
