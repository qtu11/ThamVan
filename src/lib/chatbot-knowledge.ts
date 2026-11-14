import { experiences, experienceText } from '@/data/experiences';
import { normalizeSearch } from './geo';
import { plans } from './plans';
import type { Heritage, Locale } from './types';
import { textFor } from './types';

export type AssistantActionLink = {
  label: string;
  href: string;
};

export type AssistantPlaceMatch = {
  slug: string;
  name: string;
  region: string;
  kind: string;
  summary: string;
  address?: string;
  href: string;
  mapHref: string;
};

export type AssistantReply = {
  text: string;
  places: AssistantPlaceMatch[];
  links: AssistantActionLink[];
  followUps: string[];
  topicId?: string;
};

export type AssistantCatalogItem = {
  id: string;
  slug: string;
  name: string;
  region: string;
  kind: string;
  address?: string;
  aliases?: string[];
  categoryGroup?: string;
  hasImage?: boolean;
  image?: string | null;
  sourcesCount?: number;
  summary: Record<Locale, string>;
};

const STOP_WORDS = new Set([
  'o',
  'dau',
  'la',
  'gi',
  'cho',
  'hoi',
  'minh',
  'toi',
  'ban',
  'muon',
  'biet',
  'tim',
  've',
  'co',
  'khong',
  'nhu',
  'the',
  'nao',
  'huong',
  'dan',
  'cach',
  'xem',
  'di',
  'den',
  'tai',
  'cua',
  'va',
  'hay',
  'mot',
  'nhung',
  'cac',
  'trong',
  'sai',
  'gon',
  'saigon',
  'tphcm',
  'hcm',
  'where',
  'is',
  'are',
  'what',
  'how',
  'to',
  'the',
  'a',
  'an',
  'in',
  'on',
  'for',
  'of',
  'about',
  'tell',
  'me',
  'find',
  'can',
  'you',
  'show',
]);

