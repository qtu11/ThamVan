import type { Heritage } from '@/lib/types';
import rawPlaces from './hcm-places.json' with { type: 'json' };

export type HcmPlace = Heritage & {
  category: string;
  categoryGroup: string;
  address: string;
  aliases: string[];
  hasGps: boolean;
  hasImage: boolean;
  history: string;
  referenceUrl: string;
};

/** Vùng ngoài ranh giới hành chính TP.HCM — loại khỏi danh bạ runtime. */
const OUTSIDE_HCM_REGIONS = new Set(['Bình Dương', 'Vũng Tàu', 'Côn Đảo', 'Hồ Tràm']);

export const hcmPlaces: HcmPlace[] = (rawPlaces as unknown as HcmPlace[]).filter(
  (p) => !OUTSIDE_HCM_REGIONS.has(p.region)
);

export function getHcmPlaces(): HcmPlace[] {
  return hcmPlaces;
}

export function getHcmPlaceBySlug(slug: string): HcmPlace | undefined {
  const s = slug.toLowerCase();
  return hcmPlaces.find((p) => p.slug === s || p.id.toLowerCase() === s);
}

export const hcmCategoryGroups = [
  'Tất cả',
  'Tín ngưỡng & Tâm linh',
  'Di sản & Bảo tàng',
  'Giáo dục & Trường học',
  'Y tế & Bệnh viện',
  'Ẩm thực & Nhà hàng',
  'Cà phê & Check-in',
  'Bar, Pub & Rooftop',
  'Mua sắm & Thương mại',
  'Đô thị & Cao ốc',
  'Cảnh quan & Thiên nhiên',
  'Khách sạn & Nghỉ dưỡng',
  'Spa & Chăm sóc sức khỏe',
  'Ngân hàng & Tài chính',
  'Điểm đến & Tiện ích khác',
] as const;
