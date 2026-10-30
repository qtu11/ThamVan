'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Calendar,
  Camera,
  ChevronRight,
  Clock3,
  Compass,
  Landmark,
  MapPin,
  Music,
  Sparkles,
  Trophy,
} from 'lucide-react';
import type { Heritage, Kind, Locale } from '@/lib/types';
import { copy } from '@/lib/locale-copy';
import { t } from '@/lib/i18n';

const mainTopics: Kind[] = ['monument', 'symbol', 'architecture', 'nature', 'craft'];

type EventCategory = 'all' | 'music' | 'festival' | 'exhibition';

interface CityEventItem {
  id: string;
  category: Exclude<EventCategory, 'all'>;
  image: string;
  badge: { vi: string; en: string; zh: string };
  title: { vi: string; en: string; zh: string };
  time: { vi: string; en: string; zh: string };
  venue: { vi: string; en: string; zh: string };
  summary: { vi: string; en: string; zh: string };
  href: string;
}

const cityEvents: CityEventItem[] = [
  {
    id: 'nguyen-hue-music-show',
    category: 'music',
    image: '/images/hcm-vr-0062-pho-di-bo-nguyen-hue.jpg',
    badge: {
      vi: 'Show ca nhạc',
      en: 'Live Music Show',
      zh: '音乐演出',
    },
    title: {
      vi: 'Show ca nhạc & Nhạc nước Phố đi bộ Nguyễn Huệ',
      en: 'Nguyen Hue Walking Street Live Music & Fountain Show',
      zh: '阮惠步行街音乐秀与喷泉表演',
    },
    time: {
      vi: 'Thứ Bảy & Chủ Nhật · 19:30 – 22:00',
      en: 'Sat & Sun · 19:30 – 22:00',
      zh: '周六至周日 · 19:30 – 22:00',
    },
    venue: {
      vi: 'Phố đi bộ Nguyễn Huệ, Quận 1',
      en: 'Nguyen Hue Walking Street, District 1',
      zh: '第一郡阮惠步行街',
    },
    summary: {
      vi: 'Đêm nhạc đường phố, biểu diễn ban nhạc trẻ kết hợp trình diễn ánh sáng và nhạc nước dọc đại lộ trung tâm.',
      en: 'Street live bands, youth performances, and illuminated water fountain shows along the central boulevard.',
      zh: '街头乐队现场演唱、青年艺术表演与大道灯光音乐喷泉秀。',
    },
    href: '/explore/hcm-0066',
  },
  {
    id: 'opera-house-concert',
    category: 'music',
    image: '/images/hcm-0066-nha-hat-thanh-pho-ho-chi-minh.jpg',
    badge: {
      vi: 'Biểu diễn nghệ thuật',
      en: 'Performing Arts',
      zh: '艺术公演',
    },
    title: {
      vi: 'Hòa nhạc Giao hưởng & À Ố Show trước Nhà hát Thành phố',
      en: 'Brass Symphony & A O Show at Saigon Opera House',
      zh: '西贡大剧院交响乐与竹艺演出',
    },
    time: {
      vi: 'Chủ Nhật · 08:00 – 09:30 & Tối 20:00',
      en: 'Sun · 08:00 – 09:30 & 20:00',
      zh: '周日 · 08:00 – 09:30 及 20:00',
    },
    venue: {
      vi: 'Công trường Lam Sơn (Nhà hát Thành phố), Quận 1',
      en: 'Lam Son Square (Saigon Opera House), District 1',
      zh: '第一郡蓝山广场（市立歌剧院）',
    },
    summary: {
      vi: 'Chương trình hòa nhạc kèn đồng ngoài trời cuối tuần và xiếc tre đương đại đậm bản sắc văn hóa Nam Bộ.',
      en: 'Weekend outdoor brass ensemble concerts and contemporary Southern Vietnamese bamboo circus.',
      zh: '周末户外铜管交响乐演出与展现南方文化的当代竹艺剧场。',
    },
    href: '/explore/hcm-0066',
  },
  {
    id: 'bach-dang-acoustic',
    category: 'music',
    image: '/images/hcm-0057-cong-vien-ben-bach-dang.jpg',
    badge: {
      vi: 'Acoustic ven sông',
      en: 'Riverfront Acoustic',
      zh: '江畔音乐',
    },
    title: {
      vi: 'Đêm nhạc Acoustic & Ngắm cảnh Bến Bạch Đằng',
      en: 'Bach Dang Wharf Sunset Acoustic & River Night',
      zh: '白藤码头日落原声音乐夜',
    },
    time: {
      vi: 'Mỗi tối · 18:30 – 21:30',
      en: 'Daily · 18:30 – 21:30',
      zh: '每晚 · 18:30 – 21:30',
    },
    venue: {
      vi: 'Công viên Bến Bạch Đằng & Ga tàu thủy, Quận 1',
      en: 'Bach Dang Riverfront Park & Pier, District 1',
      zh: '第一郡白藤江畔公园与水上巴士站',
    },
    summary: {
      vi: 'Thưởng thức hòa tấu violin, guitar acoustic bên bờ sông Sài Gòn và ngắm Cầu Ba Son lên đèn.',
      en: 'Violin and acoustic guitar sessions along the Saigon River overlooking the illuminated Ba Son Bridge.',
      zh: '在西贡河畔欣赏小提琴与吉他原声演出，远眺巴山桥璀璨夜景。',
    },
    href: '/experiences/sai-gon-ben-song',
  },
  {
    id: 'thu-thiem-indie-fest',
    category: 'festival',
    image: '/images/hcm-vr-0027-cau-ba-son.jpg',
    badge: {
      vi: 'Lễ hội & Sân khấu mở',
      en: 'Open-Air Festival',
      zh: '户外音乐节',
    },
    title: {
      vi: 'Show Âm nhạc Hoàng hôn & Chợ phiên Công viên Bờ sông',
      en: 'Sunset Indie Concert & Creative Fair at Riverfront Park',
      zh: '西贡河畔公园日落音乐会与创意市集',
    },
    time: {
      vi: 'Thứ Bảy & Chủ Nhật · 16:30 – 21:30',
      en: 'Sat & Sun · 16:30 – 21:30',
      zh: '周六至周日 · 16:30 – 21:30',
    },
    venue: {
      vi: 'Công viên bờ sông Sài Gòn (Chân cầu Ba Son), TP Thủ Đức',
      en: 'Saigon Riverfront Park (Ba Son Bridge), Thu Duc City',
      zh: '守德市西贡河畔公园（巴山桥下）',
    },
    summary: {
      vi: 'Sân khấu nhạc Indie ngoài trời hướng thẳng về skyline Quận 1 kết hợp gian hàng thủ công bản địa.',
      en: 'Open-air indie stage facing the District 1 skyline paired with local artisan craft stalls.',
      zh: '面向第一郡天际线的户外独立音乐舞台与本地手作创意市集。',
    },
    href: '/map',
  },
  {
    id: 'cho-lon-heritage-night',
    category: 'festival',
    image: '/images/hcm-0002-chua-ba-thien-hau-hoi-quan-tue-thanh.jpg',
    badge: {
      vi: 'Lễ hội văn hóa',
      en: 'Cultural Festival',
      zh: '文化庙会',
    },
    title: {
      vi: 'Đêm hội Lân Sư Rồng & Phố cổ Chợ Lớn',
      en: 'Cho Lon Lion Dance & Heritage Lantern Night',
      zh: '堤岸舞狮盛会与古街文化之夜',
    },
    time: {
      vi: 'Thứ Sáu – Chủ Nhật · 18:00 – 22:00',
      en: 'Fri – Sun · 18:00 – 22:00',
      zh: '周五至周日 · 18:00 – 22:00',
    },
    venue: {
      vi: 'Hội quán Tuệ Thành & Phố Nguyễn Trãi, Quận 5',
      en: 'Tue Thanh Guildhall & Nguyen Trai St, District 5',
      zh: '第五郡穗城会馆与阮廌街区',
    },
    summary: {
      vi: 'Biểu diễn trống hội Lân Sư Rồng truyền thống, nghệ thuật thư pháp và không gian ẩm thực Chợ Lớn.',
      en: 'Traditional lion and dragon drum performances, calligraphy demonstrations, and Cho Lon street food.',
      zh: '传统舞狮锣鼓表演、书法体验与堤岸特色美食夜。',
    },
    href: '/experiences/mot-ngay-cho-lon',
  },
  {
    id: 'saigon-architecture-expo',
    category: 'exhibition',
    image: '/images/hcm-0051-buu-dien-trung-tam-sai-gon.jpg',
    badge: {
      vi: 'Triển lãm di sản',
      en: 'Heritage Exhibition',
      zh: '遗产展览',
    },
    title: {
      vi: 'Triển lãm Ký ức Kiến trúc & Bưu thiếp Sài Gòn Xưa',
      en: 'Saigon Architectural Memory & Vintage Postcard Expo',
      zh: '西贡建筑记忆与古董明信片特展',
    },
    time: {
      vi: 'Thứ Ba – Chủ Nhật · 08:30 – 17:00',
      en: 'Tue – Sun · 08:30 – 17:00',
      zh: '周二至周日 · 08:30 – 17:00',
    },
    venue: {
      vi: 'Bưu điện Trung tâm & Đường sách Nguyễn Văn Bình, Quận 1',
      en: 'Central Post Office & Nguyen Van Binh Book Street, District 1',
      zh: '第一郡中央邮局与阮文平书街',
    },
    summary: {
      vi: 'Trưng bày bản vẽ kiến trúc Đông Dương, bưu thiếp cổ thế kỷ 20 và tọa đàm bảo tồn di sản đô thị.',
      en: 'Showcasing Indochine architectural blueprints, 20th-century postcards, and urban heritage talks.',
      zh: '展出印度支那时期建筑图纸、二十世纪古董明信片与城市遗产讲座。',
    },
    href: '/explore/hcm-0051',
  },
];

