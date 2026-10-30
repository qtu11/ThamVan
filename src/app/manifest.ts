import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'THÁM VĂN — Khám phá văn hóa',
    short_name: 'THÁM VĂN',
    description: 'Khám phá Sài Gòn, lưu hành trình và nhận thông báo.',
    start_url: '/vi/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#f9fbfa',
    theme_color: '#173f37',
    icons: [
      { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
