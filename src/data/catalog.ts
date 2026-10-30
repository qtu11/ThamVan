import type { Heritage, Challenge } from '@/lib/types';
import { hcmPlaces } from './hcm-places';

/** Fallback starter khi danh bạ HCM trống — các địa danh biểu tượng trong TP.HCM. */
const STARTER_IDS = [
  'HCM-0041', // Dinh Độc Lập
  'HCM-0025', // Nhà thờ Đức Bà
  'HCM-0049', // Chợ Bến Thành
  'HCM-0051', // Bưu điện Trung tâm
  'HCM-0040', // Địa đạo Củ Chi
  'HCM-0066', // Nhà hát Thành phố
  'HCM-0038', // Bến Nhà Rồng
  'HCM-0002', // Chùa Bà Thiên Hậu
  'HCM-0048', // Bảo tàng Mỹ thuật TP.HCM
  'HCM-0050', // Chợ Bình Tây
  'HCM-0044', // Lăng Ông Bà Chiểu
  'HCM-0028', // Nhà thờ Tân Định
  'HCM-0003', // Chùa Bửu Long
] as const;

export const catalog: Heritage[] = STARTER_IDS.map((id) => {
  const place = hcmPlaces.find((p) => p.id === id);
  if (!place) throw new Error(`Missing HCM starter place: ${id}`);
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
    badge: 'Kiến trúc Hiện đại',
    status: 'published',
    expires_at: null,
    translations: {
      vi: {
        title: 'Giải mã mặt đứng Dinh Độc Lập',
        description:
          'Khám phá tuyệt tác kiến trúc hiện đại Việt Nam với rèm hoa đá chữ Cát và trục đại lộ Lê Duẩn.',
        question: 'Kiến trúc sư nào thiết kế công trình Dinh Độc Lập hiện tại?',
        options: ['Ngô Viết Thụ', 'Nguyễn Công Trứ', 'Huỳnh Tấn Phát', 'Lê Văn Tám'],
      },
      en: {
        title: 'Decoding Independence Palace',
        description:
          'Explore a masterpiece of Vietnamese modernist architecture and its iconic stone screen facade.',
        question: 'Which architect designed the present Independence Palace?',
        options: ['Ngô Viết Thụ', 'Nguyễn Công Trứ', 'Huỳnh Tấn Phát', 'Lê Văn Tám'],
      },
      zh: {
        title: '读懂独立宫立面密码',
        description: '探索越南现代主义建筑杰作及其象征吉祥的竹节石花窗立面。',
        question: '现独立宫由哪位建筑师设计？',
        options: ['吴越树', '阮公著', '黄晋发', '黎文心'],
      },
    },
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    entry_id: 'HCM-0025',
    points: 20,
    badge: 'Trái tim Quận 1',
    status: 'published',
    expires_at: null,
    translations: {
      vi: {
        title: 'Sắc gạch trần Nhà thờ Đức Bà',
        description:
          'Tìm hiểu bí mật vật liệu gạch nung hồng cam giữ màu hơn một thế kỷ giữa trung tâm Quận 1.',
        question: 'Nhà thờ Đức Bà Sài Gòn nằm ở khu vực trung tâm nào của thành phố?',
        options: ['Quận 1', 'Quận 5', 'Củ Chi', 'TP Thủ Đức'],
      },
      en: {
        title: 'Brickwork of Notre-Dame Cathedral',
        description:
          'Uncover the story of the Marseille terracotta bricks that have defined central Saigon since 1880.',
        question: 'In which district is Saigon Notre-Dame Cathedral located?',
        options: ['District 1', 'District 5', 'Củ Chi', 'Thủ Đức City'],
      },
      zh: {
        title: '西贡圣母大教堂红砖之谜',
        description: '了解自1880年以来定义西贡市中心的马赛红砖建筑传奇。',
        question: '西贡圣母大教堂位于哪个区域？',
        options: ['第一郡', '第五郡', '古芝', '守德市'],
      },
    },
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    entry_id: 'HCM-0049',
    points: 25,
    badge: 'Thương cảng Sài Gòn',
    status: 'published',
    expires_at: null,
    translations: {
      vi: {
        title: 'Tháp đồng hồ & phù điêu Chợ Bến Thành',
        description:
          'Quan sát bốn cổng chính của ngôi chợ trăm tuổi và tháp đồng hồ quen thuộc ở cửa Nam.',
        question: 'Chi tiết kiến trúc biểu tượng nổi bật nhất tại cửa Nam Chợ Bến Thành là gì?',
        options: [
          'Tháp đồng hồ trên cổng chính',
          'Cổng vòm đá hoa cương bảy nhịp',
          'Tháp chuông đồng cao 45 mét',
          'Mái đình cong lợp ngói âm dương',
        ],
      },
      en: {
        title: 'Clock Tower of Bến Thành Market',
        description:
          'Observe the four main gates of the century-old market and its familiar South Gate clock tower.',
        question: 'What is the iconic architectural feature above the South Gate of Bến Thành Market?',
        options: [
          'A clock tower above the main gate',
          'Seven-arch granite colonnade',
          '45-meter bronze bell tower',
          'Curved yin-yang tiled pavilion roof',
        ],
      },
      zh: {
        title: '滨城市场钟楼与陶艺浮雕',
        description: '细看百年市场的四座主门与南门钟楼。',
        question: '滨城市场南门最著名的标志性建筑细节是什么？',
        options: [
          '主门上方的钟楼',
          '七拱花岗岩柱廊',
          '45米青铜钟塔',
          '阴阳瓦弯脊亭顶',
        ],
      },
    },
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    entry_id: 'HCM-0051',
    points: 25,
    badge: 'Dấu ấn Vòm Sắt',
    status: 'published',
    expires_at: null,
    translations: {
      vi: {
        title: 'Mái vòm sắt Bưu điện Trung tâm Sài Gòn',
        description:
          'Bước vào đại sảnh vòm thép xanh lục và ngắm hai bức bản đồ lịch sử vẽ tay treo hai bên đại sảnh.',
        question: 'Không gian đại sảnh Bưu điện Trung tâm Sài Gòn nổi bật với kết cấu đặc trưng nào?',
        options: [
          'Hệ vòm khung sắt uốn cong kết hợp hai bản đồ lịch sử vẽ tay',
          'Hệ cột gỗ lim nguyên khối chạm tứ linh',
          'Mái kính kim tự tháp bốn mặt hiện đại',
          'Hành lang đá cẩm thạch trắng ba tầng',
        ],
      },
      en: {
        title: 'Iron Vault of Saigon Central Post Office',
        description:
          'Step beneath the green wrought-iron vault and examine the two hand-painted historical maps.',
        question: 'What defines the main concourse of the Saigon Central Post Office?',
        options: [
          'Curved wrought-iron vaulted ribs and two hand-painted historical wall maps',
          'Carved ironwood pillars with four sacred creatures',
          'Modern four-sided glass pyramid skylight',
          'Three-story white marble colonnade',
        ],
      },
      zh: {
        title: '西贡中央邮局铁艺穹顶',
        description: '步入绿色锻铁拱顶大厅，欣赏两幅手绘历史地图。',
        question: '西贡中央邮局大厅最具代表性的空间结构是什么？',
        options: [
          '弧形锻铁拱肋结构与两幅手绘历史壁画地图',
          '雕有四灵图案的整木铁力木柱',
          '现代四面玻璃金字塔天窗',
          '三层白色大理石回廊',
        ],
      },
    },
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    entry_id: 'HCM-0066',
    points: 30,
    badge: 'Khán phòng Trăm Năm',
    status: 'published',
    expires_at: null,
    translations: {
      vi: {
        title: 'Nghệ thuật điêu khắc Nhà hát Thành phố',
        description:
          'Đọc các họa tiết phù điêu âm nhạc và tượng nữ thần nâng đỡ vòm cổng Nhà hát khánh thành năm 1900.',
        question: 'Nhà hát Thành phố Hồ Chí Minh được xây dựng theo phong cách kiến trúc nào?',
        options: [
          'Phong cách Beaux-Arts / Tân cổ điển Pháp cuối thế kỷ XIX',
          'Phong cách Brutalism bê tông trần thập niên 1970',
          'Kiến trúc Gothic tháp nhọn thời Trung cổ',
          'Kiến trúc nhà rường truyền thống miền Trung',
        ],
      },
      en: {
        title: 'Sculptural Facade of the Saigon Opera House',
        description:
          'Examine the musical reliefs and caryatid statues framing the 1900 Municipal Theatre entrance.',
        question: 'In which architectural style was the Saigon Opera House built?',
        options: [
          'Late 19th-century French Beaux-Arts / Neoclassical style',
          '1970s exposed-concrete Brutalism',
          'Medieval pointed-spire Gothic architecture',
          'Central Vietnamese traditional timber beam house',
        ],
      },
      zh: {
        title: '胡志明市大剧院雕塑立面',
        description: '细读1900年落成的市政剧院门廊上的音乐浮雕与女神柱像。',
        question: '胡志明市大剧院采用哪种主要建筑风格建造？',
        options: [
          '19世纪末法国学院派（Beaux-Arts）/ 新古典主义风格',
          '1970年代清水混凝土粗野主义',
          '中世纪哥特式尖塔建筑',
          '越南中部传统穿斗式木构建筑',
        ],
      },
    },
  },
  {
    id: '10000000-0000-4000-8000-000000000006',
    entry_id: 'HCM-0038',
    points: 30,
    badge: 'Bến Cảng Lịch Sử',
    status: 'published',
    expires_at: null,
    translations: {
      vi: {
        title: 'Đôi rồng gốm trên mái Bến Nhà Rồng',
        description:
          'Nhìn lên đỉnh mái ngói tòa thương cảng bên ngã ba sông Sài Gòn – Kênh Tẻ để hiểu nguồn gốc tên gọi Nhà Rồng.',
        question: 'Vì sao tòa nhà trụ sở thương cảng xây năm 1863 bên sông Sài Gòn được gọi là Nhà Rồng?',
        options: [
          'Trên đỉnh mái ngói gắn đôi rồng gốm men xanh chầu mặt trăng',
          'Tòa nhà có mặt bằng uốn lượn hình rồng dài 300 mét',
          'Nằm trên cù lao Rồng giữa dòng sông Sài Gòn',
          'Được sơn phủ toàn bộ bằng màu vàng hoàng gia',
        ],
      },
      en: {
        title: 'Ceramic Dragons of Nhà Rồng Wharf',
        description:
          'Look up at the roof ridge beside the Saigon River confluence to see why citizens named it Dragon House.',
        question: 'Why did locals call the 1863 riverside maritime headquarters Nhà Rồng (Dragon House)?',
        options: [
          'Its roof ridge is crowned with two glazed ceramic dragons flanking the moon',
          'Its floor plan curves like a 300-meter dragon',
          'It stands on Dragon Islet in the middle of the Saigon River',
          'It was painted entirely in imperial gold',
        ],
      },
      zh: {
        title: '龙屋码头屋脊双龙',
        description: '仰望西贡河交汇处的老商港屋顶，探寻“龙屋”名称的由来。',
        question: '为什么这座建于1863年的河畔航运大楼被称为“龙屋”（Nhà Rồng）？',
        options: [
          '屋脊顶端饰有双龙朝月的青釉陶瓷雕塑',
          '建筑平面呈300米长的盘龙造型',
          '坐落于西贡河心的龙洲岛上',
          '整栋建筑外墙涂满皇家金色',
        ],
      },
    },
  },
  {
    id: '10000000-0000-4000-8000-000000000007',
    entry_id: 'HCM-0002',
    points: 30,
    badge: 'Di sản Chợ Lớn',
    status: 'published',
    expires_at: null,
    translations: {
      vi: {
        title: 'Quần thể gốm cổ Chùa Bà Thiên Hậu',
        description:
          'Khám phá Hội quán Tuệ Thành hơn 260 năm tuổi trên đường Nguyễn Trãi với sân thiên tỉnh và tiểu tượng gốm.',
        question: 'Điểm đặc sắc nhất trên diềm mái và nóc Hội quán Tuệ Thành (Chùa Bà Thiên Hậu) là gì?',
        options: [
          'Quần thể phù điêu và tiểu tượng gốm Cây Mai – Thạch Loan diễn tích cổ',
          'Tháp chuông đá xanh nguyên khối cao 7 tầng',
          'Mái vòm kính màu ghép hình hoa sen',
          'Hệ thống cầu đá bắc qua hồ bán nguyệt trên mái',
        ],
      },
      en: {
        title: 'Ceramic Friezes of Thiên Hậu Temple',
        description:
          'Explore the 260-year-old Tuệ Thành Guildhall in Chợ Lớn with its skywell courtyard and rooftop ceramics.',
        question: 'What is the most distinctive artistic feature along the rooflines of Thiên Hậu Temple?',
        options: [
          'Intricate Cây Mai and Shiwan glazed ceramic dioramas depicting classical legends',
          'A seven-story monolithic bluestone bell tower',
          'A stained-glass lotus dome',
          'Stone bridges spanning a rooftop crescent pond',
        ],
      },
      zh: {
        title: '天后宫（穗城会馆）古陶群雕',
        description: '探索堤岸逾260年历史的穗城会馆天井与屋脊陶塑艺术。',
        question: '天后宫（穗城会馆）屋脊与檐口最突出的艺术特色是什么？',
        options: [
          '展现传统戏曲典故的梅树窑与石湾琉璃陶塑群',
          '七层整石青石钟塔',
          '莲花图案彩色玻璃穹顶',
          '屋顶半月池上的石桥结构',
        ],
      },
    },
  },
  {
    id: '10000000-0000-4000-8000-000000000008',
    entry_id: 'HCM-0048',
    points: 25,
    badge: 'Mỹ thuật Đông Dương',
    status: 'published',
    expires_at: null,
    translations: {
      vi: {
        title: 'Dinh thự Chú Hỏa & Bảo tàng Mỹ thuật',
        description:
          'Chiêm ngưỡng sự giao thoa kiến trúc Á – Âu, gạch bông cổ và thang máy gỗ đầu tiên của Sài Gòn.',
        question: 'Tòa nhà chính của Bảo tàng Mỹ thuật TP.HCM trước đây gắn liền với gia tộc thương nhân nào?',
        options: [
          'Gia tộc Chú Hỏa (Hứa Bổn Hòa)',
          'Gia tộc Bạch Thái Bưởi',
          'Gia tộc Công tử Bạc Liêu',
          'Gia tộc Trịnh Hoài Đức',
        ],
      },
      en: {
        title: 'Hứa Bổn Hòa Mansion & Fine Arts Museum',
        description:
          'Admire the East-meets-West architecture, vintage encaustic tiles, and Saigon’s earliest wooden elevator.',
        question: 'With which merchant family was the Fine Arts Museum building originally associated?',
        options: [
          'The Chú Hỏa (Hứa Bổn Hòa) family',
          'The Bạch Thái Bưởi family',
          'The Bạc Liêu Prince family',
          'The Trịnh Hoài Đức family',
        ],
      },
      zh: {
        title: '火叔豪宅与胡志明市美术馆',
        description: '欣赏中西合璧的建筑美学、复古花砖与西贡最早的木制电梯。',
        question: '胡志明市美术馆主楼原是哪位著名华商家族的府邸？',
        options: [
          '火叔（许本和）家族',
          '白泰贞家族',
          '薄寮公子家族',
          '郑怀德家族',
        ],
      },
    },
  },
  {
    id: '10000000-0000-4000-8000-000000000009',
    entry_id: 'HCM-0050',
    points: 25,
    badge: 'Nhịp sống Bình Tây',
    status: 'published',
    expires_at: null,
    translations: {
      vi: {
        title: 'Mái ngói bát giác Chợ Bình Tây',
        description:
          'Đi giữa khu chợ đầu mối sầm uất bậc nhất Chợ Lớn với tháp đồng hồ mái chồng diêm và sân vườn trung tâm.',
        question: 'Ai là thương nhân đã hiến tặng kinh phí xây dựng Chợ Bình Tây vào thập niên 1920?',
        options: [
          'Thương nhân Quách Đàm (Thông Hiệp)',
          'Thương nhân Lý Văn Phức',
          'Thương nhân Trương Vĩnh Ký',
          'Thương nhân Nguyễn Hữu Cảnh',
        ],
      },
      en: {
        title: 'Octagonal Roofs of Bình Tây Market',
        description:
          'Walk through Chợ Lớn’s grand wholesale market with its tiered roof clock tower and central courtyard.',
        question: 'Which merchant funded the construction of Bình Tây Market in the 1920s?',
        options: [
          'Merchant Quách Đàm (Thông Hiệp)',
          'Merchant Lý Văn Phức',
          'Scholar Trương Vĩnh Ký',
          'General Nguyễn Hữu Cảnh',
        ],
      },
      zh: {
        title: '平西市场八角重檐钟楼',
        description: '漫步堤岸最繁忙的批发市场，领略重檐屋顶钟楼与中央庭院布局。',
        question: '20世纪20年代捐资兴建平西市场的著名华商是谁？',
        options: [
          '华商郭琰（通合）',
          '学者李文馥',
          '学者张永记',
          '统率阮有镜',
        ],
      },
    },
  },
  {
    id: '10000000-0000-4000-8000-000000000010',
    entry_id: 'HCM-0044',
    points: 35,
    badge: 'Cổ tích Gia Định',
    status: 'published',
    expires_at: null,
    translations: {
      vi: {
        title: 'Nghệ thuật khảm sành sứ Lăng Ông Bà Chiểu',
        description:
          'Tìm hiểu quần thể kiến trúc cổ kính thờ Tả quân Lê Văn Duyệt tại vùng đất Gia Định xưa.',
        question: 'Nghệ thuật trang trí đặc trưng nổi bật tại cổng Tam quan và chính điện Lăng Ông Bà Chiểu là gì?',
        options: [
          'Nghệ thuật ghép mảnh sành sứ (khảm sành sứ) tinh xảo kiểu cung đình',
          'Nghệ thuật sơn mài cẩn trứng trên tường gạch ngoài trời',
          'Nghệ thuật đúc gang nguyên khối toàn bộ mái đền',
          'Nghệ thuật chạm khắc đá cẩm thạch đen',
        ],
      },
      en: {
        title: 'Porcelain Mosaics of Lê Văn Duyệt Mausoleum',
        description:
          'Discover the sacred Gia Định architectural complex dedicated to General Lê Văn Duyệt in Bình Thạnh.',
        question: 'What decorative craft is celebrated on the triple gate and main hall of Lăng Ông Bà Chiểu?',
        options: [
          'Intricate imperial-style cut porcelain and ceramic shard mosaic (khảm sành sứ)',
          'Outdoor eggshell lacquerwork across exterior brick walls',
          'Monolithic cast-iron temple roofing',
          'Carved black marble bas-reliefs',
        ],
      },
      zh: {
        title: '黎文悦陵（婆沼陵）瓷片镶嵌艺术',
        description: '探访嘉定古地供奉左军黎文悦的庄严古建筑群。',
        question: '婆沼陵三观门与正殿最著名的传统装饰工艺是什么？',
        options: [
          '精巧的宫廷式碎瓷镶嵌（嵌瓷）艺术',
          '室外砖墙蛋壳漆画工艺',
          '整座殿顶铸铁浇筑工艺',
          '黑云石浮雕雕刻工艺',
        ],
      },
    },
  },
  {
    id: '10000000-0000-4000-8000-000000000011',
    entry_id: 'HCM-0028',
    points: 25,
    badge: 'Sắc hồng Tân Định',
    status: 'published',
    expires_at: null,
    translations: {
      vi: {
        title: 'Đường viền đăng ten Nhà thờ Tân Định',
        description:
          'Ngắm tháp chuông vươn cao và các đường diềm hoa văn trắng nổi bật trên nền tường hồng tại Quận 3.',
        question: 'Nhà thờ Tân Định trên đường Hai Bà Trưng gây ấn tượng bởi sự kết hợp phong cách kiến trúc nào?',
        options: [
          'Sự giao thoa giữa kiến trúc Roman, Gothic và các chi tiết trang trí Baroque',
          'Kiến trúc nhà sàn gỗ truyền thống Tây Nguyên',
          'Kiến trúc tối giản kính và thép đương đại',
          'Kiến trúc đền tháp Chăm Pa cổ',
        ],
      },
      en: {
        title: 'Lacework Trim of Tân Định Church',
        description:
          'Admire the soaring bell tower and white openwork trim set against the rose-pink facade on Hai Bà Trưng Street.',
        question: 'Which architectural styles blend together in Tân Định Church?',
        options: [
          'A synthesis of Romanesque, Gothic, and Baroque ornamental details',
          'Central Highlands traditional wooden stilt architecture',
          'Contemporary minimalist glass-and-steel design',
          'Ancient Cham brick sanctuary tower architecture',
        ],
      },
      zh: {
        title: '新定教堂粉墙与蕾丝雕花',
        description: '欣赏二征夫人街上高耸的钟楼与粉红墙面上的白色镂空花饰。',
        question: '新定教堂融合了哪些欧洲建筑风格？',
        options: [
          '罗马式、哥特式与巴洛克装饰细节的巧妙融合',
          '西原地区传统木制高脚屋建筑',
          '当代极简玻璃与钢结构设计',
          '古代占婆红砖塔庙建筑',
        ],
      },
    },
  },
  {
    id: '10000000-0000-4000-8000-000000000012',
    entry_id: 'HCM-0003',
    points: 35,
    badge: 'Bảo tháp Bên Sông',
    status: 'published',
    expires_at: null,
    translations: {
      vi: {
        title: 'Bảo tháp Gotama Cetiya – Chùa Bửu Long',
        description:
          'Khám phá ngôi chùa Phật giáo Nguyên thủy bên sông Đồng Nai với bảo tháp trắng – vàng và hồ nước ngọc bích.',
        question: 'Ngọn bảo tháp chính tại Chùa Bửu Long (TP Thủ Đức) có tên gọi là gì?',
        options: [
          'Bảo tháp Gotama Cetiya',
          'Tháp Phước Duyên',
          'Tháp Báo Thiên',
          'Tháp Đa Bảo',
        ],
      },
      en: {
        title: 'Gotama Cetiya Stupa at Bửu Long Pagoda',
        description:
          'Discover the Theravada Buddhist sanctuary overlooking the Đồng Nai River with its white-and-gold stupa and turquoise pool.',
        question: 'What is the name of the main stupa at Bửu Long Pagoda in Thủ Đức City?',
        options: [
          'Gotama Cetiya Stupa',
          'Phước Duyên Tower',
          'Báo Thiên Stupa',
          'Đa Bảo Pagoda Tower',
        ],
      },
      zh: {
        title: '宝龙寺乔达摩舍利塔',
        description: '探访同奈河畔的南传佛教圣地，欣赏白金相间的舍利宝塔与碧玉水池。',
        question: '守德市宝龙寺主塔的正式名称是什么？',
        options: [
          '乔达摩舍利塔（Gotama Cetiya）',
          '福缘塔',
          '报天塔',
          '多宝塔',
        ],
      },
    },
  },
];