const CURATED_INDEX: AssistantCatalogItem[] = [
  {
    id: 'HCM-0041',
    slug: 'hcm-0041',
    name: 'Dinh Độc Lập',
    region: 'Quận 1',
    kind: 'monument',
    address: '135 Nam Kỳ Khởi Nghĩa, Bến Nghé, Quận 1',
    aliases: ['Hội trường Thống Nhất', 'Independence Palace', 'Reunification Palace', '独立宫'],
    hasImage: true,
    sourcesCount: 1,
    summary: {
      vi: 'Công trình kiến trúc hiện đại biểu tượng giữa trục đại lộ Lê Duẩn, nổi bật với rèm hoa đá chữ Cát và khuôn viên rợp bóng cây.',
      en: 'Iconic Vietnamese modernist landmark along Le Duan axis, known for its geometric stone screen facade and shaded grounds.',
      zh: '位于黎笋大道轴线上的现代主义地标建筑，以吉祥竹节石花窗立面和绿荫庭园闻名。',
    },
  },
  {
    id: 'HCM-0025',
    slug: 'hcm-0025',
    name: 'Nhà thờ Đức Bà Sài Gòn',
    region: 'Quận 1',
    kind: 'architecture',
    address: '01 Công xã Paris, Bến Nghé, Quận 1',
    aliases: ['Notre-Dame Cathedral Basilica of Saigon', 'Nhà thờ Chính tòa Đức Bà', '西贡圣母大教堂'],
    hasImage: true,
    sourcesCount: 1,
    summary: {
      vi: 'Vương cung thánh đường gạch trần đỏ hồng từ cuối thế kỷ 19 tại Công trường Công xã Paris, ngay đối diện Bưu điện Trung tâm.',
      en: 'Late 19th-century red terracotta brick basilica at Paris Commune Square, directly facing Saigon Central Post Office.',
      zh: '建于19世纪末的红砖教堂，位于巴黎公社广场，与西贡中心邮局隔街相望。',
    },
  },
  {
    id: 'HCM-0051',
    slug: 'hcm-0051',
    name: 'Bưu điện Trung tâm Sài Gòn',
    region: 'Quận 1',
    kind: 'architecture',
    address: '02 Công xã Paris, Bến Nghé, Quận 1',
    aliases: ['Saigon Central Post Office', 'Bưu điện Thành phố', '西贡中心邮局'],
    hasImage: true,
    sourcesCount: 1,
    summary: {
      vi: 'Kiến trúc vòm sắt cuối thế kỷ 19 kết hợp phù điêu Á-Âu, bản đồ cổ Sài Gòn và dãy quầy gỗ còn hoạt động giữa Quận 1.',
      en: 'Late 19th-century arched hall combining iron framing, historic Saigon wall maps and functioning wooden service counters.',
      zh: '19世纪末铁艺穹顶建筑，室内保留西贡历史地图壁画与仍在使用的木质柜台。',
    },
  },
  {
    id: 'HCM-0049',
    slug: 'hcm-0049',
    name: 'Chợ Bến Thành',
    region: 'Quận 1',
    kind: 'craft',
    address: 'Công trường Quách Thị Trang, Bến Thành, Quận 1',
    aliases: ['Ben Thanh Market', 'Tháp đồng hồ Bến Thành', '滨城市场'],
    hasImage: true,
    sourcesCount: 1,
    summary: {
      vi: 'Ngôi chợ biểu tượng với tháp đồng hồ cửa Nam và nhịp sống giao thương hơn một thế kỷ ở trung tâm Quận 1.',
      en: 'Landmark central market crowned by its south clock tower, anchoring more than a century of Saigon trade.',
      zh: '拥有南门钟楼的西贡地标市集，百年来一直处于第一郡商业与生活中心。',
    },
  },
  {
    id: 'HCM-0066',
    slug: 'hcm-0066',
    name: 'Nhà hát Thành phố Hồ Chí Minh',
    region: 'Quận 1',
    kind: 'architecture',
    address: '07 Công trường Lam Sơn, Bến Nghé, Quận 1',
    aliases: ['Saigon Opera House', 'Nhà hát Lớn', '胡志明市大剧院'],
    hasImage: true,
    sourcesCount: 1,
    summary: {
      vi: 'Công trình mặt tiền vòm cổ điển bên Công trường Lam Sơn, điểm mở đầu quen thuộc của trục đường Đồng Khởi.',
      en: 'Classical stone-arch theatre at Lam Son Square anchoring the Dong Khoi cultural corridor.',
      zh: '坐落于蓝山广场的古典拱门剧院建筑，是同起街文化轴线上的醒目起点。',
    },
  },
  {
    id: 'HCM-0038',
    slug: 'hcm-0038',
    name: 'Bến Nhà Rồng - Bảo tàng Hồ Chí Minh',
    region: 'Quận 4',
    kind: 'monument',
    address: '01 Nguyễn Tất Thành, Quận 4',
    aliases: ['Ben Nha Rong', 'Nha Rong Wharf', '龙屋港'],
    hasImage: true,
    sourcesCount: 1,
    summary: {
      vi: 'Cảng thương cảng thế kỷ 19 ngay ngã ba sông Sài Gòn – Kênh Tẻ, nổi bật với cặp rồng chầu trên mái ngói.',
      en: '19th-century maritime headquarters at the Saigon River confluence, recognizable by its rooftop twin dragons.',
      zh: '位于西贡河交汇处的19世纪港口建筑，以屋脊双龙装饰闻名。',
    },
  },
  {
    id: 'HCM-0057',
    slug: 'hcm-0057',
    name: 'Công viên Bến Bạch Đằng',
    region: 'Quận 1',
    kind: 'nature',
    address: 'Đường Tôn Đức Thắng, Bến Nghé, Quận 1',
    aliases: ['Bến Bạch Đằng', 'Bach Dang Wharf', '白藤码头公园'],
    hasImage: true,
    sourcesCount: 1,
    summary: {
      vi: 'Không gian ven sông Sài Gòn nối từ cột cờ Thủ Ngữ qua bến tàu thủy đến trục phố đi bộ trung tâm.',
      en: 'Riverside promenade linking the Saigon Riverfront pier, historic customs views and central civic plazas.',
      zh: '连接西贡河游船码头与市中心步行轴线的滨江长廊公园。',
    },
  },
  {
    id: 'HCM-0002',
    slug: 'hcm-0002',
    name: 'Chùa Bà Thiên Hậu (Hội quán Tuệ Thành)',
    region: 'Quận 5',
    kind: 'architecture',
    address: '710 Nguyễn Trãi, Phường 11, Quận 5',
    aliases: ['Hội quán Tuệ Thành', 'Thien Hau Temple', 'Cho Lon', 'Chợ Lớn', '天后宫', '穗城会馆'],
    hasImage: true,
    sourcesCount: 1,
    summary: {
      vi: 'Hội quán Quảng Đông cổ kính giữa lòng Chợ Lớn, nổi tiếng với tiểu cảnh gốm men trên mái và những vòng nhang trầm.',
      en: 'Historic Cantonese assembly hall in Cho Lon celebrated for its ceramic roof friezes and hanging incense coils.',
      zh: '堤岸历史悠久的穗城会馆天后庙，以屋脊陶塑装饰和盘香闻名。',
    },
  },
  {
    id: 'HCM-0050',
    slug: 'hcm-0050',
    name: 'Chợ Bình Tây',
    region: 'Quận 6',
    kind: 'craft',
    address: '57A Tháp Mười, Phường 2, Quận 6',
    aliases: ['Binh Tay Market', 'Chợ Lớn Mới', '平西市场'],
    hasImage: true,
    sourcesCount: 1,
    summary: {
      vi: 'Trung tâm đầu mối lâu đời của vùng Chợ Lớn với mái ngói lưu ly, sân giếng trời và tháp đồng hồ bốn mặt.',
      en: 'Cho Lon landmark wholesale market featuring glazed tiled roofs, an open central courtyard and four-faced clock tower.',
      zh: '堤岸地区百年批发市场，融合琉璃瓦顶、中庭天井与四面钟楼。',
    },
  },
  {
    id: 'HCM-0048',
    slug: 'hcm-0048',
    name: 'Bảo tàng Mỹ thuật Thành phố Hồ Chí Minh',
    region: 'Quận 1',
    kind: 'architecture',
    address: '97A Phó Đức Chính, Quận 1',
    aliases: ['Ho Chi Minh City Museum of Fine Arts', '胡志明市美术馆'],
    hasImage: true,
    sourcesCount: 1,
    summary: {
      vi: 'Tòa nhà vàng nghệ thuật đầu thế kỷ 20 với cầu thang gỗ, gạch bông và hệ thống cửa kính màu cổ điển.',
      en: 'Early 20th-century ochre mansion renowned for stained-glass windows, tiled corridors and vintage timber staircases.',
      zh: '20世纪初明黄色历史宅邸，以花窗玻璃、花砖走廊与木楼梯著称。',
    },
  },
  {
    id: 'HCM-0044',
    slug: 'hcm-0044',
    name: 'Lăng Ông Bà Chiểu (Lăng Tả quân Lê Văn Duyệt)',
    region: 'Bình Thạnh',
    kind: 'monument',
    address: '01 Vũ Tùng, Phường 1, Bình Thạnh',
    aliases: ['Lang Ong Ba Chieu', 'Lăng Lê Văn Duyệt', '黎文悦陵'],
    hasImage: true,
    sourcesCount: 1,
    summary: {
      vi: 'Quần thể kiến trúc thờ tự cổ kính vùng Gia Định xưa với cổng tam quan mái ngói và không gian sân vườn tĩnh lặng.',
      en: 'Historic Gia Dinh shrine complex featuring traditional triple-arched gates and serene landscaped courtyards.',
      zh: '嘉定时期的重要历史祠陵建筑群，保留传统三门与宁静园林庭院。',
    },
  },
  {
    id: 'HCM-0028',
    slug: 'hcm-0028',
    name: 'Nhà thờ Tân Định',
    region: 'Quận 3',
    kind: 'architecture',
    address: '289 Hai Bà Trưng, Võ Thị Sáu, Quận 3',
    aliases: ['Tan Dinh Church', 'Pink Church', 'Nhà thờ màu hồng', '新定教堂', '粉红教堂'],
    hasImage: true,
    sourcesCount: 1,
    summary: {
      vi: 'Công trình kiến trúc Gothic – Romanesque mang sắc hồng đặc trưng trên trục đường Hai Bà Trưng, Quận 3.',
      en: 'Distinctive pastel-pink Gothic-Romanesque church standing along Hai Ba Trung Street in District 3.',
      zh: '位于第三郡海巴征街的特色粉色哥特-罗马风教堂建筑。',
    },
  },
  {
    id: 'HCM-0040',
    slug: 'hcm-0040',
    name: 'Khu di tích lịch sử Địa đạo Củ Chi',
    region: 'Củ Chi',
    kind: 'monument',
    address: 'Ấp Phú Hiệp, Phú Mỹ Hưng, Củ Chi',
    aliases: ['Cu Chi Tunnels', 'Bến Dược', 'Bến Đình', '古芝地道'],
    hasImage: true,
    sourcesCount: 1,
    summary: {
      vi: 'Hệ thống công trình ngầm nhiều tầng nổi tiếng vùng đất thép Củ Chi, cách trung tâm thành phố về phía Tây Bắc.',
      en: 'Multi-level subterranean historic complex in Cu Chi to the northwest of Ho Chi Minh City.',
      zh: '位于胡志明市西北古芝县的多层地下历史遗址区。',
    },
  },
  {
    id: 'HCM-0003',
    slug: 'hcm-0003',
    name: 'Chùa Bửu Long',
    region: 'TP Thủ Đức',
    kind: 'architecture',
    address: '81 Nguyễn Xiển, Long Bình, TP Thủ Đức',
    aliases: ['Buu Long Pagoda', 'Thiền viện Bửu Long', '宝龙寺'],
    hasImage: true,
    sourcesCount: 1,
    summary: {
      vi: 'Ngôi chùa nổi bật với bảo tháp Gotama Cetiya trắng vàng hướng về dòng sông Đồng Nai tại TP Thủ Đức.',
      en: 'Hillside pagoda complex famed for its white-and-gold Gotama Cetiya stupa overlooking the Dong Nai River.',
      zh: '位于守德市、俯瞰同奈河的白金色佛塔建筑群。',
    },
  },
];

