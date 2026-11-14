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
import { siteUrl } from '@/lib/env';
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'THÁM VĂN — Sổ tay Thực địa Di sản Sài Gòn', template: '%s · THÁM VĂN' },
  description:
    'Khám phá di sản, kiến trúc và ký ức TP. Hồ Chí Minh qua hình ảnh, bản đồ và những lộ trình tự đi có nguồn đối chiếu.',
  icons: { icon: '/images/logo.png', apple: '/icons/pwa-192.png' },
  appleWebApp: { capable: true, title: 'THÁM VĂN', statusBarStyle: 'default' },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: '/',
    siteName: 'THÁM VĂN',
    title: 'THÁM VĂN — Sổ tay Thực địa Di sản Sài Gòn',
    description:
      'Ấn phẩm & Sổ tay Thực địa Sài Gòn: khám phá kiến trúc, lưu hành trình và đóng dấu hộ chiếu văn hóa.',
    images: [
      {
        url: '/images/hcm-0051-buu-dien-trung-tam-sai-gon.jpg',
        width: 1200,
        height: 630,
        alt: 'Bưu điện Trung tâm Sài Gòn — THÁM VĂN',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'THÁM VĂN — Sổ tay Thực địa Di sản Sài Gòn',
    description:
      'Khám phá di sản, kiến trúc và những lộ trình tự đi có nguồn đối chiếu tại TP. Hồ Chí Minh.',
    images: ['/images/hcm-0051-buu-dien-trung-tam-sai-gon.jpg'],
  },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#114436' };
const EXTENSION_CLEANUP_SCRIPT = `(function(){
  window.addEventListener('unhandledrejection',function(e){
    var msg=String((e&&e.reason&&(e.reason.message||e.reason.stack||e.reason))||'');
    if(msg.indexOf('M_ID')!==-1||msg.indexOf('bis_')!==-1){
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },true);
  window.addEventListener('error',function(e){
    var msg=String((e&&(e.message||e.filename))||'');
    if(msg.indexOf('M_ID')!==-1||msg.indexOf('bis_')!==-1){
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },true);
  var rx=/^(bis_skin_checked|__processed_|data-bis|fdprocessedid$)/i;
  function cleanNode(el){
    if(!el||el.nodeType!==1||!el.attributes)return;
    for(var i=el.attributes.length-1;i>=0;i--){
      var name=el.attributes[i].name;
      if(rx.test(name))el.removeAttribute(name);
    }
  }
  function cleanTree(root){
    if(!root)return;
    cleanNode(root);
    if(root.querySelectorAll){
      var all=root.querySelectorAll('[bis_skin_checked],[bis_register],[fdprocessedid]');
      for(var i=0;i<all.length;i++)cleanNode(all[i]);
      var divs=root.getElementsByTagName('*');
      for(var j=0;j<divs.length;j++)cleanNode(divs[j]);
    }
  }
  cleanTree(document.documentElement);
  if(typeof MutationObserver!=='undefined'){
    var mo=new MutationObserver(function(records){
      for(var i=0;i<records.length;i++){
        var r=records[i];
        if(r.type==='attributes'&&r.attributeName&&rx.test(r.attributeName)){
          r.target.removeAttribute(r.attributeName);
        }else if(r.type==='childList'){
          for(var j=0;j<r.addedNodes.length;j++)cleanTree(r.addedNodes[j]);
        }
      }
    });
    mo.observe(document.documentElement,{attributes:true,childList:true,subtree:true});
    window.addEventListener('load',function(){setTimeout(function(){mo.disconnect();},4000);},{once:true});
  }
})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const lang = hdrs.get('x-locale');
  const nonce = hdrs.get('x-nonce') || undefined;
  return (
    <html
      lang={lang === 'en' ? 'en' : lang === 'zh' ? 'zh-CN' : 'vi'}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: EXTENSION_CLEANUP_SCRIPT }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
