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
      vi: 'Âm nhạc đường phố',
      en: 'Live Music',
      zh: '街头音乐',
    },
    title: {
      vi: 'Đêm nhạc & Trình diễn ánh sáng Phố đi bộ Nguyễn Huệ',
      en: 'Nguyen Hue Walking Street Live Music & Fountain Show',
      zh: '阮惠步行街音乐秀与喷泉表演',
    },
    time: {
      vi: 'Cuối tuần · Không gian phố đi bộ buổi tối',
      en: 'Weekends · Evening pedestrian promenade',
      zh: '周末晚间 · 步行街公共空间',
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
    href: '/explore/hcm-vr-0062',
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
      vi: 'Cuối tuần & lịch diễn theo mùa tại Nhà hát',
      en: 'Weekends & seasonal Opera House billings',
      zh: '周末及歌剧院当季演出排期',
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
      vi: 'Chiều muộn & buổi tối dọc công viên sông',
      en: 'Late afternoon & evening riverside walks',
      zh: '傍晚至夜间 · 江畔漫步时段',
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
      vi: 'Sân khấu ven sông',
      en: 'Open-Air Festival',
      zh: '户外音乐节',
    },
    title: {
      vi: 'Hòa nhạc hoàng hôn & Chợ phiên Công viên Bờ sông',
      en: 'Sunset Indie Concert & Creative Fair at Riverfront Park',
      zh: '西贡河畔公园日落音乐会与创意市集',
    },
    time: {
      vi: 'Cuối tuần · Chợ phiên & sân khấu công viên',
      en: 'Weekends · Riverside market & open stage',
      zh: '周末 · 江畔创意市集与户外舞台',
    },
    venue: {
      vi: 'Công viên bờ sông Sài Gòn (Chân cầu Ba Son), TP. Thủ Đức',
      en: 'Saigon Riverfront Park (Ba Son Bridge), Thu Duc City',
      zh: '守德市西贡河畔公园（巴山桥下）',
    },
    summary: {
      vi: 'Sân khấu nhạc nhẹ ngoài trời hướng thẳng về đường chân trời Quận 1 kết hợp gian hàng thủ công bản địa.',
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
      vi: 'Dịp lễ hội truyền thống & sinh hoạt phố cổ',
      en: 'Traditional festivals & guildhall gatherings',
      zh: '传统节庆与会馆民俗活动期',
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
      vi: 'Tham quan ban ngày theo giờ mở cửa khu di sản',
      en: 'Daytime visits during heritage site hours',
      zh: '日间开放参观 · 按场馆开放时间',
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
    { id: 'all', label: c('Tất cả', 'All events', '全部活动') },
    { id: 'music', label: c('Âm nhạc & Biểu diễn', 'Live Music & Shows', '音乐与演出') },
    { id: 'festival', label: c('Lễ hội & Phố cổ', 'Festivals & Streets', '节庆与步行街') },
    { id: 'exhibition', label: c('Triển lãm & Tư liệu', 'Exhibitions & Heritage', '展览与遗产') },
  ];

  const visibleEvents =
    selectedCategory === 'all'
      ? cityEvents
      : cityEvents.filter((item) => item.category === selectedCategory);

  return (
    <section
      className="hub-section container"
      aria-label={c('Khám phá nhanh di sản', 'Quick heritage discovery', '快速探索遗产')}
    >
      <div className="hub-action-grid">
        <Link href={`/${locale}/camera`} className="hub-camera-cta">
          <span className="hub-camera-badge" aria-hidden="true">
            <Camera size={26} />
          </span>
          <div className="hub-action-copy">
            <h2>{c('Chụp để khám phá', 'Snap to discover', '拍照探索')}</h2>
            <p>
              {c(
                'Chụp toàn cảnh hoặc cận một chi tiết văn hóa để nhận diện kiến trúc, hiện vật.',
                'Capture a facade or cultural detail to identify architecture and artifacts.',
                '拍摄全景或文化细节，识别建筑与文物信息。',
              )}
            </p>
          </div>
          <ChevronRight size={22} className="hub-action-arrow" aria-hidden="true" />
        </Link>

        <Link href={`/${locale}/challenges`} className="hub-challenge-cta">
          <span className="hub-challenge-badge" aria-hidden="true">
            <Trophy size={24} />
          </span>
          <div className="hub-action-copy">
            <h2>{c('Thử thách & Đố vui', 'Challenges & Trivia', '挑战与问答')}</h2>
            <p>
              {c(
                'Trả lời câu đố di sản, hoàn thành nhiệm vụ và sưu tầm huy hiệu văn hóa.',
                'Answer heritage quizzes, complete quests, and collect cultural badges.',
                '回答遗产问答，完成任务并收集文化徽章。',
              )}
            </p>
          </div>
          <ChevronRight size={22} className="hub-action-arrow" aria-hidden="true" />
        </Link>
      </div>

      <div className="hub-events-card">
        <div className="hub-events-header">
          <div>
            <h2>
              {c(
                'Nhịp sống văn hóa quanh thành phố',
                'Cultural rhythm around the city',
                '全城近期文化活动',
              )}
            </h2>
            <p>
              {c(
                'Gợi ý các không gian âm nhạc ngoài trời tại Phố đi bộ Nguyễn Huệ, công viên ven sông và triển lãm di sản cuối tuần.',
                'Curated spaces for Nguyen Hue performances, riverfront evenings, and heritage exhibitions.',
                '精选阮惠步行街音乐空间、河畔夜色与城市遗产展览地点。',
              )}
            </p>
          </div>
          <Link href={`/${locale}/map`} className="hub-map-link">
            {c('Xem bản đồ sự kiện & điểm đến', 'View events & places on map', '在地图上查看全部')}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="hub-events-controls">
          <div className="hub-events-status">
            <Calendar size={15} aria-hidden="true" />
            <strong>
              {c('Không gian sinh hoạt văn hóa nổi bật', 'Featured cultural spaces', '城市常设文化空间')}
            </strong>
          </div>

          <div
            className="hub-filter-pills"
            role="group"
            aria-label={c('Lọc loại sự kiện', 'Filter event type', '筛选活动类型')}
          >
            {categoryTabs.map((tab) => (
              <button
                type="button"
                key={tab.id}
                className={`hub-pill ${selectedCategory === tab.id ? 'active' : ''}`}
                aria-pressed={selectedCategory === tab.id}
                onClick={() => setSelectedCategory(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hub-events-grid">
          {visibleEvents.map((eventItem) => {
            const IconComponent = eventItem.category === 'music' ? Music : Calendar;
            return (
              <Link
                key={eventItem.id}
                href={`/${locale}${eventItem.href}`}
                className="hub-event-card"
              >
                <div className="hub-event-thumb">
                  <Image
                    src={eventItem.image}
                    alt={eventItem.title[locale]}
                    fill
                    sizes="(max-width: 600px) 92vw, (max-width: 960px) 46vw, 31vw"
                  />
                  <span className="hub-event-badge">
                    <IconComponent size={12} aria-hidden="true" />
                    {eventItem.badge[locale]}
                  </span>
                </div>
                <div className="hub-event-info">
                  <strong>{eventItem.title[locale]}</strong>
                  <p>{eventItem.summary[locale]}</p>
                  <div className="hub-event-meta">
                    <small className="hub-event-time">
                      <Clock3 size={12} />
                      <span>{eventItem.time[locale]}</span>
                    </small>
                    <small className="hub-event-venue">
                      <MapPin size={12} />
                      <span>{eventItem.venue[locale]}</span>
                    </small>
                  </div>
                </div>
                <ArrowRight size={16} className="hub-event-arrow" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="hub-topics-block">
        <div className="hub-topics-header">
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
        <div className="hub-topics-grid">
          {mainTopics.map((topic) => {
            const topicCount = entries.filter((item) => item.kind === topic).length;
            return (
              <Link
                key={topic}
                href={`/${locale}/explore?kind=${topic}`}
                className="hub-topic-card"
              >
                <span className="hub-topic-icon" aria-hidden="true">
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
          <Link href={`/${locale}/explore`} className="hub-topic-card">
            <span className="hub-topic-icon" aria-hidden="true">
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