const DISTRICT_ALIASES: { pattern: string[]; region: string }[] = [
  { pattern: ['quan 1', 'q1', 'district 1', 'ben nghe', 'ben thanh', '第一郡'], region: 'Quận 1' },
  { pattern: ['quan 3', 'q3', 'district 3', 'tan dinh', '第三郡'], region: 'Quận 3' },
  { pattern: ['quan 4', 'q4', 'district 4', 'nha rong', '第四郡'], region: 'Quận 4' },
  { pattern: ['quan 5', 'q5', 'district 5', 'cho lon', 'cholon', '第五郡', '堤岸'], region: 'Quận 5' },
  { pattern: ['quan 6', 'q6', 'district 6', 'binh tay', '第六郡'], region: 'Quận 6' },
  { pattern: ['binh thanh', 'ba chieu', 'gia dinh', '平盛'], region: 'Bình Thạnh' },
  { pattern: ['thu duc', 'q9', 'quan 9', 'q2', 'quan 2', '守德'], region: 'TP Thủ Đức' },
  { pattern: ['cu chi', 'ben duoc', '古芝'], region: 'Củ Chi' },
  { pattern: ['can gio', 'sac', 'thanh an', '芹耶'], region: 'Cần Giờ' },
  { pattern: ['hoc mon', 'ba diem', '旭门'], region: 'Hóc Môn' },
  { pattern: ['binh chanh', 'lang le', '平政'], region: 'Bình Chánh' },
  { pattern: ['nha be', '芽贝'], region: 'Nhà Bè' },
];

type TopicDef = {
  id: string;
  keywords: string[];
  text: Record<Locale, string>;
  links: (locale: Locale) => AssistantActionLink[];
  followUps: Record<Locale, string[]>;
};

