'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Clock3,
  Compass,
  MapPin,
  Pause,
  Play,
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
  const [taste, setTaste] = useState('river');
  const staticExperience = useStaticExperience();
  const progress = useRef(0);
  const visual = useRef<HTMLDivElement>(null);
  const motion = !staticExperience && !paused;
  const route = experiences.find((item) => item.theme === taste) ?? experiences[0];
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
            <span className="live-dot" />
            {copy(
              locale,
              'MỘT SÀI GÒN CHƯA KỂ HẾT',
              'SAIGON, STILL FULL OF STORIES',
              '西贡，故事未完待续',
            )}
          </p>
          <h1>
            {copy(locale, 'Đừng chỉ đến.', 'Don’t just visit.', '不止到此一游。')}
            <br />
            {copy(locale, 'Hãy ', 'Feel ', '感受')}
            <span className="hero-serif">{copy(locale, 'chạm', 'the city', '这座城市')}</span>
            <br />
            {copy(locale, 'vào Sài Gòn.', 'a little closer.', '更近一点。')}
            <span className="hero-period" aria-hidden="true">
              *
            </span>
          </h1>
          <p className="hero-description">
            {copy(
              locale,
              'Biến một buổi đi chơi thành câu chuyện của riêng bạn. Chọn gu, mở hành trình và khám phá những lớp văn hóa ngay giữa lòng thành phố.',
              'Make an afternoon out a story of your own. Pick your mood, find your walk and discover the culture hiding in plain sight.',
              '让一次出游成为你的独家故事。选择喜好，开启漫步，发现城市日常里的文化。',
            )}
          </p>
          <div className="hero-actions">
            <Link className="button" href={`/${locale}/experiences`}>
              {copy(locale, 'Tìm hành trình của tôi', 'Find my story walk', '寻找我的漫步')}
              <ArrowUpRight size={18} />
            </Link>
            <Link className="hero-secondary" href={`/${locale}/explore`}>
              {copy(locale, 'Khám phá miễn phí', 'Explore for free', '免费探索')}
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="hero-promises">
            <span>
              <Check size={14} />
              {copy(locale, 'Đi theo nhịp của bạn', 'Your pace, your story', '按自己的节奏')}
            </span>
            <span>
              <Check size={14} />
              {copy(locale, 'Tư liệu có nguồn', 'Sources you can follow', '可追溯的资料')}
            </span>
          </div>
        </div>
        <div className="hero-world">
          <div className="world-heading">
            <span>
              <span className="live-dot" />
              SAIGON EXPLORER
            </span>
            <span>10.78° N / 106.70° E</span>
          </div>
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
            <button
              className="motion-toggle"
              aria-pressed={motion}
              disabled={staticExperience}
              onClick={() => setPaused(!paused)}
            >
              {motion ? <Pause size={12} /> : <Play size={12} />}
              {t(locale, staticExperience ? 'motionReduced' : motion ? 'motionOn' : 'motionOff')}
            </button>
            <div className="world-compass" aria-hidden="true">
              <span>N</span>
              <Compass size={36} strokeWidth={1} />
            </div>
          </div>
          <div className="world-ticket">
            <span className="ticket-icon">
              <MapPin size={20} />
            </span>
            <div>
              <small>
                {copy(
                  locale,
                  'MỖI GÓC PHỐ, MỘT CÂU CHUYỆN',
                  'EVERY CORNER HAS A STORY',
                  '每个街角都有故事',
                )}
              </small>
              <strong>
                {t(
                  locale,
                  active === 0 ? 'cityOverview' : active === 1 ? 'cityRiver' : 'citySkyline',
                )}
              </strong>
            </div>
            <span className="ticket-mark" aria-hidden="true">
              ✳
            </span>
          </div>
          <div className="world-tabs" role="group" aria-label={t(locale, 'cityViews')}>
            {['cityOverview', 'cityRiver', 'citySkyline'].map((key, index) => (
              <button key={key} aria-pressed={active === index} onClick={() => setActive(index)}>
                <span>0{index + 1}</span>
                {t(locale, key as 'cityOverview')}
                <ArrowUpRight size={13} />
              </button>
            ))}
          </div>
          <p className="world-note">
            {copy(
              locale,
              'Mô hình nghệ thuật tương tác · Không phải bản đồ địa lý',
              'Interactive artistic model · Not a geographic map',
              '交互艺术模型 · 非地理地图',
            )}
          </p>
        </div>
      </section>
      <section
        className="journey-finder container"
        aria-label={copy(locale, 'Tìm hành trình phù hợp', 'Find your walk', '寻找适合的路线')}
      >
        <div className="finder-title">
          <Sparkles size={22} />
          <div>
            <strong>
              {copy(
                locale,
                'Hôm nay, bạn muốn đi đâu?',
                'What’s your kind of day?',
                '今天想去哪里？',
              )}
            </strong>
            <small>
              {copy(
                locale,
                'Một chút thời gian. Một góc nhìn mới.',
                'A little time. A fresh perspective.',
                '一点时间，全新视角。',
              )}
            </small>
          </div>
        </div>
        <label>
          <span>
            <Clock3 size={13} />
            {copy(locale, 'TÔI CÓ', 'I HAVE', '我有')}
          </span>
          <select value={duration} onChange={(event) => setDuration(event.target.value)}>
            <option value="90">
              90 {copy(locale, 'phút thảnh thơi', 'unhurried minutes', '分钟闲暇')}
            </option>
            <option value="150">
              150 {copy(locale, 'phút khám phá', 'minutes to discover', '分钟探索')}
            </option>
          </select>
        </label>
        <label>
          <span>
            <Compass size={13} />
            {copy(locale, 'GU CỦA TÔI', 'MY MOOD', '我的喜好')}
          </span>
          <select value={taste} onChange={(event) => setTaste(event.target.value)}>
            <option value="river">
              {copy(locale, 'Bên sông & kiến trúc', 'Riverside & architecture', '河畔与建筑')}
            </option>
            <option value="heritage">
              {copy(locale, 'Văn hóa & ký ức', 'Culture & memories', '文化与记忆')}
            </option>
            <option value="local">
              {copy(locale, 'Bản sắc Chợ Lớn', 'Local life in Chợ Lớn', '堤岸风情')}
            </option>
          </select>
        </label>
        <Link className="button" href={`/${locale}/experiences/${route.slug}?time=${duration}`}>
          {copy(locale, 'Gợi ý cho tôi', 'Find my walk', '为我推荐')}
          <ArrowUpRight size={17} />
        </Link>
      </section>
      <div className="discovery-proof container">
        <span>
          <MapPin size={15} />
          <strong>{count.toLocaleString(locale)}</strong>
          {copy(locale, 'địa điểm trong danh mục', 'places in the atlas', '个目录地点')}
        </span>
        <span>
          <Compass size={15} />
          {copy(
            locale,
            'Tự khám phá. Theo cách của bạn.',
            'Self-guided. On your terms.',
            '自主探索，自由安排。',
          )}
        </span>
        <a href="#story-walks">
          {copy(locale, 'Kéo xuống, mở câu chuyện', 'Scroll into a new story', '向下发现故事')}
          <ArrowDown size={14} />
        </a>
      </div>
    </div>
  );
}
