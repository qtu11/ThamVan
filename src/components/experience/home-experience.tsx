'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Check,
  Clock3,
  Compass,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { CityCanvas } from './city-canvas';
import { useStaticExperience } from './motion';
import { experiences } from '@/data/experiences';
import { copy } from '@/lib/locale-copy';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/types';
import './home-experience.css';

export function HomeExperience({ locale, count }: { locale: Locale; count: number }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState('90');
  const [taste, setTaste] = useState<'heritage' | 'river' | 'local'>('heritage');
  const staticExperience = useStaticExperience();
  const progress = useRef(0);
  const visual = useRef<HTMLDivElement>(null);
  const motion = !staticExperience && !paused;
  const route = experiences.find((item) => item.theme === taste) ?? experiences[0];
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);

  useEffect(() => {
    progress.current = active / 2;
    visual.current?.dispatchEvent(new Event('city:progress'));
    visual.current?.dispatchEvent(new Event('city:lighting'));
  }, [active]);

  return (
    <div className="home-experience" data-motion={motion ? 'on' : 'off'}>
      <section className="startup-hero container">
        <div className="hero-copy city-opening">
          <p className="startup-eyebrow">
            <span className="editorial-seal-dot" aria-hidden="true" />
            {c(
              'ẤN PHẨM THỰC ĐỊA SÀI GÒN · THÁM VĂN',
              'SAIGON FIELD-GUIDE · THÁM VĂN',
              '西贡实地文化手记 · 探文',
            )}
          </p>
          <h1>
            {c('Đừng chỉ đến.', 'Don’t just visit.', '不止到此一游。')}
            <br />
            {c('Hãy ', 'Feel ', '感受')}
            <span className="hero-serif">{c('chạm', 'the city', '这座城市')}</span>
            <br />
            {c('vào Sài Gòn.', 'a little closer.', '更近一点。')}
          </h1>
          <p className="hero-description">
            {c(
              'Mở từng lớp ký ức bên bến sông Bạch Đằng, mái ngói Chợ Lớn và những mặt tiền di sản. Nhận diện công trình qua ống kính, đối chiếu nguồn tư liệu và tự chọn lộ trình đi bộ cho riêng mình.',
              'Uncover layers of memory from Bạch Đằng waterfront to Chợ Lớn courtyards. Identify landmarks with your camera, check verified sources, and walk Saigon at your own pace.',
              '从白藤码头到堤岸古巷，阅读城市记忆。用相机识别建筑，查阅可溯源档案，按自己的节奏漫步西贡。',
            )}
          </p>
          <div className="hero-actions">
            <Link className="button" href={`/${locale}/experiences`}>
              {c('Tìm hành trình của tôi', 'Find my story walk', '寻找我的漫步')}
              <ArrowUpRight size={18} />
            </Link>
            <Link className="button secondary" href={`/${locale}/explore`}>
              {c('Khám phá miễn phí', 'Explore for free', '免费探索')}
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="hero-promises">
            <span>
              <Check size={14} aria-hidden="true" />
              <strong>{count.toLocaleString(locale)}</strong>
              {c('địa điểm di sản', 'heritage places', '处遗产地点')}
            </span>
            <span>
              <Check size={14} aria-hidden="true" />
              {c('Tư liệu có nguồn đối chiếu', 'Verified source citations', '可溯源的权威文献')}
            </span>
            <span>
              <Check size={14} aria-hidden="true" />
              {c('Hộ chiếu đóng dấu thực địa', 'Field stamp passport', '实地盖章探索护照')}
            </span>
          </div>
        </div>

        <div className="hero-world">
          <div className="world-heading">
            <span>
              <span className="editorial-seal-dot" aria-hidden="true" />
              {c('BẢN VẼ KHÔNG GIAN SÀI GÒN', 'SAIGON SPATIAL ATLAS', '西贡空间图谱')}
            </span>
          </div>
          <button
            type="button"
            className="motion-toggle"
            disabled={staticExperience}
            aria-pressed={!staticExperience && paused}
            onClick={() => setPaused((prev) => !prev)}
          >
            {staticExperience
              ? t(locale, 'motionReduced')
              : paused
                ? t(locale, 'motionOff')
                : t(locale, 'motionOn')}
          </button>
          <div
            className="city-visual"
            ref={visual}
            data-city-time={active === 0 ? 'day' : active === 1 ? 'sunset' : 'dusk'}
            data-scroll-progress={active / 2}
          >
            <CityCanvas
              locale={locale}
              motion={motion}
              progress={progress}
              time={active === 0 ? 'day' : active === 1 ? 'sunset' : 'dusk'}
              view={active}
            />
          </div>
          <div className="world-ticket">
            <span className="ticket-icon" aria-hidden="true">
              <MapPin size={16} />
            </span>
            <div>
              <strong>
                {t(
                  locale,
                  active === 0 ? 'cityOverview' : active === 1 ? 'cityRiver' : 'citySkyline',
                )}
              </strong>
            </div>
          </div>
          <div className="world-tabs" role="group" aria-label={t(locale, 'cityViews')}>
            {['cityOverview', 'cityRiver', 'citySkyline'].map((key, index) => (
              <button
                type="button"
                key={key}
                aria-pressed={active === index}
                onClick={() => setActive(index)}
              >
                <span>0{index + 1}</span>
                {t(locale, key as 'cityOverview')}
              </button>
            ))}
          </div>
          <p className="world-note">
            {c(
              'Minh họa không gian nghệ thuật · Không thay thế bản đồ địa lý',
              'Interactive artistic atlas · Not a geographic navigation map',
              '交互艺术空间模型 · 非地理测绘地图',
            )}
          </p>
        </div>
      </section>

      <section
        className="journey-finder container"
        aria-label={c('Chọn nhanh lộ trình thực địa', 'Quick field-walk selector', '快速选择漫步路线')}
      >
        <div className="finder-title">
          <Compass size={22} aria-hidden="true" />
          <div>
            <strong>
              {c('Sổ tay chọn lộ trình nhanh', 'Field-guide route finder', '快速选线手记')}
            </strong>
            <small>
              {c(
                'Chọn quỹ thời gian và nhịp kể chuyện để mở tập lộ trình phù hợp.',
                'Match your schedule and curiosity to a curated Saigon story walk.',
                '根据空闲时间与兴趣偏好，打开最适合你的西贡路线。',
              )}
            </small>
          </div>
        </div>

        <label>
          <span>
            <Clock3 size={12} aria-hidden="true" />
            {c('TÔI CÓ', 'I HAVE', '我有时间')}
          </span>
          <select value={duration} onChange={(event) => setDuration(event.target.value)}>
            <option value="60">{c('60 phút dạo nhanh', '60 min brisk walk', '60 分钟快览')}</option>
            <option value="90">{c('90 phút buổi chiều', '90 min afternoon', '90 分钟午后')}</option>
            <option value="120">{c('120 phút thong thả', '120 min unhurried', '120 分钟慢游')}</option>
            <option value="150">{c('150 phút trọn vẹn', '150 min full monograph', '150 分钟深度')}</option>
          </select>
        </label>

        <label>
          <span>
            <Sparkles size={12} aria-hidden="true" />
            {c('GU CỦA TÔI', 'MY TASTE', '我的偏好')}
          </span>
          <select
            value={taste}
            onChange={(event) =>
              setTaste(event.target.value as 'heritage' | 'river' | 'local')
            }
          >
            <option value="heritage">
              {c('Kiến trúc & Ký ức đô thị', 'Architecture & urban memory', '建筑与城市记忆')}
            </option>
            <option value="river">
              {c('Sông nước & Bến cảng xưa', 'Riverfront & historic ports', '江河与老码头')}
            </option>
            <option value="local">
              {c('Chợ Lớn & Nếp sống bản địa', 'Chợ Lớn & local streets', '堤岸与本地文化')}
            </option>
          </select>
        </label>

        <Link className="button" href={`/${locale}/experiences/${route.slug}?time=${duration}`}>
          {c('Gợi ý cho tôi', 'Suggest a route', '为我推荐')}
          <ArrowUpRight size={16} />
        </Link>
      </section>
    </div>
  );
}