const FIELD_GUIDE_TOPICS: TopicDef[] = [
  {
    id: 'challenges-passport',
    keywords: [
      'thu thach',
      'ho chieu',
      'xp',
      'cap do',
      'huy hieu',
      'cau do',
      'quiz',
      'challenge',
      'passport',
      'badge',
      '5 lan',
      '挑战',
      '护照',
      '徽章',
    ],
    text: {
      vi: 'Trong mục Thử thách & Hộ chiếu Di sản, bạn có thể làm bài đố nhanh không cần tài khoản, hoặc đăng nhập để tham gia chuỗi câu hỏi theo từng địa danh, tích lũy XP tăng cấp và mở khóa huy hiệu. Tài khoản Free làm tối đa 5 thử thách/ngày (tính theo giờ Việt Nam); gói Premium (39.000đ/tháng) không giới hạn lượt mỗi ngày.',
      en: 'On the Challenges page, you can warm up with quick trivia anytime, or sign in to answer landmark quizzes, earn XP to level up, and unlock heritage badges. Free accounts allow up to 5 challenges/day (Vietnam time), while Premium (39,000 VND/month) unlocks unlimited daily attempts.',
      zh: '在“挑战与遗产护照”页面，你可以免登录体验快速问答，或登录后参与各地标答题来积累 XP 升级并解锁徽章。Free 账户每日最多 5 次（按越南时间计算），Premium（39,000 越南盾/月）可无限次挑战。',
    },
    links: (locale) => [
      {
        label: locale === 'en' ? 'Open Challenges' : locale === 'zh' ? '打开挑战' : 'Vào Thử thách',
        href: `/${locale}/challenges`,
      },
      {
        label: locale === 'en' ? 'View Passport' : locale === 'zh' ? '查看护照' : 'Xem Hộ chiếu',
        href: `/${locale}/profile`,
      },
      {
        label:
          locale === 'en'
            ? 'Premium 39,000 VND'
            : locale === 'zh'
              ? 'Premium 套餐'
              : 'Xem gói Premium',
        href: `/${locale}/checkout?plan=premium`,
      },
    ],
    followUps: {
      vi: ['Giới hạn 5 thử thách/ngày là sao?', 'Chùa Bà Thiên Hậu ở đâu?', 'Lộ trình Sài Gòn Bên Sông'],
      en: ['How do Story Walks work?', 'Where is Thien Hau Temple?', 'How does Camera Lens work?'],
      zh: ['故事漫步路线有哪些？', '天后宫在哪里？', '拍照识别怎么用？'],
    },
  },
  {
    id: 'camera-lens',
    keywords: [
      'camera',
      'chup anh',
      'nhan dien',
      'lens',
      'may anh',
      'scan',
      'photo',
      'recognize',
      'tai anh',
      '拍照',
      '识别',
      '相机',
    ],
    text: {
      vi: 'THÁM VĂN Lens cho phép chụp trực tiếp hoặc tải ảnh JPEG/PNG/WebP tối đa 5MB. Mẹo để nhận diện chính xác: chụp rõ bảng tên, cổng tam quan, mặt tiền hoặc chi tiết kiến trúc nổi bật; bạn có thể bật tùy chọn gửi kèm GPS hiện tại (chỉ dùng khi đồng ý) để hệ thống đối chiếu khoảng cách, tuyệt đối không suy đoán địa điểm từ IP.',
      en: 'THÁM VĂN Lens accepts live captures or JPEG/PNG/WebP photos up to 5 MB. For best matching, frame signage, gates, facades or distinctive stonework clearly. You can optionally attach verified device GPS with explicit consent to check distance — the system never guesses location from IP.',
      zh: 'THÁM VĂN Lens 支持实时拍摄或上传最大 5 MB 的 JPEG/PNG/WebP 图片。建议清晰拍摄门匾、立面或建筑细节，并可按需授权附上设备 GPS 以核对距离；系统绝不会通过 IP 猜测定位。',
    },
    links: (locale) => [
      {
        label:
          locale === 'en' ? 'Open THÁM VĂN Lens' : locale === 'zh' ? '打开拍照识别' : 'Mở Camera Lens',
        href: `/${locale}/camera`,
      },
      {
        label:
          locale === 'en'
            ? 'Browse Saigon Archive'
            : locale === 'zh'
              ? '浏览档案库'
              : 'Tra danh bạ di sản',
        href: `/${locale}/explore`,
      },
    ],
    followUps: {
      vi: ['Chụp ảnh có lưu dữ liệu không?', 'Xem bản đồ Sài Gòn', 'Thử thách di sản là gì?'],
      en: ['Is my photo stored?', 'Open the Saigon map', 'Show me District 1 landmarks'],
      zh: ['照片会保存吗？', '打开西贡地图', '第一郡有哪些景点？'],
    },
  },
  {
    id: 'map-explorer',
    keywords: [
      'ban do',
      'chi duong',
      'dinh vi',
      'tuyen duong',
      'duong di',
      'map',
      'directions',
      'route',
      'nearby',
      'radius',
      'ban kinh',
      '地图',
      '路线',
      '导航',
    ],
    text: {
      vi: 'Bản đồ Di sản THÁM VĂN hỗ trợ nhiều lớp nền (Đường phố, Vệ tinh, Địa hình, Di sản), lọc theo quận/huyện, loại hình di sản và bán kính quanh vị trí thiết bị. Chọn bất kỳ ghim địa điểm nào để xem tóm tắt lịch sử và vẽ tuyến đường đi trực tiếp.',
      en: 'The Heritage Map includes multiple map layers (Street, Satellite, Topo, Light Heritage), filters by district and category, radius filtering from consented device GPS, and point-to-point route previews.',
      zh: '遗产地图支持多种底图图层，可按郡县与类别筛选、依据授权的设备 GPS 筛选周边距离，并查看路线指引。',
    },
    links: (locale) => [
      {
        label: locale === 'en' ? 'Open Map' : locale === 'zh' ? '打开地图' : 'Mở Bản đồ',
        href: `/${locale}/map`,
      },
      {
        label: locale === 'en' ? 'District 5 / Cho Lon' : locale === 'zh' ? '堤岸第5郡' : 'Điểm nổi bật Quận 5',
        href: `/${locale}/explore?region=${encodeURIComponent('Quận 5')}`,
      },
    ],
    followUps: {
      vi: ['Địa điểm nổi bật ở Chợ Lớn', 'Lộ trình Sài Gòn Bên Sông', 'Cách chụp ảnh nhận diện'],
      en: ['Highlights in Cho Lon', 'Saigon by the river walk', 'How does Family planner work?'],
      zh: ['堤岸有什么好去处？', '西贡河畔漫步路线', '家庭套餐包含什么？'],
    },
  },
  {
    id: 'story-walks',
    keywords: [
      'hanh trinh',
      'story walk',
      'bo huong dan',
      'sai gon ben song',
      'nhung lop ky uc',
      'cho lon cham',
      'di bo',
      'tuyen',
      'experience',
      'walk',
      'guide',
      'tour',
      '漫步',
      '故事路线',
    ],
    text: {
      vi: `Hiện THÁM VĂN có ${experiences.length} lộ trình Story Walk biên tập sâu: (1) "Sài Gòn, phía bên sông" (90 phút, quanh Bến Bạch Đằng & Nhà hát Thành phố), (2) "Những lớp ký ức Sài Gòn" (150 phút, từ Bưu điện Trung tâm qua Chợ Bến Thành tới Bảo tàng Mỹ thuật), và (3) "Chợ Lớn, chậm một nhịp" (120 phút, từ Chợ Bình Tây đến Chùa Bà Thiên Hậu). Mỗi lộ trình đều mở miễn phí trạm đầu để bạn đọc thử.`,
      en: `THÁM VĂN features ${experiences.length} editorial Story Walks: (1) "Saigon, by the river" (90 min around Bach Dang Wharf & Opera House), (2) "Layers of Saigon" (150 min from Central Post Office to Ben Thanh & Fine Arts Museum), and (3) "A slower day in Cho Lon" (120 min linking Binh Tay Market and Thien Hau Temple). Every walk offers a free Stop 1 preview.`,
      zh: `THÁM VĂN 收录 ${experiences.length} 条深度城市故事漫步路线：《西贡，漫步河畔》（90 分钟）、《西贡的层层记忆》（150 分钟）、《堤岸，慢一点》（120 分钟）。每条路线的第一站均可免费预览。`,
    },
    links: (locale) => [
      ...experiences.map((exp) => ({
        label: `${experienceText(exp.title, locale)} (${exp.minutes}m)`,
        href: `/${locale}/experiences/${exp.slug}`,
      })),
    ],
    followUps: {
      vi: ['Gói Premium và Family khác gì nhau?', 'Dinh Độc Lập ở đâu?', 'Cách làm thử thách nhận XP'],
      en: ['Premium vs Family plans?', 'Where is Binh Tay Market?', 'Open the heritage map'],
      zh: ['Premium 和 Family 有何区别？', '平西市场在哪里？', '如何参加挑战？'],
    },
  },
  {
    id: 'membership-planner',
    keywords: [
      'goi',
      'nang cap',
      'premium',
      'family',
      'gia',
      'phi',
      'thanh toan',
      'payos',
      'sepay',
      'vietqr',
      'ai planner',
      'lich trinh',
      'upgrade',
      'membership',
      'plan',
      'pricing',
      'itinerary',
      '套餐',
      '会员',
      '行程',
    ],
    text: {
      vi: `THÁM VĂN có 3 mức gói minh bạch (không tự gia hạn): Free (${plans.free.amount.toLocaleString('vi-VN')}đ — khám phá bản đồ, lens, 5 thử thách/ngày), Premium (39.000đ/tháng — không giới hạn thử thách + mở toàn bộ Story Walks), và Family (89.000đ/tháng — 4 thành viên riêng tư + AI Lập lịch trình 1–7 ngày theo khu vực trong Dashboard).`,
      en: `THÁM VĂN offers 3 transparent monthly tiers with no auto-renewal: Free (0 VND — map, Lens, 5 daily challenges), Premium (39,000 VND/month — unlimited challenges + all curated Story Walks), and Family (89,000 VND/month — up to 4 private profiles + 1–7 day AI Itinerary Planner in Dashboard).`,
      zh: `THÁM VĂN 提供三档透明月度套餐（不自动续费）：Free（0 越南盾）、Premium（39,000 越南盾/月，无限挑战与全部故事路线）、Family（89,000 越南盾/月，支持 4 位独立成员及 1–7 天 AI 行程规划）。`,
    },
    links: (locale) => [
      {
        label: locale === 'en' ? 'Premium (39,000 VND)' : locale === 'zh' ? 'Premium 套餐' : 'Gói Premium',
        href: `/${locale}/checkout?plan=premium`,
      },
      {
        label: locale === 'en' ? 'Family + AI Planner' : locale === 'zh' ? 'Family + AI 规划' : 'Gói Family (AI Planner)',
        href: `/${locale}/checkout?plan=family`,
      },
      {
        label: locale === 'en' ? 'Open Planner' : locale === 'zh' ? '打开行程规划' : 'Mở AI Planner',
        href: `/${locale}/dashboard?tab=planner`,
      },
    ],
    followUps: {
      vi: ['Có gói cho trường học hay khách sạn không?', 'Xem các lộ trình Story Walk', 'Cách làm thử thách mỗi ngày'],
      en: ['Do you offer school or hotel plans?', 'Show me all Story Walks', 'Open Challenges'],
      zh: ['支持学校或酒店合作吗？', '查看精选漫步路线', '进入每日挑战'],
    },
  },
  {
    id: 'partners-schools',
    keywords: [
      'truong hoc',
      'khach san',
      'doanh nghiep',
      'doi tac',
      'hop tac',
      'to chuc',
      'doan',
      'partner',
      'school',
      'hotel',
      'team',
      'corporate',
      'b2b',
      '合作',
      '学校',
      '酒店',
    ],
    text: {
      vi: 'Trang Đối tác dành cho trường học, khách sạn và doanh nghiệp muốn tổ chức hành trình di sản theo nhóm, tích hợp bảng thử thách riêng hoặc tải mẫu đề bài hợp tác. Bạn có thể gửi yêu cầu trực tuyến hoặc kích hoạt chế độ xem Dashboard đối tác ngay tại trang Partners.',
      en: 'Our Partners desk supports schools, hotels, and teams designing bespoke cultural field trips or private group challenges. You can submit an inquiry brief or preview partner dashboards directly on the Partners page.',
      zh: '合作伙伴页面面向学校、酒店与企业团队，支持定制文化探索活动或团体挑战。可直接在合作页面提交需求或预览团队控制台。',
    },
    links: (locale) => [
      {
        label: locale === 'en' ? 'Open Partners Page' : locale === 'zh' ? '打开合作页面' : 'Vào trang Đối tác',
        href: `/${locale}/partners`,
      },
      {
        label: locale === 'en' ? 'Explore Story Walks' : locale === 'zh' ? '查看精选路线' : 'Xem Story Walks',
        href: `/${locale}/experiences`,
      },
    ],
    followUps: {
      vi: ['Giá gói Family là bao nhiêu?', 'Lộ trình Ở Chợ Lớn', 'Chính sách quyền riêng tư'],
      en: ['How much is Family plan?', 'Show me Cho Lon walk', 'Privacy and terms'],
      zh: ['Family 套餐价格是多少？', '堤岸漫步路线', '隐私与条款'],
    },
  },
  {
    id: 'privacy-terms',
    keywords: [
      'dieu khoan',
      'quyen rieng tu',
      'bao mat',
      'chinh sach',
      'xoa tai khoan',
      'xuat du lieu',
      'terms',
      'privacy',
      'policy',
      'gdpr',
      'consent',
      '隐私',
      '条款',
      '政策',
    ],
    text: {
      vi: 'THÁM VĂN áp dụng nguyên tắc đồng thuận rõ ràng trước khi xử lý ảnh chụp hoặc GPS; không lưu số thẻ/CVV và bạn có thể xem Chính sách Quyền riêng tư, Điều khoản sử dụng hoặc xuất/xóa dữ liệu cá nhân trực tiếp trong mục Hồ sơ.',
      en: 'THÁM VĂN asks explicit consent before analyzing photos or attaching GPS, never stores card/CVV details, and provides Privacy Policy, Terms of Use, and data export/deletion inside your Profile.',
      zh: 'THÁM VĂN 在分析照片或使用定位前均需明确同意，不存储银行卡信息，并可在个人资料页查看政策条款或导出/删除账户数据。',
    },
    links: (locale) => [
      {
        label: locale === 'en' ? 'Privacy Policy' : locale === 'zh' ? '隐私政策' : 'Quyền riêng tư',
        href: `/${locale}/privacy`,
      },
      {
        label: locale === 'en' ? 'Terms of Use' : locale === 'zh' ? '使用条款' : 'Điều khoản',
        href: `/${locale}/terms`,
      },
      {
        label: locale === 'en' ? 'Profile & Data' : locale === 'zh' ? '个人数据设置' : 'Hồ sơ & Dữ liệu',
        href: `/${locale}/profile`,
      },
    ],
    followUps: {
      vi: ['Chụp ảnh nhận diện di sản', 'Xem bản đồ Sài Gòn', 'Thử thách nhận huy hiệu'],
      en: ['Open Camera Lens', 'Open Saigon Map', 'Explore Challenges'],
      zh: ['拍照识别遗产', '打开西贡地图', '进入每日挑战'],
    },
  },
];

