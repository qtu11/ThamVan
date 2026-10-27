import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Clock3, MapPin } from 'lucide-react';
import { experiences, experienceText, products } from '@/data/experiences';
import { copy, money } from '@/lib/locale-copy';
import type { Locale } from '@/lib/types';

export function ExperienceCards({ locale }: { locale: Locale }) {
  return (
    <div className="experience-grid">
      {experiences.map((item, index) => (
        <Link
          href={`/${locale}/experiences/${item.slug}`}
          className="experience-card"
          key={item.slug}
        >
          <div className="experience-photo" style={{ background: item.color }}>
            <Image
              src={item.image}
              alt={experienceText(item.title, locale)}
              fill
              sizes="(max-width: 700px) 92vw, 32vw"
            />
            <span className="experience-label">{experienceText(item.label, locale)}</span>
            <span className="round-arrow">
              <ArrowUpRight size={22} />
            </span>
          </div>
          <div className="experience-card-body">
            <p className="experience-meta">
              <span>
                <Clock3 size={13} />
                {item.minutes} {copy(locale, 'phút', 'min', '分钟')}
              </span>
              <span>
                <MapPin size={13} />
                {item.stops.length} {copy(locale, 'điểm dừng', 'stops', '站')}
              </span>
            </p>
            <h3>{experienceText(item.title, locale)}</h3>
            <p>{experienceText(item.description, locale)}</p>
            <div className="experience-card-bottom">
              <span>
                {copy(locale, 'Bộ hướng dẫn số', 'Digital story walk', '数字漫步指南')}
                <strong>{money(products.walk.amount, locale)}</strong>
              </span>
              <small>STORY WALK / 0{index + 1}</small>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
