import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'THÁM VĂN — Sổ tay Di sản Sài Gòn',
    short_name: 'THÁM VĂN',
    description:
      'Ấn phẩm & Sổ tay Thực địa Sài Gòn: khám phá kiến trúc, lưu hành trình và đóng dấu hộ chiếu văn hóa.',
    start_url: '/vi',
    scope: '/',
    display: 'standalone',
    background_color: '#f6efe1',
    theme_color: '#114436',
    icons: [
      { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