export function heritageToAssistantItem(entry: Heritage): AssistantCatalogItem {
  return {
    id: entry.id,
    slug: entry.slug,
    name: entry.name,
    region: entry.region,
    kind: entry.kind,
    address: entry.address,
    aliases: entry.aliases,
    categoryGroup: entry.categoryGroup,
    hasImage: entry.hasImage,
    image: entry.image,
    sourcesCount: entry.sources.length,
    summary: {
      vi: textFor(entry.translations, 'vi').summary,
      en: textFor(entry.translations, 'en').summary,
      zh: textFor(entry.translations, 'zh').summary,
    },
  };
}

export function defaultQuickPrompts(locale: Locale): string[] {
  if (locale === 'en') {
    return [
      'Thien Hau Temple & Cho Lon',
      'Saigon by the river walk',
      'How does Camera Lens work?',
      'Challenges & 5/day limit',
      'Family plan & AI Planner',
    ];
  }
  if (locale === 'zh') {
    return [
      '天后宫与堤岸有什么？',
      '西贡河畔故事漫步路线',
      '如何使用拍照识别？',
      '每日挑战与 XP 徽章',
      'Family 套餐与 AI 行程',
    ];
  }
  return [
    'Chùa Bà Thiên Hậu & Chợ Lớn',
    'Lộ trình Sài Gòn Bên Sông',
    'Mẹo chụp ảnh nhận diện',
    'Hộ chiếu & 5 thử thách/ngày',
    'Gói Family & AI Planner',
  ];
}