export function HomeDiscoveryHub({
  entries,
  locale,
}: {
  entries: Heritage[];
  locale: Locale;
}) {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('all');

  const categoryTabs: { id: EventCategory; label: string }[] = [
    { id: 'all', label: c('Tất cả sự kiện', 'All events', '全部活动') },
    { id: 'music', label: c('Show ca nhạc & Biểu diễn', 'Live Music & Shows', '音乐与演出') },
    { id: 'festival', label: c('Lễ hội & Phố đi bộ', 'Festivals & Streets', '节庆与步行街') },
    { id: 'exhibition', label: c('Triển lãm & Di sản', 'Exhibitions & Heritage', '展览与遗产') },
  ];

  const visibleEvents =
    selectedCategory === 'all'
      ? cityEvents
      : cityEvents.filter((item) => item.category === selectedCategory);

  return (
    <section
      className="lovable-hub container"
      aria-label={c('Khám phá nhanh di sản', 'Quick heritage discovery', '快速探索遗产')}
    >
      <div className="lovable-action-grid">
        <Link href={`/${locale}/camera`} className="lovable-camera-cta">
          <span className="lovable-camera-badge" aria-hidden="true">
            <Camera size={26} />
          </span>
          <div className="lovable-camera-copy">
            <h2>{c('Chụp để khám phá', 'Snap to discover', '拍照探索')}</h2>
            <p>
              {c(
                'Chụp toàn cảnh hoặc cận một chi tiết văn hóa để nhận diện kiến trúc, hiện vật.',
                'Capture a facade or cultural detail to identify architecture and artifacts.',
                '拍摄全景或文化细节，识别建筑与文物信息。',
              )}
            </p>
          </div>
          <ChevronRight size={22} className="lovable-camera-arrow" aria-hidden="true" />
        </Link>

        <Link href={`/${locale}/challenges`} className="lovable-challenge-cta">
          <span className="lovable-challenge-badge" aria-hidden="true">
            <Trophy size={24} />
          </span>
          <div className="lovable-camera-copy">
            <h2>{c('Thử thách & Đố vui', 'Challenges & Trivia', '挑战与问答')}</h2>
            <p>
              {c(
                'Trả lời câu đố di sản, hoàn thành nhiệm vụ và sưu tầm huy hiệu văn hóa.',
                'Answer heritage quizzes, complete quests, and collect cultural badges.',
                '回答遗产问答，完成任务并收集文化徽章。',
              )}
            </p>
          </div>
          <ChevronRight size={22} className="lovable-camera-arrow" aria-hidden="true" />
        </Link>
      </div>

      <div className="lovable-nearby-card">
        <div className="lovable-nearby-header">
          <div>
            <h2>
              {c(
                'Sự kiện quanh thành phố',
                'Events around the city',
                '全城近期活动',
              )}
            </h2>
            <p>
              {c(
                'Cập nhật lịch show ca nhạc ở phố đi bộ Nguyễn Huệ, biểu diễn nghệ thuật và lễ hội văn hóa kèm thời gian, địa điểm chi tiết.',
                'Live music shows at Nguyen Hue Walking Street, cultural festivals, and exhibitions with schedules and venues.',
                '汇总阮惠步行街音乐演出、文化节庆与艺术展览的详细时间与地点。',
              )}
            </p>
          </div>
          <Link href={`/${locale}/map`} className="lovable-map-link">
            {c('Xem bản đồ sự kiện & điểm đến', 'View events & places on map', '在地图上查看全部')}
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="lovable-nearby-controls lovable-events-controls">
          <div className="lovable-events-live">
            <span className="live-dot" aria-hidden="true" />
            <strong>
              {c('Lịch hoạt động tiêu biểu tuần này', 'Featured schedule this week', '本周精选活动日程')}
            </strong>
          </div>

          <div
            className="lovable-region-pills"
            role="group"
            aria-label={c('Lọc loại sự kiện', 'Filter event type', '筛选活动类型')}
          >
            {categoryTabs.map((tab) => (
              <button
                type="button"
                key={tab.id}
                className={`lovable-pill ${selectedCategory === tab.id ? 'active' : ''}`}
                aria-pressed={selectedCategory === tab.id}
                onClick={() => setSelectedCategory(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lovable-nearby-results">
          {visibleEvents.map((eventItem) => {
            const IconComponent = eventItem.category === 'music' ? Music : Calendar;
            return (
              <Link
                key={eventItem.id}
                href={`/${locale}${eventItem.href}`}
                className="lovable-place-mini lovable-event-card"
              >
                <div className="lovable-event-thumb">
                  <Image
                    src={eventItem.image}
                    alt={eventItem.title[locale]}
                    fill
                    sizes="(max-width: 700px) 32vw, 32vw"
                  />
                  <span className="lovable-place-tag lovable-event-badge">
                    <IconComponent size={12} aria-hidden="true" />
                    {eventItem.badge[locale]}
                  </span>
                </div>
                <div className="lovable-place-info">
                  <strong>{eventItem.title[locale]}</strong>
                  <p>{eventItem.summary[locale]}</p>
                  <div className="lovable-event-meta">
                    <small className="lovable-event-time">
                      <Clock3 size={12} />
                      <span>{eventItem.time[locale]}</span>
                    </small>
                    <small className="lovable-event-venue">
                      <MapPin size={12} />
                      <span>{eventItem.venue[locale]}</span>
                    </small>
                  </div>
                </div>
                <ArrowRight size={16} className="lovable-place-arrow" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="lovable-topics-block">
        <div className="lovable-topics-header">
          <div>
            <p className="startup-eyebrow">
              <Sparkles size={13} />
              {c('DANH MỤC DI SẢN', 'HERITAGE CATEGORIES', '遗产分类')}
            </p>
            <h2>{c('Khám phá theo chủ đề', 'Explore by theme', '按主题探索')}</h2>
          </div>
          <Link href={`/${locale}/explore`} className="text-link">
            {c('Xem toàn bộ danh mục', 'Browse all places', '查看全部地点')}
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="lovable-topics-grid">
          {mainTopics.map((topic) => {
            const topicCount = entries.filter((item) => item.kind === topic).length;
            return (
              <Link
                key={topic}
                href={`/${locale}/explore?kind=${topic}`}
                className="lovable-topic-card"
              >
                <span className="lovable-topic-icon" aria-hidden="true">
                  <Compass size={18} />
                </span>
                <div>
                  <strong>{t(locale, topic)}</strong>
                  <small>
                    {topicCount} {t(locale, 'resultCount')}
                  </small>
                </div>
              </Link>
            );
          })}
          <Link href={`/${locale}/explore`} className="lovable-topic-card">
            <span className="lovable-topic-icon" aria-hidden="true">
              <Landmark size={18} />
            </span>
            <div>
              <strong>{c('Tất cả địa điểm', 'All heritage places', '全部遗产地点')}</strong>
              <small>
                {entries.length} {t(locale, 'resultCount')}
              </small>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

