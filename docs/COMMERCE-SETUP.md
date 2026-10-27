# Kích hoạt bán hàng THÁM VĂN

27/10/2026. Mặc định `COMMERCE_ENABLED=false`. Không bật khi mới chỉ build thành công.

## Cấu hình và dữ liệu

1. Dùng Supabase project thật, cấu hình Auth, SMTP, origin HTTPS và Turnstile theo README.
2. Áp dụng tuần tự migrations 001, 002, 003, rồi `supabase/migrations/202610270004_commerce.sql`. 004 là migration tạo mới, chạy một lần bằng công cụ migration/SQL Editor; không tự chạy khi mở website.
3. Đặt `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Không đưa service-role key vào client hoặc `NEXT_PUBLIC_*`.
4. Tạo kênh thương mại đã xác minh tại payOS. Đặt `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `COMMERCE_SUPPORT_EMAIL` là email có người nhận và xử lý thực. Không lưu chúng trong tài liệu hoặc gửi qua chat.
5. Đặt webhook `https://DOMAIN/api/payments/payos` trong kênh payOS. Callback được xác thực bằng HMAC của data, không bằng header Origin. Endpoint ghi từ trình duyệt yêu cầu Origin chính xác của `NEXT_PUBLIC_SITE_URL`.
6. Rà soát chủ thể kinh doanh, liên hệ, chính sách mua/hoàn tiền, thuế/hóa đơn, giấy phép ảnh và tuyến thực địa. Quyền vào cửa không được bán kèm bộ hướng dẫn số.
7. Kiểm tra `npm run env:check`, build lại khi đổi biến public. Chỉ đặt `COMMERCE_ENABLED=true` sau khi sẵn sàng vận hành và triển khai lại.

Tham chiếu triển khai: [payOS API](https://payos.vn/docs/api/), [chữ ký payment-requests](https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature/), [webhook](https://payos.vn/docs/du-lieu-tra-ve/webhook/), [return URL](https://payos.vn/docs/du-lieu-tra-ve/return-url/). Cần kiểm tra lại với phiên bản nhà cung cấp khi kích hoạt.

## Đơn hàng và giao nội dung

- `/api/checkout` chỉ nhận SKU và slug, không tin giá từ client. Database kiểm tra cặp SKU/giá/slug, giới hạn sáu đơn mỗi giờ mỗi tài khoản và dùng lại đơn pending trong 14 phút.
- Đơn có mã số do database sinh; link payOS hết hạn sau 15 phút. Server lưu link trước khi trả URL về trình duyệt. Không gửi email hoặc thông tin ngân hàng cho provider từ form mua; nội dung request là mã đơn, SKU và tổng tiền.
- `/api/payments/payos` kiểm tra chữ ký, code thành công, số tiền, loại tiền, mã link và reference. RPC dùng row lock để hoàn tất một lần, chống webhook lặp. Webhook mẫu có chữ ký nhưng không khớp đơn được nhận mà không cấp quyền.
- `status=PAID` trên URL quay về không có giá trị cấp quyền. Trang order chỉ đọc đơn thuộc tài khoản hiện tại. Nội dung đầy đủ và file tải được kiểm tra quyền tại server.
- Trạng thái pending không phải đã thu tiền. Nếu provider timeout hoặc DB lỗi sau khi provider tạo link, giữ mã đơn để đối soát; không xác nhận thành công cho khách.
- Tài khoản mua cần có đường dẫn tìm lại bộ đã mua trong trang Hành trình. Bộ collection mở cả ba tuyến hiện có, không tự hứa mở mọi sản phẩm tương lai.

## Yêu cầu hợp tác

`/api/business-leads` xác thực payload, Origin, consent và Turnstile ở production; giới hạn ba yêu cầu/email/giờ trong PostgreSQL. Chỉ hiển thị thành công sau khi RPC lưu thành công. Khi chưa cấu hình, form nói rõ chưa gửi và cho tải mẫu đề bài cục bộ. Không tự gửi mail, không có danh sách nhận newsletter.

Quản trị được cấp quyền hiện có mở `/{locale}/admin/commerce` để xem tối đa 100 đơn và 100 yêu cầu gần nhất. Đây là hộp thư vận hành đọc dữ liệu; chưa có CRM, gửi mail, hóa đơn, hoàn tiền tự động hoặc báo cáo phân tích marketing. Theo dõi hộp thư thường xuyên nếu mở form nhận yêu cầu công khai.

## Hoàn tiền và dữ liệu

Không tự chuyển tiền hoàn bằng mã website. Người vận hành xác minh yêu cầu, thực hiện hoàn tiền qua kênh provider/ngân hàng và lưu chứng từ, sau đó dùng SQL/service role:

```sql
select public.record_commerce_refund('UUID_DON_HANG', 'MA_CHUNG_TU_HOAN_TIEN');
```

Chỉ dùng sau khi **đã xác nhận hoàn toàn bộ tiền**. Hàm đổi đơn paid sang refunded để ngừng cấp quyền đọc/tải; webhook paid gửi lại không tái mở quyền. File khách đã tải xuống không thể thu hồi. Hoàn một phần, tranh chấp và đối soát tự động chưa triển khai.

Đơn lưu phiên bản điều khoản mua `2026-10-27-commerce-v1` và thời điểm đồng ý; form mua yêu cầu đồng ý riêng. Xóa tài khoản bỏ liên kết `user_id` của đơn để không làm hỏng luồng xóa hiện có. Chứng từ giao dịch giữ để xử lý nghĩa vụ vận hành theo chính sách do chủ thể kinh doanh xác định; không thu thập tài khoản ngân hàng người mua vào bảng riêng. Yêu cầu B2B lưu email, tên, tổ chức, mục đích, đồng ý và trạng thái; chủ vận hành cần xác định thời hạn xóa và kênh xử lý yêu cầu dữ liệu trước khi mở công khai. Hộ chiếu lưu riêng trong localStorage; không đồng bộ lên server.

## Kiểm chứng bắt buộc trước khi nhận tiền thật

- Đăng nhập A/B, người A mua tuyến 1: chỉ A đọc/tải đủ tuyến 1; B và khách không được đọc nội dung còn khóa. Mua collection mở đúng ba bộ.
- Thanh toán thử mức nhỏ được phép bằng tài khoản vận hành theo hướng dẫn payOS. Kiểm tra webhook HTTPS thực, quay về trước/sau webhook, link hết hạn, refresh, reconnect và khôi phục quyền sau đăng nhập lại.
- Gửi lặp webhook thật: không tạo thêm đơn/quyền. Sửa chữ ký, amount, currency, link ID hoặc reference: không cấp quyền. Thay query return URL thành PAID: không cấp quyền.
- Xác nhận hoàn tiền thật rồi ghi refund: quyền web bị thu hồi; gửi lại webhook trước hoàn không mở lại.
- Gửi một yêu cầu B2B trên môi trường triển khai, thấy đúng nội dung trong trang admin; kiểm tra fail Turnstile và SQL/RLS.
- Xác nhận liên hệ hỗ trợ, chính sách hoàn tiền, quyền ảnh, nội dung biên tập và tuyến đi thực tế trước khi chạy quảng cáo.

Các bài test local về chữ ký/RLS/transaction không thay các kiểm tra cloud và giao dịch thực này.
