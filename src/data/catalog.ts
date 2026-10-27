import type { Heritage, Challenge } from '@/lib/types';
import { hcmPlaces } from './hcm-places';

/** Fallback starter khi danh bạ HCM trống — chỉ điểm biểu tượng trong TP.HCM. */
const STARTER_IDS = [
  'HCM-0041', // Dinh Độc Lập
  'HCM-0025', // Nhà thờ Đức Bà
  'HCM-0049', // Chợ Bến Thành
  'HCM-0051', // Bưu điện Trung tâm
  'HCM-0040', // Địa đạo Củ Chi
  'HCM-0066', // Nhà hát Thành phố
] as const;

export const catalog: Heritage[] = STARTER_IDS.map((id) => {
  const place = hcmPlaces.find((p) => p.id === id);
  if (!place) throw new Error(`Missing HCM starter place: ${id}`);
  // The publishable fallback must satisfy the admin content contract. Research
  // photos with incomplete credits remain in the reviewed-subject library.
  if (place.image && !(place.image_author && place.image_license && place.image_source)) {
    return {
      ...place,
      image: null,
      hasImage: false,
      image_author: '',
      image_license: '',
      image_source: null,
    };
  }
  return place;
});

export const starterChallenges: Challenge[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    entry_id: 'HCM-0041',
    points: 20,
    badge: 'Sài Gòn',
    status: 'published',
    expires_at: null,
    translations: {
      vi: {
        title: 'Đọc dấu ấn Dinh Độc Lập',
        description: 'Đọc câu chuyện Dinh Độc Lập và nhận huy hiệu Sài Gòn khi trả lời đúng.',
        question: 'Kiến trúc sư nào thiết kế công trình Dinh Độc Lập hiện tại?',
        options: ['Ngô Viết Thụ', 'Nguyễn Công Trứ', 'Huỳnh Tấn Phát', 'Lê Văn Tám'],
      },
      en: {
        title: 'Read Independence Palace',
        description:
          'Read the Independence Palace story and earn the Sài Gòn badge with a correct answer.',
        question: 'Which architect designed the present Independence Palace?',
        options: ['Ngô Viết Thụ', 'Nguyễn Công Trứ', 'Huỳnh Tấn Phát', 'Lê Văn Tám'],
      },
      zh: {
        title: '读懂独立宫',
        description: '阅读独立宫故事，答对问题即可获得西贡徽章。',
        question: '现独立宫由哪位建筑师设计？',
        options: ['吴越树', '阮公著', '黄晋发', '黎文心'],
      },
    },
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    entry_id: 'HCM-0025',
    points: 20,
    badge: 'Quận 1',
    status: 'published',
    expires_at: null,
    translations: {
      vi: {
        title: 'Chuyện kể từ Nhà thờ Đức Bà',
        description: 'Đọc câu chuyện Nhà thờ Đức Bà Sài Gòn, khám phá biểu tượng kiến trúc Quận 1.',
        question: 'Nhà thờ Đức Bà Sài Gòn nằm ở khu vực nào?',
        options: ['Quận 1', 'Quận 5', 'Củ Chi', 'TP Thủ Đức'],
      },
      en: {
        title: 'Stories from Notre-Dame',
        description: 'Read the Notre-Dame Cathedral story and explore a Quận 1 landmark.',
        question: 'In which district is Saigon Notre-Dame Cathedral located?',
        options: ['District 1', 'District 5', 'Củ Chi', 'Thủ Đức City'],
      },
      zh: {
        title: '圣母大教堂的故事',
        description: '阅读西贡圣母大教堂故事，探索第一郡地标。',
        question: '西贡圣母大教堂位于哪个区域？',
        options: ['第一郡', '第五郡', '古芝', '守德市'],
      },
    },
  },
];
