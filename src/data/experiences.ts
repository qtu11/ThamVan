import type { Locale } from '@/lib/types';

export type Experience = {
  slug: string;
  title: [string, string, string];
  description: [string, string, string];
  theme: 'river' | 'heritage' | 'local';
  label: [string, string, string];
  minutes: number;
  image: string;
  stops: string[];
  scene: number;
  color: string;
};

export const experiences: Experience[] = [
  {
    slug: 'sai-gon-ben-song',
    title: ['Sài Gòn, phía bên sông', 'Saigon, by the river', '西贡，漫步河畔'],
    description: [
      'Một buổi chiều theo dấu những bến cảng, mặt tiền kiến trúc và nhịp sống bên sông.',
      'An afternoon of old port stories, architectural details and life along the river.',
      '用一个下午，探索老港口故事、建筑细节与滨江生活。',
    ],
    label: ['Đổi một góc nhìn', 'A fresh perspective', '换个角度'],
    theme: 'river',
    minutes: 90,
    image: '/images/hcm-0057-cong-vien-ben-bach-dang.jpg',
    stops: ['hcm-0066', 'hcm-vr-0062', 'hcm-0057', 'hcm-vr-0027'],
    scene: 1,
    color: '#d6eae8',
  },
  {
    slug: 'nhung-lop-ky-uc',
    title: ['Những lớp ký ức Sài Gòn', 'Layers of Saigon', '西贡的层层记忆'],
    description: [
      'Từ một tấm bưu thiếp đến một khung cửa cũ. Nhìn lại thành phố bằng những chi tiết nhỏ.',
      'From a postcard to an old window. Rediscover the city through its smallest details.',
      '从一张明信片到一扇旧窗，在细节中重新认识城市。',
    ],
    label: ['Dành cho người tò mò', 'For curious minds', '献给好奇的人'],
    theme: 'heritage',
    minutes: 150,
    image: '/images/hcm-0051-buu-dien-trung-tam-sai-gon.jpg',
    stops: ['hcm-0051', 'hcm-new-0227', 'hcm-0066', 'hcm-0049', 'hcm-0048'],
    scene: 0,
    color: '#e5dff1',
  },
  {
    slug: 'mot-ngay-cho-lon',
    title: ['Chợ Lớn, chậm một nhịp', 'A slower day in Chợ Lớn', '堤岸，慢一点'],
    description: [
      'Mái ngói, sân trong và chợ cũ. Một hành trình dành cho đôi chân thích rẽ vào câu chuyện.',
      'Tiled roofs, quiet courtyards and old markets. Follow the stories beyond the familiar.',
      '瓦屋、庭院与老市场，沿着故事走进熟悉街道之外。',
    ],
    label: ['Chạm vào bản sắc', 'Meet local character', '感受本地文化'],
    theme: 'local',
    minutes: 120,
    image: '/images/hcm-0002-chua-ba-thien-hau-hoi-quan-tue-thanh.jpg',
    stops: ['hcm-0050', 'hcm-0002', 'hcm-vr-0036'],
    scene: 2,
    color: '#f4e3d9',
  },
];

export function experienceText(value: [string, string, string], locale: Locale) {
  return value[locale === 'en' ? 1 : locale === 'zh' ? 2 : 0];
}
export const findExperience = (slug: string) => experiences.find((item) => item.slug === slug);
export const products = {
  walk: { amount: 69000, title: 'THAM VAN Story Walk', routes: 1 },
  collection: { amount: 149000, title: 'THAM VAN Saigon Collection', routes: 3 },
} as const;
export type ProductId = keyof typeof products;
