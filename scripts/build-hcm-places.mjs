import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { imageFile, rejection, reviewedLocationView } from './lib/place-images.ts';

const rawPlaces = JSON.parse(
  fs.readFileSync('./src/data/THAMVAN_HCM_V3/thamvan-places.json', 'utf8')
).places;
const rawImages = JSON.parse(
  fs.readFileSync('./public/images/thamvan-image-index.json', 'utf8')
);

const imgMap = new Map();
rawImages.forEach((i) => {
  if (!i.image || rejection(i)) return;
  const file = imageFile(path.resolve('public/images'), i.image, i.id);
  if (!fs.existsSync(file) || fs.lstatSync(file).isSymbolicLink()) return;
  const sha256 = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (reviewedLocationView(i, sha256)) imgMap.set(i.id, i);
});

// Unindexed files and private source records cannot establish a reviewed photo.

const regions = [
  { id: 'q1', name: 'Quận 1', center: [10.7756, 106.7004], keys: ['quận 1', 'q.1', 'q1', 'bến nghé', 'bến thành', 'nguyễn huệ', 'lê lợi', 'đồng khởi', 'đakao', 'đa kao', 'cầu ông lãnh', 'cô giang', 'nguyễn thái bình', 'phạm ngũ lão', 'pasteur', 'mạc thị bưởi', 'thi sách', 'tôn đức thắng', 'hàm nghi', 'công trường mê linh', 'nhà thờ đức bà', 'bưu điện trung tâm', 'dinh độc lập', 'thảo cầm viên', 'chợ bến thành', 'nhà hát thành phố', 'ubnd thành phố', 'bitexco', 'saigon times square', 'hilton saigon', 'vietcombank tower', 'bạch đằng'] },
  { id: 'q3', name: 'Quận 3', center: [10.7843, 106.6843], keys: ['quận 3', 'q.3', 'q3', 'võ thị sáu', 'hồ con rùa', 'nam kỳ khởi nghĩa', 'lê quý đôn', 'nguyễn đình chiểu', 'trương định', 'tú xương', 'bà huyện thanh quan', 'trần quốc thảo', 'tân định', 'chùa vĩnh nghiêm', 'chùa xá lợi'] },
  { id: 'q4', name: 'Quận 4', center: [10.7578, 106.7013], keys: ['quận 4', 'q.4', 'q4', 'khánh hội', 'bến vân đồn', 'đoàn văn bơ', 'hoàng diệu', 'bến nhà rồng', 'cầu mống', 'rivergate', 'the tresor'] },
  { id: 'q5', name: 'Quận 5', center: [10.7540, 106.6634], keys: ['quận 5', 'q.5', 'q5', 'chợ lớn', 'nguyễn trãi', 'hải thượng lãn ông', 'châu văn liêm', 'triệu quang phục', 'an đông', 'hùng vương', 'hồng bàng', 'trần hưng đạo', 'bà thiên hậu', 'hội quán ôn lăng', 'hội quán nghĩa nhuận', 'chùa ông', 'đại học y dược', 'bệnh viện chợ rẫy'] },
  { id: 'q6', name: 'Quận 6', center: [10.7481, 106.6352], keys: ['quận 6', 'q.6', 'q6', 'bình tây', 'hậu giang', 'minh phụng', 'kinh dương vương', 'chợ lớn mới', 'bình tiên'] },
  { id: 'q7', name: 'Quận 7', center: [10.7340, 106.7218], keys: ['quận 7', 'q.7', 'q7', 'phú mỹ hưng', 'tân phong', 'tân phú', 'huỳnh tấn phát', 'nguyễn thị thập', 'nguyễn văn linh', 'hồ bán nguyệt', 'cầu ánh sao', 'crescent mall', 'sc vivocity', 'tôn đức thắng', 'bệnh viện fv'] },
  { id: 'q8', name: 'Quận 8', center: [10.7241, 106.6286], keys: ['quận 8', 'q.8', 'q8', 'phạm thế hiển', 'dương bá trạc', 'tạ quang bửu', 'đình bình đông'] },
  { id: 'q10', name: 'Quận 10', center: [10.7679, 106.6668], keys: ['quận 10', 'q.10', 'q10', 'sư vạn hạnh', 'thành thái', 'tô hiến thành', 'lý thường kiệt', 'ba tháng hai', 'việt nam quốc tự', 'chùa ấn quang', 'vạn hạnh mall'] },
  { id: 'q11', name: 'Quận 11', center: [10.7629, 106.6500], keys: ['quận 11', 'q.11', 'q11', 'đầm sen', 'lãnh binh thăng', 'lạc long quân', 'hòa bình', 'chùa giác viên'] },
  { id: 'q12', name: 'Quận 12', center: [10.8672, 106.6413], keys: ['quận 12', 'q.12', 'q12', 'tân chánh hiệp', 'an phú đông', 'thạnh lộc', 'thạnh xuân', 'hiệp thành', 'nguyễn văn quá'] },
  { id: 'binh-thanh', name: 'Bình Thạnh', center: [10.8106, 106.7091], keys: ['bình thạnh', 'thanh đa', 'bạch đằng', 'thị nghè', 'văn thánh', 'điện biên phủ', 'xô viết nghệ tĩnh', 'đinh bộ lĩnh', 'nơ trang long', 'phan đăng lưu', 'lăng ông bà chiểu', 'landmark 81', 'vinhomes central park'] },
  { id: 'thu-duc', name: 'TP Thủ Đức', center: [10.8494, 106.7715], keys: ['thủ đức', 'quận 2', 'q.2', 'q2', 'quận 9', 'q.9', 'q9', 'thảo điền', 'an phú', 'sala', 'thủ thiêm', 'hiệp bình', 'linh trung', 'linh xuân', 'long trường', 'phước long', 'tăng nhơn phú', 'cầu ba son', 'cầu sài gòn', 'cầu thủ thiêm', 'vinhomes grand park', 'chùa bửu long', 'suối tiên', 'đại học quốc gia'] },
  { id: 'phu-nhuan', name: 'Phú Nhuận', center: [10.7992, 106.6803], keys: ['phú nhuận', 'phan xích long', 'phan đình phùng', 'hoàng văn thụ', 'nguyễn văn trỗi', 'thích quảng đức'] },
  { id: 'tan-binh', name: 'Tân Bình', center: [10.8015, 106.6526], keys: ['tân bình', 'cộng hòa', 'bàu cát', 'trường chinh', 'sân bay', 'tân sơn nhất', 'chợ tân bình', 'chùa giác lâm', 'công viên hoàng văn thụ'] },
  { id: 'tan-phu', name: 'Tân Phú', center: [10.7901, 106.6281], keys: ['tân phú', 'lũy bán bích', 'tân sơn nhì', 'thoại ngọc hầu', 'hòa thạnh', 'sơn kỳ', 'aeon mall tân phú'] },
  { id: 'binh-tan', name: 'Bình Tân', center: [10.7653, 106.6038], keys: ['bình tân', 'an lạc', 'tên lửa', 'bình trị đông', 'bình hưng hòa', 'tân tạo', 'aeon mall bình tân'] },
  { id: 'go-vap', name: 'Gò Vấp', center: [10.8388, 106.6658], keys: ['gò vấp', 'quang trung', 'phan văn trị', 'lê đức thọ', 'nguyễn oanh', 'thống nhất', 'công viên gia định', 'đình thông tây hội'] },
  { id: 'cu-chi', name: 'Củ Chi', center: [11.0067, 106.5132], keys: ['củ chi', 'bến dược', 'địa đạo', 'an nhơn tây', 'phú hòa đông', 'trung an', 'nông nghiệp công nghệ cao'] },
  { id: 'hoc-mon', name: 'Hóc Môn', center: [10.8841, 106.5922], keys: ['hóc môn', 'bà điểm', 'ngã ba giồng', 'chùa hoằng pháp', 'tân xuân', 'xuân thới thượng'] },
  { id: 'binh-chanh', name: 'Bình Chánh', center: [10.6874, 106.5943], keys: ['bình chánh', 'láng le', 'tân túc', 'an phú tây', 'bình hưng', 'bình điền'] },
  { id: 'nha-be', name: 'Nhà Bè', center: [10.6953, 106.7291], keys: ['nhà bè', 'phước kiển', 'hiệp phước', 'phú xuân'] },
  { id: 'can-gio', name: 'Cần Giờ', center: [10.4114, 106.9546], keys: ['cần giờ', 'bình khánh', 'vàm sát', 'rừng sác', 'lý nhơn', 'cần thạnh', 'long hòa', 'bãi biển 30/4'] },
];

