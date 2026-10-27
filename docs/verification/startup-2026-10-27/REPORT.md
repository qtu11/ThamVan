# Kiểm chứng bản nâng cấp startup — 27/10/2026

Workspace: `D:\thamvan`. Không có Git repository ở root tại thời điểm bắt đầu. Bản chụp các file giao diện gốc nằm tại `docs/snapshots/20261027-212152-startup-redesign`; hậu tố `.snapshot` tránh để TypeScript biên dịch bản sao.

## Kết quả đã kiểm chứng

| Hạng mục | Kết quả | Phạm vi |
| --- | --- | --- |
| `npm run lint` | Đạt | ESLint toàn dự án |
| `npm run typecheck` | Đạt | TypeScript, gồm route và test mới |
| `npm test` | 12 file, 73 bài đạt | Logic, nguồn ảnh, OAuth, SQL/RLS, chữ ký và thương mại |
| `npm run build` | Đạt | Next.js 16.4.3, production Webpack, 20 static outputs và các route động |
| E2E production | 24 ca đã kiểm chứng đạt sau kiểm tra lại | Toàn bộ bộ kiểm tra hiện tại và 6 ca startup |
| Axe WCAG 2 A/AA, 2.1 AA | Không có vi phạm trong các trang được kiểm tra | Trang chủ, cảnh Ba Son, trang tuyến, checkout, đối tác, hành trình và các trang cũ được test |
| Responsive | Đạt phạm vi test | Trang chủ 320/390/768/1024/1440; các màn hình chính ở 320px và ba ngôn ngữ |
| WebGL thật | Đạt | Một canvas, camera đổi cảnh, tắt/bật, giảm chuyển động, không hỗ trợ WebGL, context loss và ảnh dự phòng |
| Không JavaScript | Đạt luồng xem | Poster, trang chủ, liên kết tới danh sách và xem mẫu tuyến |
| Hộ chiếu | Đạt | Tự đánh dấu, giữ sau reload, tải file; không giả xác minh vị trí |
| Thanh toán | Đạt kiểm tra local/mô phỏng | Không tin giá client, CSRF, consent, khớp provider response, HMAC vector của payOS, chống giả payload |
| SQL thương mại | Đạt PostgreSQL PGlite | Giá/SKU/slug constraints, RLS, quyền service, pending reuse, row lock, webhook lặp, mismatch, hoàn tiền và xóa liên kết tài khoản |
| Giao nội dung | Đạt phạm vi local | Khách chỉ xem mẫu, tải bị chặn; quyền trả phí được xét qua trạng thái paid phía server |

E2E dùng `PLAYWRIGHT_BASE_URL=http://localhost:3001`, bản `next start` từ build production, tách khỏi dev server 3000. Lượt full cuối đạt 22/24; một ca gặp `net::ERR_NO_BUFFER_SPACE` của Chromium, một ca cũ giả định GPS bị từ chối thì IP lookup cũng không có dữ liệu. Đã mô phỏng IP lookup không khả dụng cho ca kiểm tra fallback đó, rồi chạy lại 3 ca liên quan bằng một worker: 3/3 đạt. Hợp của các ca thành công bao phủ đủ 24 ca hiện tại. Không mô tả lượt full 22/24 thành một lượt xanh 24/24.

Bộ test cũ đã được cập nhật theo sản phẩm đang chạy: heading trang chủ mới, nút đổi cảnh thay scroll chapters, dữ liệu HCM thay fixture Huế/Hội An/Hà Nội không còn trong runtime, tên nút định vị hiện tại. Chế độ giảm chuyển động dùng cho bài kiểm tra bố cục; chuyển động 3D được kiểm tra riêng với WebGL hoạt động thật. Kiểm tra bản đồ dùng tọa độ giả lập công khai hoặc IP lookup bị chặn để thử đúng điều kiện, không dựa vào vị trí thật của máy.

## Ảnh đã lưu

- `startup-3d-desktop.png`: hero desktop với WebGL thật.
- `startup-3d-bason.png`: cảnh cầu Ba Son.
- `startup-home-desktop.png`: toàn bộ trang desktop.
- `startup-home-mobile.png`: toàn bộ trang mobile 390px.
- `startup-hero-desktop.png`: phương án ảnh tĩnh khi giảm chuyển động.

Ảnh chụp từ bản production local; không phải ảnh mockup. Các file công khai hiện có được dùng lại; không tạo đánh giá, số khách hoặc doanh thu giả.

## Chưa kiểm chứng / chưa kết nối

`npm run env:check` xác nhận thiếu Supabase URL/public key/service-role key, AI và Turnstile; checkout tắt hoặc thiếu cấu hình. Chưa chạy migration 004 trên Supabase cloud. Chưa có tài khoản merchant payOS/key thật, webhook HTTPS thật, người mua thật, giao dịch ngân hàng/hoàn tiền thật, email hỗ trợ được xác nhận hoặc kiểm tra mua với hai tài khoản trên cloud. Các test mô phỏng provider và PGlite không thay cho những bước này.

Giá 69.000đ/149.000đ là giá triển khai ban đầu, chưa được thị trường kiểm chứng. Chưa có khách B2B/hợp đồng, doanh thu được chứng minh, quyền thương mại của toàn bộ ảnh được xác nhận hoặc kiểm tra đi bộ thực địa cho ba tuyến. `COMMERCE_ENABLED` mặc định tắt; giao diện nói rõ chưa mở bán/chưa nhận yêu cầu khi thiếu kết nối. Cần thực hiện `docs/COMMERCE-SETUP.md` trước khi thu tiền công khai.
