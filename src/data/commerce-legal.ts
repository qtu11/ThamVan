import 'server-only';
import type { Locale } from '@/lib/types';
import { copy } from '@/lib/locale-copy';
export function commerceLegal(locale: Locale, document: 'privacy' | 'terms') {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  return document === 'terms'
    ? [
        {
          title: c('Gói thành viên theo tháng', 'Monthly memberships', '月度会员'),
          body: c(
            'Phiên bản 2026-10-28-membership-v1. Chỉ có Free, Premium 39.000đ/tháng và Premium Family 89.000đ/tháng cho tối đa 4 thành viên gồm chủ gói. Free được tham gia và hoàn thành tối đa 5 thử thách mỗi ngày theo giờ Việt Nam. Gói trả phí không giới hạn số thử thách; giới hạn kỹ thuật chống lạm dụng vẫn áp dụng. Family thêm gợi ý lịch trình AI.',
            'Version 2026-10-28-membership-v1. Three plans: Free, Premium at VND39,000/month and Premium Family at VND89,000/month for up to four members including the owner. Free permits joining and completing up to five challenges per Vietnam calendar day. Paid plans remove that business limit; technical abuse controls still apply. Family adds AI itinerary suggestions.',
            '版本2026-10-28-membership-v1。三种套餐：Free、每月39,000越南盾的Premium及每月89,000越南盾的Premium Family，含主账户最多4人。Free按越南日历每日可参加和完成最多5个挑战，付费套餐无此业务限制，仍适用技术防滥用限制。Family增加AI行程建议。',
          ),
        },
        {
          title: c(
            'Thanh toán, thời hạn và gia hạn',
            'Payment, term and renewal',
            '付款、期限与续费',
          ),
          body: c(
            'Quyền gói mở sau callback hợp lệ trên máy chủ, không dựa vào URL quay về. Mỗi giao dịch cấp một tháng lịch. Gia hạn cùng gói nối tiếp kỳ còn lại; nâng từ Premium lên Family bắt đầu khi xác nhận thanh toán, không tự hoàn hoặc khấu trừ phần Premium còn lại. Chỉ chọn nâng cấp khi đồng ý cách tính này. Không tự gia hạn, không tự trừ tiền. Gói cũ mua một lần vẫn được giữ quyền theo đơn đã xác nhận. Gói tháng gồm nội dung số và chức năng phần mềm, không gồm vé, ăn uống, vận chuyển, đặt chỗ hoặc người dẫn tour.',
            'Access opens only after a valid server callback, never from return-URL parameters. Each payment grants one calendar month. Same-plan renewals extend the remaining term. An upgrade to Family starts at verified payment and does not automatically refund or credit remaining Premium time; choose it only if you accept this. No automatic renewal or charges. Verified legacy one-time purchases retain their rights. Plans provide digital content and software, excluding admission, meals, transport, bookings or an accompanying guide.',
            '仅在有效服务器回调后开通权限，返回网址参数无效。每笔付款提供一个自然月，同套餐续费衔接剩余期限。升级Family自验证付款时开始，不自动退还或抵扣剩余Premium期限，请在同意此计费方式后升级。不自动续费或扣款。已确认的旧一次性购买保留权益。套餐提供数字内容及软件，不含门票、餐饮、交通、预订或导游。',
          ),
        },
        {
          title: c('Sự cố, hoàn tiền và AI', 'Issues, refunds and AI', '问题、退款与AI'),
          body: c(
            'Nếu đã trả tiền nhưng chưa có quyền, giữ mã đơn và liên hệ hỗ trợ để đối soát trước khi trả lại. Khi thu trùng hoặc không giao được quyền đã mua, chủ vận hành kiểm tra và xử lý giao quyền hoặc hoàn tiền phù hợp. Hoàn tiền cần xác nhận từ cổng thanh toán; quyền tương ứng bị thu hồi sau ghi nhận. File đã tải không thể thu hồi. Lịch trình AI là bản gợi ý từ danh mục, cần tự kiểm tra giờ mở cửa, vé, thời tiết và đường đi; không là dịch vụ đặt chỗ hay bảo đảm địa điểm còn hoạt động.',
            'If paid access is missing, keep the order code and contact support for reconciliation before paying again. Duplicate payments or undelivered access are reviewed for fulfilment or an appropriate refund. Refunds require provider confirmation and revoke the associated access once recorded. Downloaded files cannot be recalled. AI itineraries are tentative catalog-based suggestions; check opening hours, tickets, weather and actual routes. They are not bookings or guarantees of current operation.',
            '已付款但缺少权限时，请保留订单号并联系支持核对后再付款。重复付款或未交付权限会经核查后交付或适当退款。退款需支付服务商确认，记录后撤销对应权限。已下载文件无法收回。AI行程是基于目录的建议，请核实开放时间、门票、天气与实际路线，并非预订或运营保证。',
          ),
        },
        {
          title: c('Chủ vận hành & hỗ trợ', 'Operator and support', '运营与支持'),
          body: process.env.COMMERCE_SUPPORT_EMAIL
            ? c(
                `Hỗ trợ: ${process.env.COMMERCE_SUPPORT_EMAIL}. Gửi mã đơn và vấn đề, không gửi mật khẩu, OTP, số thẻ hoặc CVV. Yêu cầu đối tác chưa phải hợp đồng đã ký.`,
                `Support: ${process.env.COMMERCE_SUPPORT_EMAIL}. Send the order code and issue, never passwords, OTPs, card numbers or CVV. A partnership inquiry is not a signed contract.`,
                `支持：${process.env.COMMERCE_SUPPORT_EMAIL}。请提供订单号与问题，勿发送密码、验证码、卡号或CVV。合作咨询不是已签合同。`,
              )
            : c(
                'Chưa mở thu tiền. Cần hoàn tất chủ thể vận hành, hỗ trợ và cấu hình cổng thanh toán trước khi kích hoạt.',
                'Payments are not open. Operator details, support and gateway configuration must be completed before activation.',
                '尚未开放收款，启用前须完善运营主体、支持与支付配置。',
              ),
        },
      ]
    : [
        {
          title: c('Thanh toán và dữ liệu gia đình', 'Payments and family data', '付款与家庭数据'),
          body: c(
            'Website lưu đơn, giá, trạng thái, tham chiếu giao dịch, điều khoản đồng ý và thời hạn gói. VietQR chuyển qua payOS, thẻ Visa/Mastercard qua trang thanh toán SePay khi kênh thẻ được kích hoạt. THÁM VĂN không lưu số thẻ, CVV, OTP hoặc mật khẩu ngân hàng. Chủ Family thấy danh sách thành viên để quản lý chỗ, không tự động thấy GPS hay lịch sử riêng của họ. Xóa tài khoản tách liên kết khỏi sổ giao dịch; dữ liệu tài chính còn giữ theo chính sách vận hành và nghĩa vụ áp dụng.',
            'The site stores orders, prices, statuses, transaction references, consent and membership periods. VietQR uses payOS; Visa/Mastercard uses hosted SePay checkout when its card channel is enabled. THÁM VĂN stores no card numbers, CVV, OTPs or bank passwords. Family owners manage membership seats without automatic access to members’ private GPS or history. Account deletion detaches financial records, retained under operational policy and applicable obligations.',
            '网站保存订单、价格、状态、交易参考、同意记录与会员期限。VietQR使用payOS，Visa/Mastercard在卡通道启用后使用SePay托管收银台。THÁM VĂN不存储卡号、CVV、验证码或银行密码。Family主账户可管理成员席位，不自动查看成员私人GPS或历史。删除账户解除财务记录关联，财务数据按运营政策与适用义务保留。',
          ),
        },
        {
          title: c(
            'GPS, đóng góp, AI và thông báo',
            'GPS, contributions, AI and notifications',
            'GPS、贡献、AI与通知',
          ),
          body: c(
            'Ghi chuyến đi cần bạn đồng ý: các điểm tọa độ, độ chính xác và thời gian được lưu trong tài khoản; chỉ ghi khi trang mở, tự dừng lúc trang ẩn. Bạn có thể xóa chuyến đi và xuất dữ liệu. Tự đánh dấu lượt ghé không xác minh GPS. Video được dựng trên thiết bị từ các điểm đã ghi và chỉ tải khi bạn yêu cầu. Đề xuất địa điểm được admin xem trước, chỉ công khai sau duyệt. Tạo lịch trình gửi lựa chọn sở thích/khu vực và danh mục địa điểm đến dịch vụ AI, không gửi GPS riêng của thành viên. Push lưu endpoint và khóa đăng ký của thiết bị sau khi bạn cho phép; có thể tắt tại dashboard hoặc trình duyệt. iPhone cần cài web lên màn hình chính trên phiên bản hỗ trợ. Dấu hộ chiếu ngoài trang chủ vẫn chỉ lưu trên thiết bị.',
            'Trip recording requires consent and stores coordinates, accuracy and timestamps privately. Recording runs while the page is open and stops when hidden. Trips can be deleted and data exported. Manual visits do not verify GPS. Videos are built on-device from recorded points and downloaded only on request. Admins review submitted places before public approval. AI receives preferences, area and catalog entries, not members’ private GPS. Push stores the device endpoint and subscription keys after permission, and can be disabled in the dashboard or browser. Supported iPhones require Home Screen installation. Homepage passport stamps remain on-device.',
            '旅程记录需同意，私密保存坐标、精度与时间。仅页面打开时记录，隐藏时停止，可删除旅程并导出数据。手动到访不验证GPS。视频由设备根据已记录点生成，按请求下载。提交地点经管理员审核后公开。AI接收偏好、区域及目录，不接收成员私人GPS。Push在许可后保存设备端点与订阅密钥，可在控制台或浏览器关闭。支持的iPhone需安装到主屏幕。首页护照印章仍仅保存在设备。',
          ),
        },
      ];
}