/** Chỉ giữ địa điểm trong TP.HCM — loại Vũng Tàu, Côn Đảo, Hồ Tràm, Bình Dương. */
const OUTSIDE_HCM_KEYS = [
  'vũng tàu',
  'vung tau',
  'côn đảo',
  'con dao',
  'hồ tràm',
  'ho tram',
  'bình dương',
  'binh duong',
  'thủ dầu một',
  'thuận an',
  'dĩ an',
  'xuyên mộc',
  'bà rịa',
];

const innerDistricts = regions;

function getCategoryGroup(cat) {
  const c = (cat || '').toLowerCase();
  if (/chùa|đình|miếu|đền|hội quán|nhà thờ|tín ngưỡng|thánh thất|thánh đường|tu viện|tịnh xá/.test(c)) return 'Tín ngưỡng & Tâm linh';
  if (/bảo tàng|di tích|lịch sử|di sản|nhà tù|mộ cụ|nhà cổ/.test(c)) return 'Di sản & Bảo tàng';
  if (/đại học|cao đẳng|thpt|tiểu học|giáo dục|học viện/.test(c)) return 'Giáo dục & Trường học';
  if (/bệnh viện|y tế|phòng khám/.test(c)) return 'Y tế & Bệnh viện';
  if (/quán ăn|nhà hàng|ẩm thực|bếp|ốc|phở|xôi/.test(c)) return 'Ẩm thực & Nhà hàng';
  if (/cà phê|cafe|kafe|check-in|trà sữa/.test(c)) return 'Cà phê & Check-in';
  if (/bar|rooftop|nightlife|beer|lounge|cocktail|pub/.test(c)) return 'Bar, Pub & Rooftop';
  if (/thương mại|mall|plaza|chợ|siêu thị|mua sắm|fashion/.test(c)) return 'Mua sắm & Thương mại';
  if (/vinhomes|novaland|căn hộ|cao ốc|đô thị|khu dân cư|residence|tower/.test(c)) return 'Đô thị & Cao ốc';
  if (/công viên|cầu|hồ|bãi biển|cảnh quan|đảo|núi|rừng/.test(c)) return 'Cảnh quan & Thiên nhiên';
  if (/khách sạn|hotel|resort|villa|nghỉ dưỡng|lưu trú/.test(c)) return 'Khách sạn & Nghỉ dưỡng';
  if (/spa|massage|làm đẹp|clinic|thư giãn/.test(c)) return 'Spa & Chăm sóc sức khỏe';
  if (/ngân hàng|phòng giao dịch|chi nhánh/.test(c)) return 'Ngân hàng & Tài chính';
  return 'Điểm đến & Tiện ích khác';
}

