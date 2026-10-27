import 'server-only';
import { copy } from '@/lib/locale-copy';
import type { Locale } from '@/lib/types';

// Original observation prompts. These are editorial suggestions, not verified historical claims.
export function guideFor(slug: string, locale: Locale) {
  const prompts: Record<string, [string, string, string]> = {
    'hcm-0066': [
      'Đứng ở không gian công cộng phía trước nhà hát. Chọn ba chi tiết trên mặt tiền: một đường cong, một hình khối và một họa tiết. Phác nhanh chúng trước khi mở trang tư liệu. Điều nào khiến bạn nhận ra đây là một công trình biểu diễn?',
      'From the public space in front, find three façade details: a curve, a shape and an ornament. Sketch them before opening the source. What makes this building feel like a place for performance?',
      '在剧院前的公共空间，寻找立面上的曲线、形体和装饰各一处。先画下来再查看资料。什么让它看起来像表演场所？',
    ],
    'hcm-vr-0062': [
      'Đi dọc một đoạn phố đi bộ Nguyễn Huệ. Dừng tại một vị trí không cản lối đi và nghe trong một phút. Ghi lại ba lớp âm thanh và chọn một mặt tiền thể hiện sự thay đổi giữa cũ và mới.',
      'Walk a section of Nguyễn Huệ pedestrian street. Stop out of the way and listen for one minute. Note three layers of sound and a façade where old and new meet.',
      '沿阮惠步行街走一段，在不挡路的位置听一分钟。记下三层声音，再找一处新旧交汇的建筑立面。',
    ],
    'hcm-0057': [
      'Tìm một chỗ nghỉ trong công viên Bến Bạch Đằng. Nhìn cùng một hướng trong hai phút: điều gì chuyển động, điều gì đứng yên? Vẽ ba đường biểu thị mặt nước, bờ sông và đường chân trời. Không xuống mép kè để chụp ảnh.',
      'Find a resting spot in Bạch Đằng park. Look in one direction for two minutes: what moves, what stays? Draw three lines for water, riverbank and skyline. Stay away from the embankment edge.',
      '在白藤公园找个休息处，朝同一方向看两分钟：什么在动，什么静止？用三条线画出水面、河岸和天际线。请远离堤岸边缘。',
    ],
    'hcm-vr-0027': [
      'Quan sát cầu Ba Son từ lối đi công cộng ven sông. Tìm trụ tháp và hướng của các dây văng, rồi so sánh với bản phác bạn vừa vẽ ở Bạch Đằng. Không dừng ở phần đường xe chạy hoặc băng qua để tìm góc chụp.',
      'Observe Ba Son Bridge from the public riverside path. Trace the pylon and the direction of the stays, then compare with your Bạch Đằng sketch. Do not stop on the roadway or cross traffic for a photo.',
      '从河畔公共步道观察巴山桥，画出桥塔与斜拉索方向，再与白藤公园的速写比较。请勿停留在车道上或冒险穿行拍照。',
    ],
    'hcm-0051': [
      'Nếu khu vực tham quan mở cửa, bước vào Bưu điện Trung tâm và quan sát nhịp của trần, cửa và hành lang. Tìm một chi tiết bạn bỏ qua nếu chỉ chụp ảnh mặt tiền. Viết một câu bưu thiếp cho chính mình, không chụp cận thông tin giao dịch của người khác.',
      'If the visitor area is open, step into the Central Post Office and look at the rhythm of ceilings, windows and corridors. Find one detail a façade photo would miss. Write yourself a postcard sentence; avoid photographing other people’s transactions.',
      '如果参观区开放，进入中央邮局，观察天花板、窗户和走廊的节奏。找一个正面照片会遗漏的细节，给自己写一句明信片，避免拍到他人交易信息。',
    ],
    'hcm-new-0227': [
      'Ở Đường sách Nguyễn Văn Bình, chọn một bìa sách khiến bạn dừng lại. Màu sắc, chữ hay chủ đề đã kéo bạn đến? Ghi tên cuốn sách vào nhật ký; hỏi người bán trước khi chụp cận nội dung bên trong.',
      'On Nguyễn Văn Bình Book Street, choose a cover that makes you stop. Was it colour, typography or subject? Note the title in your journal, and ask before photographing pages.',
      '在阮文平书街选一本让你驻足的封面。是色彩、字体还是主题吸引了你？记下书名，拍摄内页前请先询问。',
    ],
    'hcm-0049': [
      'Quan sát Chợ Bến Thành từ bên ngoài rồi chọn một lối đi được phép. Ghi ba dấu hiệu cho thấy chợ vừa phục vụ đời sống địa phương vừa đón khách. Hỏi giá trước khi mua và xin phép trước khi chụp quầy hàng hoặc con người.',
      'Observe Bến Thành Market outside, then use a permitted entrance. Note three signs of a market serving both residents and visitors. Ask prices before buying and permission before photographing stalls or people.',
      '先观察滨城市场外部，再从允许的入口进入。记录三个体现本地生活与旅游相遇的细节。购买前问价，拍摊位或人物前征求同意。',
    ],
    'hcm-0048': [
      'Kiểm tra giờ mở cửa và vé riêng của Bảo tàng Mỹ thuật. Nếu vào tham quan, chọn một tác phẩm được phép quan sát lâu. Ghi cảm nhận ban đầu trước khi đọc nhãn, sau đó bổ sung điều đã thay đổi trong cách hiểu của bạn. Tuân thủ quy định chụp ảnh của bảo tàng.',
      'Check the Fine Arts Museum’s own opening hours and ticket requirements. If you enter, choose one artwork to spend time with. Write your first response before reading its label, then note what changed. Follow the museum’s photography rules.',
      '先确认美术馆开放时间和门票。入馆后选一件作品，先写下第一感受，再读标签，记录理解的变化。请遵守馆内摄影规定。',
    ],
    'hcm-0050': [
      'Tại Chợ Bình Tây, bắt đầu bằng quan sát cấu trúc lối đi từ vị trí được phép. Bạn dùng mốc nào để định hướng: ánh sáng, biển hiệu hay âm thanh? Ghi một mẹo tìm đường của riêng bạn. Giữ lối vận chuyển hàng thông thoáng.',
      'At Bình Tây Market, observe the passageways from an accessible area. What helps you orient yourself: light, signs or sound? Write your own wayfinding tip, and keep delivery routes clear.',
      '在平西市场，从允许通行的区域观察走道。光线、招牌还是声音帮助你辨认方向？写下自己的认路方法，注意让出货运通道。',
    ],
    'hcm-0002': [
      'Ở Chùa Bà Thiên Hậu, xem nội quy trước khi bước vào. Từ khu vực cho phép, nhìn hướng ánh sáng và cách sân trong tạo khoảng nghỉ giữa phố đông. Ghi một chi tiết kiến trúc, không đưa ra diễn giải tín ngưỡng khi chưa đối chiếu nguồn.',
      'At Thiên Hậu Temple, read visitor rules first. From a permitted area, notice how light and the courtyard make a pause in the busy street. Record an architectural detail without assuming religious meanings you have not checked.',
      '参观天后庙前先读须知。在允许的区域观察光线与庭院如何让繁忙街道暂时安静。记录建筑细节，未查证前不自行解释宗教含义。',
    ],
    'hcm-vr-0036': [
      'Đi một đoạn khu phố Hải Thượng Lãn Ông. Chú ý cách biển hiệu, tầng trên và tầng trệt cùng kể câu chuyện về một con phố. Chọn một cặp chi tiết đối lập để kết thúc nhật ký. Không vào không gian riêng hoặc chạm vào hàng hóa khi chưa được mời.',
      'Walk a section of Hải Thượng Lãn Ông. Notice how signs, upper floors and ground-level shops tell different parts of a street’s story. Finish with a pair of contrasting details. Respect private spaces and ask before touching goods.',
      '在海上懒翁街走一段，观察招牌、楼上和底层商铺如何讲述街道故事。以一对对比细节结束日记。尊重私人空间，触碰商品前先询问。',
    ],
  };
  const prompt = prompts[slug];
  return {
    observation: prompt
      ? copy(locale, ...prompt)
      : copy(
          locale,
          'Quan sát một chi tiết tại địa điểm và ghi lại điều bạn muốn tìm hiểu thêm.',
          'Observe a detail and note a question to explore further.',
          '观察一个细节，写下想进一步了解的问题。',
        ),
    reflection: copy(
      locale,
      'Sau điểm dừng: viết một câu bắt đầu bằng “Hôm nay tôi mới để ý…”. Đọc tư liệu có nguồn để phân biệt điều vừa quan sát và điều đã được xác nhận.',
      'After this stop, write a sentence starting “Today I noticed…”. Use the linked sources to distinguish your observations from confirmed information.',
      '离开本站前，写一句“今天我注意到……”。通过链接资料区分个人观察与已证实的信息。',
    ),
  };
}
