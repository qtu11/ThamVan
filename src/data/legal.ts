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
        body: 'Vị trí được tính trên thiết bị để lọc địa điểm; không gửi tọa độ hiện tại lên database. Camera chỉ mở khi bạn chủ động yêu cầu. Ảnh chỉ được gửi đến nhà cung cấp AI sau khi bạn đồng ý; ứng dụng không lưu ảnh nhận diện trên máy chủ hoặc công khai ảnh. Nhà cung cấp AI có thể xử lý/lưu theo chính sách riêng. Hãy tránh gửi ảnh chứa người hoặc thông tin riêng tư.',
      },
      {
        title: 'Cookie và lưu trữ trên thiết bị',
        body: 'Cookie phiên HttpOnly được dùng cho đăng nhập. Cookie ngôn ngữ và giới thiệu cùng bộ nhớ cục bộ lưu tùy chọn khám phá, trạng thái nhắc địa điểm. Không dùng cookie quảng cáo. Xóa dữ liệu trang trong trình duyệt để đặt lại các tùy chọn này.',
      },
      {
        title: 'Dịch vụ bên ngoài',
        body: 'Supabase cung cấp xác thực và lưu dữ liệu. Bản đồ tải ô bản đồ từ OpenStreetMap, có thể gửi địa chỉ IP và thông tin trình duyệt đến dịch vụ đó. Cloudflare Turnstile chống lạm dụng khi được cấu hình. Khi bạn chọn chỉ đường hoặc nguồn tham khảo, trang bên ngoài áp dụng chính sách riêng.',
      },
      {
        title: 'Quyền quản lý dữ liệu',
        body: 'Trong Cá nhân, bạn có thể chỉnh tên, tải bản sao dữ liệu và xóa tài khoản bằng cách xác nhận mật khẩu hoặc đăng nhập lại qua Google. Xóa tài khoản xóa hồ sơ, hành trình, tiến độ và phản hồi của bạn; nhật ký quản trị được bỏ liên kết tài khoản. Bản sao lưu của nhà cung cấp hết hạn theo chính sách dự án. Không dùng website để lưu thông tin nhạy cảm.',
      },
      {
        title: 'Thời gian lưu và thay đổi',
        body: 'Dữ liệu tài khoản được giữ khi tài khoản còn tồn tại. Bạn có thể tắt thông báo bất cứ lúc nào; quyền thiết bị được quản lý trong trình duyệt. Phiên bản chính sách: 26/10/2026. Chủ vận hành cần bổ sung thông tin liên hệ, thời hạn bản sao lưu và nhà cung cấp AI cụ thể trước khi mở dịch vụ công khai.',
      },
    ],
    en: [
      {
        title: 'Information we process',
        body: 'Supabase Auth handles email/password and Google authentication. When you choose Google, Google shares your name and email with Supabase for sign-in and profile creation. The app stores a display name, language, radius, notification preferences, saved places and challenge progress for those features. Passwords are not stored in profile tables.',
      },
      {
        title: 'Location, camera and photos',
        body: 'Your location is used on your device to filter places and is not sent to the database. The camera opens only on request. Photos are sent to the AI provider only after consent. This app does not store recognition photos on its server or publish them. The AI provider may process or retain inputs under its own policy. Avoid photos of people or private information.',
      },
      {
        title: 'Cookies and device storage',
        body: 'HttpOnly session cookies support sign-in. Language and onboarding cookies and local storage retain discovery preferences and nearby reminder state. There are no advertising cookies. Clear browser site data to reset device preferences.',
      },
      {
        title: 'External services',
        body: 'Supabase provides authentication and storage. OpenStreetMap serves map tiles and may receive your IP address and browser information. Cloudflare Turnstile prevents abuse when configured. External directions and source links have their own privacy policies.',
      },
      {
        title: 'Managing your data',
        body: 'Use Profile to edit your name, export your data or delete your account after confirming your password or signing in again with Google. Deletion removes your profile, journey, progress and reports; audit events are detached from your account. Provider backups expire under the project backup policy. Do not store sensitive information here.',
      },
      {
        title: 'Retention and changes',
        body: 'Account data is kept while the account exists. You can disable notifications at any time; browser settings control device permissions. Policy version: 26 October 2026. Before public launch, the operator must add contact information, backup retention and the specific AI provider.',
      },
    ],
    zh: [
      {
        title: '处理的信息',
        body: 'Supabase Auth负责邮箱密码和Google认证。选择Google登录时，Google会将姓名和邮箱发送至Supabase，用于登录和创建个人资料。应用保存显示名称、语言、探索半径、通知偏好、已保存地点和挑战进度，以提供对应功能。个人资料表不保存密码。',
      },
      {
        title: '位置、相机和图片',
        body: '位置仅在设备上用于筛选地点，不会上传数据库。相机仅在你主动操作时打开。图片仅在同意后发送到AI提供商，本应用不会在服务器保存识别图片或公开图片。AI提供商可能根据自身政策处理或保留输入。请勿发送人物或私人信息图片。',
      },
      {
        title: 'Cookie与设备存储',
        body: 'HttpOnly会话Cookie用于登录。语言、引导Cookie和本地存储保存探索偏好与附近地点提醒状态，不使用广告Cookie。清除浏览器网站数据可重置偏好。',
      },
      {
        title: '外部服务',
        body: 'Supabase提供认证与数据存储。OpenStreetMap提供地图瓦片，可能接收IP和浏览器信息。配置后使用Cloudflare Turnstile防止滥用。外部路线和参考来源适用各自的隐私政策。',
      },
      {
        title: '管理你的数据',
        body: '在个人页面可修改名称、导出数据，或通过密码确认或重新使用Google登录删除账户。删除会移除资料、旅程、进度和反馈；管理日志会取消账户关联。提供商备份根据项目备份政策到期。请勿在此存储敏感信息。',
      },
      {
        title: '保留与变更',
        body: '账户存在期间保留账户数据。可随时关闭通知，设备权限由浏览器设置管理。政策版本：2026年10月26日。正式公开运营前，运营者需要补充联系信息、备份保留期限和具体AI提供商。',
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
        body: 'Điểm và huy hiệu dùng để ghi nhận việc học, không có giá trị tiền tệ hoặc voucher. Ghé thăm là ghi nhận do bạn tự xác nhận. Không có quyền lợi tài trợ hoặc Premium nào được cam kết trên website này.',
      },
      {
        title: 'Bản quyền',
        body: 'Ảnh và tư liệu giữ quyền của tác giả/đơn vị nguồn theo giấy phép hiển thị. Khi sử dụng lại, bạn cần tuân thủ giấy phép của từng tài nguyên, bao gồm yêu cầu ghi công và chia sẻ tương tự nếu có.',
      },
      {
        title: 'Thay đổi dịch vụ',
        body: 'Một số chức năng phụ thuộc cấu hình và tình trạng của dịch vụ bên ngoài. Website có thể được cập nhật hoặc tạm ngừng để bảo trì. Phiên bản điều khoản: 26/10/2026. Chủ vận hành cần hoàn thiện thông tin pháp nhân, liên hệ và quy trình hỗ trợ trước khi mở dịch vụ công khai.',
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
        body: 'Points and badges celebrate learning and have no monetary or voucher value. Visits are self-reported. No sponsored or Premium benefit is promised by this website.',
      },
      {
        title: 'Copyright',
        body: 'Images and content retain the rights and licenses of their authors or source institutions. Reuse must follow each resource’s license, including attribution and share-alike requirements where applicable.',
      },
      {
        title: 'Service changes',
        body: 'Some features depend on external service configuration and availability. The website may be updated or paused for maintenance. Terms version: 26 October 2026. Before public launch the operator must complete entity, contact and support information.',
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
        body: '积分和徽章仅记录学习成果，没有现金或兑换价值。到访记录由本人确认。本网站不承诺任何赞助或Premium权益。',
      },
      {
        title: '版权',
        body: '图片和内容保留作者或来源机构的权利，适用页面所示许可。再次使用需要遵守各项授权，包括署名及适用的相同方式共享要求。',
      },
      {
        title: '服务变更',
        body: '部分功能取决于外部服务的配置与可用性。网站可能更新或暂停维护。条款版本：2026年10月26日。正式公开前，运营者需要完善主体、联系和支持信息。',
      },
    ],
  },
};
