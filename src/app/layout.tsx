import type { Metadata, Viewport } from 'next';
import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/latin-500.css';
import '@fontsource/be-vietnam-pro/vietnamese-500.css';
import '@fontsource/be-vietnam-pro/latin-600.css';
import '@fontsource/be-vietnam-pro/vietnamese-600.css';
import '@fontsource/be-vietnam-pro/latin-700.css';
import '@fontsource/be-vietnam-pro/vietnamese-700.css';
import '@fontsource/lora/latin-500.css';
import '@fontsource/lora/vietnamese-500.css';
import '@fontsource/lora/latin-600.css';
import '@fontsource/lora/vietnamese-600.css';
import './globals.css';
import './startup.css';
import { headers } from 'next/headers';
export const metadata: Metadata = {
  title: { default: 'THÁM VĂN — Chạm để hiểu di sản Sài Gòn', template: '%s · THÁM VĂN' },
  description:
    'Khám phá di sản, văn hóa và những câu chuyện TP. Hồ Chí Minh qua hình ảnh, bản đồ và hành trình của riêng bạn.',
  icons: { icon: '/images/logo.png', apple: '/icons/pwa-192.png' },
  appleWebApp: { capable: true, title: 'THÁM VĂN', statusBarStyle: 'default' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0B4538' };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = (await headers()).get('x-locale');
  return (
    <html
      lang={lang === 'en' ? 'en' : lang === 'zh' ? 'zh-CN' : 'vi'}
      data-scroll-behavior="smooth"
    >
      <body>{children}</body>
    </html>
  );
}