function tokenizeMeaningful(raw: string): string[] {
  const norm = normalizeSearch(raw)
    .replace(/(在哪里|在哪儿|在哪|怎么走|怎么去|怎么用|是什么|有什么|有哪些|请问|吗|呢)/g, ' ')
    .replace(/[^a-z0-9\u4e00-\u9fff\s]/g, ' ')
    .trim();
  if (!norm) return [];
  const all = norm.split(/\s+/).filter(Boolean);
  const meaningful = all.filter((token) => !STOP_WORDS.has(token) && token.length >= 1);
  return meaningful.length ? meaningful : all;
}

function detectDistrictFilter(normQuery: string): string | null {
  for (const entry of DISTRICT_ALIASES) {
    if (entry.pattern.some((p) => normQuery.includes(normalizeSearch(p)))) {
      return entry.region;
    }
  }
  return null;
}

function scorePlace(
  item: AssistantCatalogItem,
  normQuery: string,
  tokens: string[],
  districtHint: string | null,
  locale: Locale,
) {
  const nameNorm = normalizeSearch(item.name);
  const aliasList = (item.aliases || []).map(normalizeSearch).filter(Boolean);
  const aliasesNorm = aliasList.join(' ');
  const regionNorm = normalizeSearch(item.region);
  const addressNorm = normalizeSearch(item.address || '');
  const summaryNorm = normalizeSearch(item.summary[locale] || item.summary.vi);

  let score = 0;

  if (tokens.length > 0 && nameNorm.includes(tokens.join(' '))) score += 120;
  if (normQuery.length >= 3 && nameNorm.includes(normQuery)) score += 140;
  if (nameNorm.length >= 2 && normQuery.includes(nameNorm)) score += 130;
  if (normQuery.length >= 3 && aliasesNorm.includes(normQuery)) score += 105;
  for (const alias of aliasList) {
    if (alias.length >= 2 && normQuery.includes(alias)) score += 115;
  }

  let matchedTokens = 0;
  for (const token of tokens) {
    if (token.length < 2 && !/[\u4e00-\u9fff]/.test(token)) continue;
    let tokenHit = false;
    if (nameNorm.includes(token)) {
      score += 36;
      tokenHit = true;
    } else if (aliasesNorm.includes(token)) {
      score += 28;
      tokenHit = true;
    } else if (regionNorm.includes(token) || addressNorm.includes(token)) {
      score += 18;
      tokenHit = true;
    } else if (summaryNorm.includes(token)) {
      score += 10;
      tokenHit = true;
    }
    if (tokenHit) matchedTokens++;
  }

  if (tokens.length >= 2 && matchedTokens === tokens.length) score += 35;

  if (districtHint && item.region === districtHint) {
    score += tokens.length <= 2 ? 42 : 16;
  }

  // Prefer documented/curated items on ties without fabricating scores out of thin air
  if (score > 0) {
    if (item.hasImage || item.image) score += 6;
    if ((item.sourcesCount ?? 0) > 0) score += 4;
    if (item.id.startsWith('HCM-00')) score += 5;
  }

  return score;
}

