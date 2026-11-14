import type { Locale } from '@/lib/types';
export const legal: Record<
  'privacy' | 'terms',
  Record<Locale, { title: string; body: string }[]>
> = {
  privacy: {
    vi: [
      {
        title: 'Thông tin chúng tôi xử lý',
        body: 'Tài khoản dùng email/mật khẩu hoặc Google qua Supabase Auth. Khi bạn chọn Google, tên và email được chuyển từ Google đến Supabase để xác thực và tạo hồ sơ. Ứng dụng lưu tên hiển thị, tùy chọn ngôn ngữ, bán kính, thông báo, các địa điểm đã lưu và tiến độ thử thách để cung cấp các chức năng tương ứng. Mật khẩu không được lưu trong bảng hồ sơ.',
      },
      {
        title: 'Vị trí, camera và ảnh',
        body: 'Lần đầu dùng camera trên mỗi thiết bị, bạn được hỏi một lần về vị trí, camera, ảnh từ thư viện và điều khoản; lựa chọn được ghi trên chính thiết bị đó và có thể thu hồi trong cài đặt trình duyệt. Vị trí chỉ lấy từ GPS/trình duyệt của thiết bị (không suy đoán qua IP), không lưu vào database và không hiển thị tọa độ trên giao diện. Khi bạn chụp ảnh, tìm địa điểm quanh mình hoặc xin chỉ đường, vị trí được gửi tới máy chủ THÁM VĂN cho riêng yêu cầu đó; máy chủ gửi tọa độ đã làm tròn tới dịch vụ bản đồ OpenStreetMap để lấy tên đường, địa điểm lân cận và lộ trình. Nhà cung cấp AI chỉ nhận ảnh, tên khu vực và khoảng cách — không nhận tọa độ. Ứng dụng không lưu ảnh nhận diện trên máy chủ hoặc công khai ảnh. Nhà cung cấp AI có thể xử lý/lưu theo chính sách riêng. Hãy tránh gửi ảnh chứa người hoặc thông tin riêng tư.',
      },
      {
        title: 'Cookie và lưu trữ trên thiết bị',
        body: 'Cookie phiên HttpOnly được dùng cho đăng nhập. Cookie ngôn ngữ và giới thiệu cùng bộ nhớ cục bộ lưu tùy chọn khám phá, trạng thái nhắc địa điểm. Không dùng cookie quảng cáo. Xóa dữ liệu trang trong trình duyệt để đặt lại các tùy chọn này.',
      },
      {
        title: 'Dịch vụ bên ngoài',
        body: 'Supabase cung cấp xác thực và lưu dữ liệu. Bản đồ nền được trình duyệt tải trực tiếp từ OpenFreeMap (dữ liệu OpenStreetMap); ảnh vệ tinh đi qua máy chủ trung gian của THÁM VĂN. Tên đường, địa điểm lân cận và chỉ đường do các dịch vụ dựa trên OpenStreetMap (Nominatim, Overpass, OSRM) cung cấp thông qua máy chủ THÁM VĂN. Cloudflare Turnstile chống lạm dụng khi được cấu hình. Khi bạn mở Google Maps hoặc nguồn tham khảo, trang bên ngoài áp dụng chính sách riêng.',
      },
      {
        title: 'Quyền quản lý dữ liệu',
        body: 'Trong Cá nhân, bạn có thể chỉnh tên, tải bản sao dữ liệu và xóa tài khoản bằng cách xác nhận mật khẩu hoặc đăng nhập lại qua Google. Xóa tài khoản xóa hồ sơ, hành trình, tiến độ và phản hồi của bạn; nhật ký quản trị được bỏ liên kết tài khoản. Bản sao lưu của nhà cung cấp hết hạn theo chính sách dự án. Không dùng website để lưu thông tin nhạy cảm.',
      },
      {
        title: 'Thời gian lưu và thay đổi',
        body: 'Dữ liệu tài khoản được giữ khi tài khoản còn tồn tại. Bạn có thể tắt thông báo bất cứ lúc nào; quyền thiết bị được quản lý trong trình duyệt. Phiên bản chính sách: 26/10/2026. Mọi thắc mắc về dữ liệu cá nhân hoặc yêu cầu hỗ trợ có thể gửi qua mục Đối tác & Liên hệ trên website.',
      },
    ],
    en: [
      {
        title: 'Information we process',
        body: 'Supabase Auth handles email/password and Google authentication. When you choose Google, Google shares your name and email with Supabase for sign-in and profile creation. The app stores a display name, language, radius, notification preferences, saved places and challenge progress for those features. Passwords are not stored in profile tables.',
      },
      {
        title: 'Location, camera and photos',
        body: 'The first time you use the camera on a device you are asked once about location, camera, library photos and the terms; your choice is recorded on that device and can be withdrawn in browser settings. Location comes only from the device GPS/browser (never guessed from IP), is not stored in the database and coordinates are not shown in the interface. When you take a photo, look for places around you or ask for directions, your position is sent to the THÁM VĂN server for that request only; the server sends rounded coordinates to OpenStreetMap-based services to obtain the street name, nearby places and the route. The AI provider receives the photo, the area name and distances — never coordinates. This app does not store recognition photos on its server or publish them. The AI provider may process or retain inputs under its own policy. Avoid photos of people or private information.',
      },
      {
        title: 'Cookies and device storage',
        body: 'HttpOnly session cookies support sign-in. Language and onboarding cookies and local storage retain discovery preferences and nearby reminder state. There are no advertising cookies. Clear browser site data to reset device preferences.',
      },
      {
        title: 'External services',
        body: 'Supabase provides authentication and storage. The basemap is loaded by your browser directly from OpenFreeMap (OpenStreetMap data); satellite imagery passes through the THÁM VĂN server proxy. Street names, nearby places and directions come from OpenStreetMap-based services (Nominatim, Overpass, OSRM) through the THÁM VĂN server. Cloudflare Turnstile prevents abuse when configured. Google Maps and source links have their own privacy policies.',
      },
      {
        title: 'Managing your data',
        body: 'Use Profile to edit your name, export your data or delete your account after confirming your password or signing in again with Google. Deletion removes your profile, journey, progress and reports; audit events are detached from your account. Provider backups expire under the project backup policy. Do not store sensitive information here.',
      },
      {
        title: 'Retention and changes',
        body: 'Account data is kept while the account exists. You can disable notifications at any time; browser settings control device permissions. Policy version: 26 October 2026. Data questions and support inquiries can be submitted through the Partners & Contact channel on this site.',
      },
    ],
    zh: [
      {
        title: '处理的信息',
        body: 'Supabase Auth负责邮箱密码和Google认证。选择Google登录时，Google会将姓名和邮箱发送至Supabase，用于登录和创建个人资料。应用保存显示名称、语言、探索半径、通知偏好、已保存地点和挑战进度，以提供对应功能。个人资料表不保存密码。',
      },
      {
        title: '位置、相机和图片',
        body: '在每台设备上首次使用相机时，系统会就位置、相机、相册图片和条款询问一次；你的选择记录在该设备上，可在浏览器设置中撤回。位置仅来自设备的GPS/浏览器（不会通过IP推测），不会存入数据库，界面上也不显示坐标。当你拍照、查找周边地点或请求路线时，位置仅为该次请求发送到THÁM VĂN服务器；服务器会将取整后的坐标发送给基于OpenStreetMap的服务，以获取街道名称、周边地点和路线。AI提供商只会收到图片、区域名称和距离，不会收到坐标。本应用不会在服务器保存识别图片或公开图片。AI提供商可能根据自身政策处理或保留输入。请勿发送人物或私人信息图片。',
      },
      {
        title: 'Cookie与设备存储',
        body: 'HttpOnly会话Cookie用于登录。语言、引导Cookie和本地存储保存探索偏好与附近地点提醒状态，不使用广告Cookie。清除浏览器网站数据可重置偏好。',
      },
      {
        title: '外部服务',
        body: 'Supabase提供认证与数据存储。底图由浏览器直接从OpenFreeMap（OpenStreetMap数据）加载；卫星影像经由THÁM VĂN服务器代理。街道名称、周边地点和路线由基于OpenStreetMap的服务（Nominatim、Overpass、OSRM）经THÁM VĂN服务器提供。配置后使用Cloudflare Turnstile防止滥用。Google地图和参考来源适用各自的隐私政策。',
      },
      {
        title: '管理你的数据',
        body: '在个人页面可修改名称、导出数据，或通过密码确认或重新使用Google登录删除账户。删除会移除资料、旅程、进度和反馈；管理日志会取消账户关联。提供商备份根据项目备份政策到期。请勿在此存储敏感信息。',
      },
      {
        title: '保留与变更',
        body: '账户存在期间保留账户数据。可随时关闭通知，设备权限由浏览器设置管理。政策版本：2026年10月26日。如需数据咨询或支持，可通过网站“合作与联系”渠道提交请求。',
      },
    ],
  },
  terms: {
    vi: [
      {
        title: 'Mục đích của THÁM VĂN',
        body: 'Website hỗ trợ tìm hiểu di sản và địa điểm TP. Hồ Chí Minh qua tư liệu có nguồn, bản đồ và thử thách học tập. Thông tin không thay thế hướng dẫn chính thức của đơn vị quản lý, không phải cam kết về giờ mở cửa, giá vé hay điều kiện tham quan.',
      },
      {
        title: 'Tài khoản và hành vi sử dụng',
        body: 'Bạn chịu trách nhiệm bảo vệ thông tin đăng nhập. Không khai thác lỗ hổng, quấy rối người khác, gửi nội dung trái phép, giả mạo nguồn hoặc tự động hóa để vượt giới hạn. Chỉ gửi ảnh bạn có quyền sử dụng và được sự đồng ý cần thiết.',
      },
      {
        title: 'Nhận diện và độ chính xác',
        body: 'Nhận diện AI là gợi ý có thể sai. Không coi kết quả là xác nhận danh tính hiện vật hoặc thông tin lịch sử. Nguồn và ngày cập nhật được hiển thị trên trang tư liệu; bạn có thể báo nội dung cần sửa. Tư liệu tham khảo chưa có nhãn kiểm chứng không được coi là đã qua thẩm định chuyên gia.',
      },
      {
        title: 'Thử thách và hành trình',
        body: 'Điểm XP và huy hiệu dùng để ghi nhận tiến độ học tập, không có giá trị tiền tệ hoặc đổi voucher. Lượt ghé thăm là ghi nhận cá nhân trong sổ hành trình. Quyền lợi gói hội viên được quy định riêng tại mục Gói thành viên bên dưới.',
      },
      {
        title: 'Bản quyền',
        body: 'Ảnh và tư liệu giữ quyền của tác giả/đơn vị nguồn theo giấy phép hiển thị. Khi sử dụng lại, bạn cần tuân thủ giấy phép của từng tài nguyên, bao gồm yêu cầu ghi công và chia sẻ tương tự nếu có.',
      },
      {
        title: 'Thay đổi dịch vụ',
        body: 'Một số chức năng phụ thuộc cấu hình và tình trạng của dịch vụ bên ngoài. Website có thể được cập nhật hoặc tạm ngừng để bảo trì. Phiên bản điều khoản: 26/10/2026. Thông tin đối soát giao dịch và hỗ trợ được tiếp nhận qua kênh liên hệ hiển thị trên website.',
      },
    ],
    en: [
      {
        title: 'Purpose of THÁM VĂN',
        body: 'This website supports learning about Ho Chi Minh City heritage and places through sourced content, maps and learning challenges. It does not replace official site guidance or guarantee opening hours, ticket prices or visitor access.',
      },
      {
        title: 'Accounts and acceptable use',
        body: 'Protect your login information. Do not exploit vulnerabilities, harass others, submit unlawful material, forge sources or automate requests to bypass limits. Submit only images you have the right and necessary consent to use.',
      },
      {
        title: 'Recognition and accuracy',
        body: 'AI recognition provides suggestions and can be wrong. Results do not authenticate artifacts or verify historical claims. Entries show sources and update dates and allow reporting corrections. Reference entries without a reviewed label have not received expert validation.',
      },
      {
        title: 'Challenges and journeys',
        body: 'XP points and badges celebrate learning progress and have no monetary or voucher value. Visits are personal entries in your field journal. Paid membership entitlements are governed solely by the Monthly memberships section below.',
      },
      {
        title: 'Copyright',
        body: 'Images and content retain the rights and licenses of their authors or source institutions. Reuse must follow each resource’s license, including attribution and share-alike requirements where applicable.',
      },
      {
        title: 'Service changes',
        body: 'Some features depend on external service configuration and availability. The website may be updated or paused for maintenance. Terms version: 26 October 2026. Order reconciliation and support requests are handled via the official contact channels shown on this site.',
      },
    ],
    zh: [
      {
        title: 'THÁM VĂN的用途',
        body: '通过有来源的资料、地图和学习挑战，帮助了解胡志明市的遗产与地点。内容不能替代管理机构的官方指引，也不保证开放时间、门票价格或参观条件。',
      },
      {
        title: '账户与使用行为',
        body: '请保护登录信息。不得利用漏洞、骚扰他人、提交违法内容、伪造来源或自动化绕过限制。仅提交有权使用并取得必要同意的图片。',
      },
      {
        title: '识别与准确性',
        body: 'AI识别仅提供可能出错的建议，不能鉴定文物或验证历史信息。资料页面展示来源和更新日期，可报告错误。未标记已核查的参考资料不代表经过专家审定。',
      },
      {
        title: '挑战与旅程',
        body: 'XP 积分与徽章用于记录学习成果，不具备现金或兑换券价值。到访记录属于个人旅程手札。会员权益由下文“月度会员”条款单独规定。',
      },
      {
        title: '版权',
        body: '图片和内容保留作者或来源机构的权利，适用页面所示许可。再次使用需要遵守各项授权，包括署名及适用的相同方式共享要求。',
      },
      {
        title: '服务变更',
        body: '部分功能取决于外部服务的配置与可用性。网站可能更新或暂停维护。条款版本：2026年10月26日。订单核对与支持请求通过网站公示的官方联系渠道处理。',
      },
    ],
  },
};
