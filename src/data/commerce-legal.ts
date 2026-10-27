import 'server-only';
import type { Locale } from '@/lib/types';
import { copy } from '@/lib/locale-copy';
export function commerceLegal(locale: Locale, document: 'privacy' | 'terms') {
  const c = (vi: string, en: string, zh: string) => copy(locale, vi, en, zh);
  return document === 'terms'
    ? [
        {
          title: c(
            'Bộ hướng dẫn số — điều khoản mua riêng',
            'Digital guides — separate purchase terms',
            '数字指南 — 独立购买条款',
          ),
          body: c(
            'Phiên bản mua hàng 2026-10-27-commerce-v1. Giá và các hành trình được bao gồm hiển thị trước khi thanh toán. Đây là nội dung tự khám phá cho một tài khoản, không phải vé, tour có người dẫn hoặc dịch vụ đặt chỗ. Không tự gia hạn. Quyền đọc và tải chỉ mở khi máy chủ xác nhận thanh toán hợp lệ.',
            'Purchase version 2026-10-27-commerce-v1. The total price and included walks are shown before payment. This is self-guided content for one account, not admission, an accompanied tour or a booking service. No automatic renewal. Reading and downloads open only after server-verified payment.',
            '购买版本2026-10-27-commerce-v1。付款前显示总价和包含路线。这是单个账户的自助内容，不是门票、导游团或预订服务，无自动续费。仅在服务器验证付款后解锁阅读和下载。',
          ),
        },
        {
          title: c(
            'Giao nội dung và xử lý sự cố',
            'Delivery and payment issues',
            '内容交付与付款问题',
          ),
          body: c(
            'Bộ đã mua được tìm lại trong trang Hành trình khi đăng nhập đúng tài khoản. Giữ mã đơn nếu tiền đã chuyển nhưng nội dung chưa mở; liên hệ hỗ trợ để đối soát, không cần trả lại lần nữa. Nếu chưa giao được nội dung hoặc thu tiền trùng, người vận hành kiểm tra giao dịch và xử lý giao lại hoặc hoàn tiền phù hợp. Không tự áp dụng điều khoản “không hoàn trong mọi trường hợp”. File đã tải xuống không thể thu hồi từ thiết bị.',
            'Find purchased guides in My journey while signed in to the purchasing account. Keep your order code if payment was sent but access has not opened; contact support for reconciliation instead of paying again. If content is undelivered or a payment is duplicated, the operator reviews the transaction and arranges delivery or an appropriate refund. There is no blanket no-refund rule. Already-downloaded files cannot be recalled.',
            '使用购买账户登录后，可在“我的旅程”找到指南。若已付款但未解锁，请保留订单编号并联系支持核对，无需重复付款。如未交付内容或重复扣款，运营者核查后安排交付或适当退款。不设置一概不退款条款。已下载文件无法从设备收回。',
          ),
        },
        {
          title: c('Kênh hỗ trợ và mở bán', 'Support and activation', '支持与开售'),
          body: process.env.COMMERCE_SUPPORT_EMAIL
            ? c(
                `Hỗ trợ giao dịch: ${process.env.COMMERCE_SUPPORT_EMAIL}. Nêu mã đơn, thời điểm và vấn đề; không gửi mật khẩu, mã OTP hoặc thông tin đăng nhập ngân hàng. Yêu cầu hợp tác là bước tư vấn, chưa phải hợp đồng hoặc báo giá được chấp thuận.`,
                `Order support: ${process.env.COMMERCE_SUPPORT_EMAIL}. Include your order code, time and issue; never send passwords, OTPs or bank login details. A partnership inquiry is not an accepted contract or quote.`,
                `订单支持：${process.env.COMMERCE_SUPPORT_EMAIL}。请提供订单编号、时间和问题，不要发送密码、验证码或银行登录信息。合作咨询不是已接受的合同或报价。`,
              )
            : c(
                'Dịch vụ chưa mở bán; thông tin chủ thể vận hành, kênh hỗ trợ và chính sách thực hiện cần được hoàn tất trước khi kích hoạt thanh toán. Hiện không thu tiền.',
                'Sales are not open. Operator details, support and operational policies must be completed before payments are activated. No payments are currently collected.',
                '尚未开售。启用付款前需完善运营主体、支持和执行政策，目前不收款。',
              ),
        },
      ]
    : [
        {
          title: c('Đơn hàng và thanh toán', 'Orders and payments', '订单和支付'),
          body: c(
            'Khi bạn chọn mua, website lưu mã đơn, tài khoản, SKU, tổng tiền, trạng thái, mã giao dịch, phiên bản điều khoản mua và thời điểm đồng ý. Mã đơn, số tiền và mô tả sản phẩm được chuyển đến payOS để tạo trang thanh toán. THÁM VĂN không yêu cầu hoặc lưu mật khẩu ngân hàng hay mã OTP. Đơn được đối soát bằng webhook có chữ ký. Khi xóa tài khoản, liên kết tài khoản khỏi đơn được bỏ; dữ liệu giao dịch còn được giữ theo chính sách vận hành và nghĩa vụ áp dụng.',
            'When you buy, the website stores an order code, account link, SKU, total, status, transaction reference, purchase-terms version and consent time. The order code, amount and product description are sent to payOS to create checkout. THÁM VĂN does not request or store bank passwords or OTPs. Signed webhooks reconcile payments. Deleting an account detaches its order link; transaction records remain subject to operational retention and applicable obligations.',
            '购买时，网站保存订单编号、账户关联、SKU、总价、状态、交易参考号、购买条款版本和同意时间。订单编号、金额和产品描述发送至payOS创建收银台。THÁM VĂN不要求或存储银行密码或验证码，通过签名回调核对付款。删除账户会解除订单关联，交易记录按运营保留政策及适用义务处理。',
          ),
        },
        {
          title: c(
            'Yêu cầu hợp tác và hộ chiếu',
            'Partnership inquiries and passport',
            '合作请求与护照',
          ),
          body: c(
            'Form hợp tác lưu tên, email, tổ chức, nhóm khách, đề bài, ngôn ngữ và thời điểm đồng ý để phản hồi yêu cầu. Không tự đăng ký email vào quảng cáo hoặc newsletter. Chủ vận hành cần công bố thời hạn lưu và đầu mối yêu cầu sửa/xóa trước khi mở form công khai. Dấu hộ chiếu tự đánh dấu được lưu trong localStorage trên trình duyệt, không xác minh vị trí và không đồng bộ; xóa dữ liệu trang sẽ xóa các dấu này.',
            'The inquiry form stores your name, email, organization, segment, brief, language and consent time to respond to the request. It does not subscribe you to advertising or newsletters. The operator must publish retention periods and a correction/deletion contact before opening public inquiries. Self-marked passport stamps are stored in browser localStorage, are not location-verified or synced, and are removed when site data is cleared.',
            '咨询表单保存姓名、邮箱、组织、类别、需求、语言和同意时间，仅用于回复请求，不自动订阅广告或新闻邮件。公开表单前运营者须公布保留期限和修改/删除联系方式。手动护照印章存于浏览器localStorage，不验证位置或同步，清除网站数据后印章也会删除。',
          ),
        },
      ];
}