function toPlaceMatch(item: AssistantCatalogItem, locale: Locale): AssistantPlaceMatch {
  return {
    slug: item.slug,
    name: item.name,
    region: item.region,
    kind: item.kind,
    address: item.address,
    summary: (item.summary[locale] || item.summary.vi).slice(0, 170),
    href: `/${locale}/explore/${item.slug}`,
    mapHref: `/${locale}/map?focus=${encodeURIComponent(item.slug)}`,
  };
}

function scoreTopic(topic: TopicDef, normQuery: string, rawLower: string, tokens: string[]) {
  let score = 0;
  for (const kw of topic.keywords) {
    const normKw = normalizeSearch(kw);
    if (normQuery.includes(normKw) || rawLower.includes(kw.toLowerCase())) {
      score += normKw.includes(' ') ? 45 : 28;
    } else if (tokens.some((tok) => tok.length >= 3 && normKw.includes(tok))) {
      score += 12;
    }
  }
  return score;
}

/**
 * Pure field-guide search over Saigon landmarks, Story Walks, and workflow guides.
 * Client uses CURATED_INDEX cleanly (~5KB); /api/assistant passes the full server catalog.
 */
export function answerAssistantQuery(
  rawQuery: string,
  locale: Locale,
  catalogItems?: AssistantCatalogItem[],
): AssistantReply {
  const query = rawQuery.trim();
  const normQuery = normalizeSearch(query);
  const rawLower = query.toLowerCase();
  const tokens = tokenizeMeaningful(query);
  const districtHint = detectDistrictFilter(normQuery);
  const sourceItems = catalogItems && catalogItems.length > 0 ? catalogItems : CURATED_INDEX;

  const rankedPlaces = sourceItems
    .map((item) => ({
      item,
      score: scorePlace(item, normQuery, tokens, districtHint, locale),
    }))
    .filter((entry) => entry.score >= 28)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const rankedTopics = FIELD_GUIDE_TOPICS.map((topic) => ({
    topic,
    score: scoreTopic(topic, normQuery, rawLower, tokens),
  }))
    .filter((entry) => entry.score >= 24)
    .sort((a, b) => b.score - a.score);

  const topPlaceScore = rankedPlaces[0]?.score ?? 0;
  const topTopic = rankedTopics[0];

  // Prioritize rich place card response when user clearly asks for a site/district
  if (rankedPlaces.length > 0 && (!topTopic || topPlaceScore >= topTopic.score * 1.4 || districtHint)) {
    const places = rankedPlaces.map((entry) => toPlaceMatch(entry.item, locale));
    const names = places.map((p) => `${p.name} (${p.region})`).join(', ');
    const lead = places[0];
    const extraTopicNote =
      topTopic && topTopic.score >= 30 ? ` ${topTopic.topic.text[locale]}` : '';
    const intro =
      locale === 'en'
        ? districtHint && rankedPlaces.length > 1
          ? `Here are documented highlights in ${districtHint}: ${names}. Select any card below to inspect archival notes or jump directly to the map pin.`
          : `From the THÁM VĂN archive, ${lead.name} (${lead.region}) matches your query: ${lead.summary}`
        : locale === 'zh'
          ? districtHint && rankedPlaces.length > 1
            ? `为你找到 ${districtHint} 的收录推荐：${names}。点击下方卡片可直接阅读故事或在地图中定位。`
            : `在 THÁM VĂN 档案中为你找到 ${lead.name}（${lead.region}）：${lead.summary}`
          : districtHint && rankedPlaces.length > 1
            ? `Trong danh bạ ${districtHint}, bạn có thể ghé ${names}. Bấm vào từng thẻ bên dưới để đọc tư liệu di sản hoặc mở ghim chỉ đường trên bản đồ.`
            : `Trong sổ tay THÁM VĂN, ${lead.name} (${lead.region}) khớp nhất với câu hỏi của bạn: ${lead.summary}`;

    const districtExploreLink: AssistantActionLink = districtHint
      ? {
          label:
            locale === 'en'
              ? `All in ${districtHint}`
              : locale === 'zh'
                ? `查看 ${districtHint} 全部`
                : `Tất cả điểm tại ${districtHint}`,
          href: `/${locale}/explore?region=${encodeURIComponent(districtHint)}`,
        }
      : {
          label:
            locale === 'en'
              ? 'Browse full archive'
              : locale === 'zh'
                ? '浏览全部档案'
                : 'Xem toàn bộ danh bạ',
          href: `/${locale}/explore`,
        };

    return {
      text: `${intro}${extraTopicNote}`,
      places,
      links: [
        districtExploreLink,
        ...(topTopic ? topTopic.topic.links(locale).slice(0, 2) : [
          {
            label:
              locale === 'en'
                ? 'Open Map Explorer'
                : locale === 'zh'
                  ? '打开地图'
                  : 'Mở Bản đồ Di sản',
            href: `/${locale}/map?focus=${encodeURIComponent(lead.slug)}`,
          },
        ]),
      ],
      followUps:
        topTopic?.topic.followUps[locale] ?? defaultQuickPrompts(locale).slice(0, 3),
      topicId: topTopic?.topic.id ?? 'place-match',
    };
  }

  // Otherwise answer with the matching Field-Guide topic
  if (topTopic) {
    return {
      text: topTopic.topic.text[locale],
      places: rankedPlaces.slice(0, 2).map((entry) => toPlaceMatch(entry.item, locale)),
      links: topTopic.topic.links(locale),
      followUps: topTopic.topic.followUps[locale],
      topicId: topTopic.topic.id,
    };
  }

  // Helpful editorial fallback — never a dead-end!
  const fallbackSamples = CURATED_INDEX.slice(0, 2).map((item) => toPlaceMatch(item, locale));
  return {
    text:
      locale === 'en'
        ? 'I searched our Saigon archive and editorial desk without an exact match yet. Try a landmark name (e.g. "Bưu điện", "Chùa Bà Thiên Hậu", "Nhà thờ Tân Định"), a district ("Quận 5", "Thủ Đức"), or ask about Story Walks, Challenges, Camera Lens or Family Planner.'
        : locale === 'zh'
          ? '暂未匹配到具体条目。你可以输入西贡地标名称（如“天后宫”“平西市场”“粉红教堂”）、郡县名，或询问故事漫步、拍照识别、每日挑战与 Family 套餐。'
          : 'Mình chưa thấy từ khóa trùng khớp ngay trong câu hỏi. Bạn thử gõ tên địa danh Sài Gòn (ví dụ "Bưu điện", "Chợ Lớn", "Chùa Bà Thiên Hậu", "Nhà thờ Tân Định"), tên quận, hoặc hỏi về Story Walks, Camera Lens, Hộ chiếu thử thách nhé!',
    places: fallbackSamples,
    links: [
      {
        label: locale === 'en' ? 'Explore Saigon' : locale === 'zh' ? '探索西贡' : 'Khám phá địa điểm',
        href: `/${locale}/explore`,
      },
      {
        label: locale === 'en' ? 'Story Walks' : locale === 'zh' ? '故事漫步' : 'Story Walks',
        href: `/${locale}/experiences`,
      },
      {
        label: locale === 'en' ? 'Challenges' : locale === 'zh' ? '挑战' : 'Thử thách',
        href: `/${locale}/challenges`,
      },
    ],
    followUps: defaultQuickPrompts(locale).slice(0, 3),
  };
}
