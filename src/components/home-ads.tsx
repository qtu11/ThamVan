'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  HandHeart,
  Leaf,
  Palette,
  Sparkles,
} from 'lucide-react';
import type { Locale } from '@/lib/types';
import { copy } from '@/lib/locale-copy';
import { t } from '@/lib/i18n';

type AdCard = {
  id: string;
  image: string;
  badge: { vi: string; en: string; zh: string };
  category: { vi: string; en: string; zh: string };
  title: { vi: string; en: string; zh: string };
  note: { vi: string; en: string; zh: string };
  price: { vi: string; en: string; zh: string };
  href: string;
  tone: 'craft' | 'esg' | 'aroma' | 'support';
};

const adCards: AdCard[] = [
  {
    id: 'ly-su',
    image: '/images/ads/ly-su-qua-luu-niem.jpg',
    badge: { vi: 'Món quà', en: 'Gift', zh: '礼品' },
    category: { vi: 'Gốm', en: 'Ceramics', zh: '陶瓷' },
    title: { vi: 'Ly sứ in dấu THÁM VĂN', en: 'Cup with the THÁM VĂN mark', zh: '印 THÁM VĂN 标识的陶瓷杯' },
    note: {
      vi: 'Làm tay từng chiếc nên không chiếc nào giống hệt nhau.',
      en: 'Made by hand, so no two are exactly alike.',
      zh: '手工制作，每一只都不完全相同。',
    },
    price: { vi: '189.000đ', en: '189,000đ', zh: '189,000đ' },
    href: '/partners',
    tone: 'support',
  },
  {
    id: 'non-la',
    image: '/images/ads/non-la-viet-nam.jpg',
    badge: { vi: 'Thủ công', en: 'Handcrafted', zh: '手作' },
    category: { vi: 'Làng nghề', en: 'Craft village', zh: '工艺村' },
    title: { vi: 'Nón lá thêu tay', en: 'Hand-stitched conical hat', zh: '手工刺绣斗笠' },
    note: {
      vi: 'Lá cọ chọn kỹ và thêu họa tiết thủ công, gấp gọn bỏ túi khi dạo phố Sài Gòn.',
      en: 'Selected palm leaves with delicate hand embroidery, folds flat for city walks.',
      zh: '甄选棕叶配以手工刺绣，轻巧可折叠随身携带。',
    },
    price: { vi: '90.000đ', en: '90,000đ', zh: '90,000đ' },
    href: '/partners',
    tone: 'esg',
  },
  {
    id: 'magnet',
    image: '/images/ads/magnet-vietnam.jpg',
    badge: { vi: 'Lưu niệm', en: 'Keepsake', zh: '人气选品' },
    category: { vi: 'Ấn phẩm ký họa', en: 'Illustrated ware', zh: '手绘周边' },
    title: { vi: 'Nam châm ký họa Sài Gòn', en: 'Saigon landmark magnets', zh: '西贡地标冰箱贴' },
    note: {
      vi: 'Ký họa Chợ Lớn, Bưu điện Trung tâm và những mặt tiền cổ. Có giá ưu đãi theo bộ.',
      en: 'Illustrated Chợ Lớn, Central Post Office, and classic facades. Bundle pricing available.',
      zh: '手绘堤岸、中央邮局与老街建筑立面，支持套装选购。',
    },
    price: { vi: '25.000đ', en: '25,000đ', zh: '25,000đ' },
    href: '/explore',
    tone: 'craft',
  },
  {
    id: 'nuoc-hoa',
    image: '/images/ads/miss-saigon-nuoc-hoa.jpg',
    badge: { vi: 'Mỹ hương', en: 'Fragrance', zh: '香氛' },
    category: { vi: 'Nước hoa', en: 'Perfume', zh: '香水' },
    title: { vi: 'Nước hoa Miss Saigon', en: 'Miss Saigon perfume', zh: '西贡小姐香水' },
    note: {
      vi: 'Hương hoa cỏ thanh nhẹ gợi nhớ góc phố Sài Gòn buổi sáng sớm.',
      en: 'A crisp floral scent reminiscent of early morning streets in Saigon.',
      zh: '清雅花香调，唤醒清晨西贡街角的记忆。',
    },
    price: { vi: '490.000đ', en: '490,000đ', zh: '490,000đ' },
    href: '/partners',
    tone: 'aroma',
  },
];

const toneIcons = {
  craft: Palette,
  esg: Leaf,
  aroma: Sparkles,
  support: HandHeart,
};

export function HomeAds({ locale }: { locale: Locale }) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const node = track.current;
    if (!node) return;
    const maxScroll = node.scrollWidth - node.clientWidth;
    setEdge({
      start: node.scrollLeft <= 4,
      end: maxScroll <= 4 || node.scrollLeft >= maxScroll - 4,
    });
  }, []);

  useEffect(() => {
    measure();
    const node = track.current;
    if (!node) return;
    node.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      node.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  function scrollByCard(direction: 1 | -1) {
    const node = track.current;
    if (!node) return;
    const card = node.querySelector<HTMLElement>('.home-ad-card');
    const step = card ? card.offsetWidth + 18 : node.clientWidth * 0.8;
    node.scrollBy({ left: step * direction, behavior: 'smooth' });
  }

  return (
    <section className="home-ads container" aria-label={t(locale, 'adLabel')}>
      <div className="home-ads-head">
        <div className="home-ads-head-copy">
          <p className="startup-eyebrow">
            <Sparkles size={13} aria-hidden="true" />
            {t(locale, 'adLabel').toUpperCase()}
          </p>
          <h2>{t(locale, 'adsTitle')}</h2>
          <p className="home-ads-note">
            {c(
              'Gìn giữ nét tay nghề truyền thống và đồng hành cùng hành trình thực địa.',
              'Celebrating local craft workshops that accompany your walk.',
              '支持沿途传统手作工坊，留存城市文化记忆。',
            )}
          </p>
        </div>
        <div className="home-ads-nav">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            disabled={edge.start}
            aria-label={c('Lùi', 'Previous', '上一张')}
          >
            <ChevronLeft size={19} />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            disabled={edge.end}
            aria-label={c('Tiến', 'Next', '下一张')}
          >
            <ChevronRight size={19} />
          </button>
        </div>
      </div>

      <div className="home-ads-track" ref={track}>
        {adCards.map((card) => {
          const Icon = toneIcons[card.tone];
          return (
            <article key={card.id} className={`home-ad-card tone-${card.tone}`}>
              <div className="home-ad-media">
                <Image
                  src={card.image}
                  alt={card.title[locale]}
                  fill
                  sizes="(max-width: 640px) 78vw, (max-width: 1100px) 40vw, 300px"
                  className="home-ad-image"
                />
                <span className="home-ad-badge">
                  <Icon size={12} />
                  {card.badge[locale]}
                </span>
              </div>
              <div className="home-ad-body">
                <span className="home-ad-label">{card.category[locale]}</span>
                <h3 className="home-ad-title">{card.title[locale]}</h3>
                <p className="home-ad-desc">{card.note[locale]}</p>
                <div className="home-ad-buy">
                  <strong>{card.price[locale]}</strong>
                  <Link className="home-ad-cta" href={`/${locale}${card.href}`}>
                    {c('Tìm hiểu', 'Learn more', '了解更多')}
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="home-ads-disclaimer">{t(locale, 'adsNote')}</p>
    </section>
  );
}