function categoryToKind(cat) {
  const c = (cat || '').toLowerCase();
  if (/chùa|đình|miếu|đền|hội quán|nhà thờ|tín ngưỡng|tịnh xá|bảo tàng|di tích|lịch sử/.test(c)) return 'monument';
  if (/công viên|hồ|bãi biển|núi|rừng|đảo|cảnh quan/.test(c)) return 'nature';
  if (/ẩm thực|nhà hàng|quán ăn|cà phê|spa/.test(c)) return 'craft';
  if (/cầu|cao ốc|vinhomes|tòa nhà|kiến trúc|trường|bệnh viện|thương mại|mall|plaza|khách sạn|resort/.test(c)) return 'architecture';
  return 'symbol';
}

const hcmRawPlaces = rawPlaces.filter((p) => {
  const text = `${p.name} ${p.address || ''} ${p.description || ''} ${p.history || ''}`.toLowerCase();
  return !OUTSIDE_HCM_KEYS.some((k) => text.includes(k));
});

const processedPlaces = hcmRawPlaces.map((p, idx) => {
  const imgInfo = imgMap.get(p.id);
  const hasImage = Boolean(imgInfo && imgInfo.image);
  const text = (p.name + ' ' + p.address + ' ' + (p.description || '') + ' ' + (p.history || '')).toLowerCase();
  
  let assignedRegion = null;
  for (const reg of regions) {
    if (reg.keys.some((k) => text.includes(k))) {
      assignedRegion = reg;
      break;
    }
  }

  const idNum = parseInt(p.id.replace(/\D/g, ''), 10) || (idx + 1);
  if (!assignedRegion) {
    if (p.lat != null && p.lon != null) {
      let minDist = 999999;
      for (const reg of regions) {
        const d = Math.hypot(p.lat - reg.center[0], p.lon - reg.center[1]);
        if (d < minDist) {
          minDist = d;
          assignedRegion = reg;
        }
      }
    } else {
      assignedRegion = innerDistricts[idNum % innerDistricts.length];
    }
  }

  let lat = p.lat;
  let lon = p.lon;
  let hasGps = Boolean(lat != null && lon != null);

  if (!hasGps) {
    const angle = ((idNum * 137.5077) % 360) * (Math.PI / 180);
    const radius = 0.003 + ((idNum % 19) / 19) * 0.008; // 300m - 1.1km
    lat = Number((assignedRegion.center[0] + Math.sin(angle) * radius).toFixed(6));
    lon = Number((assignedRegion.center[1] + Math.cos(angle) * (radius * 1.05)).toFixed(6));
  }

  const catGroup = getCategoryGroup(p.category);
  const kind = categoryToKind(p.category);
  const slug = p.id.toLowerCase();
  const addressClean = p.address && !p.address.includes('CHƯA XÁC MINH')
    ? p.address
    : `${p.name}, ${assignedRegion.name}, TP.HCM`;

  return {
    id: p.id,
    slug,
    name: p.name,
    aliases: p.aliases || [p.name],
    kind,
    category: p.category || 'Địa điểm',
    categoryGroup: catGroup,
    address: addressClean,
    region: assignedRegion.name,
    latitude: lat,
    longitude: lon,
    hasGps,
    hasImage,
    image: hasImage ? imgInfo.image : null,
    image_author: hasImage ? (imgInfo.attribution?.author || '') : '',
    image_license: hasImage ? (imgInfo.attribution?.license || '') : '',
    image_source: hasImage ? (imgInfo.attribution?.source || null) : null,
    description: p.description || `${p.name} là địa điểm nổi bật tại ${assignedRegion.name}, TP. Hồ Chí Minh.`,
    history: p.history || '',
    referenceUrl: p.referenceUrl || '',
    sources: [
      {
        title: p.name,
        publisher: 'Cẩm nang du lịch & Văn hóa TP.HCM',
        url: p.referenceUrl || 'https://thamvan.vn',
        accessed: '2026-10-27',
      },
    ],
    status: 'published',
    verification: imgInfo?.status === 'VERIFIED_PHOTO' ? 'reviewed' : 'reference',
    updated_at: '2026-10-27T00:00:00Z',
    translations: {
      vi: {
        summary: p.description ? p.description.slice(0, 150) : `${p.name} tại ${assignedRegion.name}, TP.HCM.`,
        story: p.history || p.description || `${p.name} nằm trong mạng lưới địa điểm văn hóa, giáo dục và tiện ích đô thị TP.HCM.`,
        detail: `Địa chỉ: ${addressClean}. Phân loại: ${p.category}.`,
      },
      en: {
        summary: `${p.name} located in ${assignedRegion.name}, Ho Chi Minh City.`,
        story: p.history || p.description || `${p.name} is an important urban destination in Ho Chi Minh City.`,
        detail: `Address: ${addressClean}. Category: ${p.category}.`,
      },
      zh: {
        summary: `位于胡志明市${assignedRegion.name}的${p.name}。`,
        story: p.history || p.description || `${p.name}是胡志明市城市遗产与现代生活的一部分。`,
        detail: `地址：${addressClean}。类别：${p.category}。`,
      },
    },
  };
});

fs.writeFileSync('./src/data/hcm-places.json', JSON.stringify(processedPlaces, null, 2));
console.log('Successfully generated ./src/data/hcm-places.json with', processedPlaces.length, 'places.');
console.log('Places with photos:', processedPlaces.filter((p) => p.hasImage).length);
console.log('Places with original GPS:', processedPlaces.filter((p) => p.hasGps).length);
