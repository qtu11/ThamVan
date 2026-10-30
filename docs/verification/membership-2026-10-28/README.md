# Kiểm chứng membership — 28/10/2026

Workspace: D:\thamvan. Baseline commit: 7f8ee55. Bản sửa nằm trong working tree, chưa commit/deploy.

| Kiểm tra | Kết quả |
| --- | --- |
| ESLint | Pass |
| TypeScript | Pass, riêng và trong production build |
| Unit / route / PostgreSQL PGlite | 91/91 pass, 15 files |
| Production build Next16.4.3 webpack | Pass |
| Chromium E2E toàn bộ | 26/26 pass, không retry, khoảng 1.6 phút |
| Responsive | 320, 390, 768, 1024, 1440 px; các trang mới không tràn ngang |
| Accessibility | Axe WCAG2A/AA/2.1AA trên dashboard, các tab, checkout và admin preview; đã sửa màu phụ không đủ tương phản |
| Khảo sát website mẫu | Qua trình duyệt khách, xem PRODUCT-AND-REVENUE |
| Env readiness | Supabase, payOS, SePay, AI, VAPID và Turnstile còn thiếu; không in giá trị secret |
| Runtime xem trước | Production local tại localhost:3000 |

## SQL và thanh toán đã kiểm tra thực trong PostgreSQL cục bộ

Áp dụng đủ migration 001–008. Giá phía server, idempotency callback, sai số tiền/currency/reference, gia hạn nối tiếp, hết hạn, thu hồi sau hoàn và callback lặp không mở lại; SQL/RLS chặn sửa trạng thái thanh toán và service RPC từ khách; Family chủ +3 người, token một lần, rời/owner hết hạn mất quyền chia sẻ; Free 5 thử thách/ngày; pending địa điểm giữ riêng, admin duyệt xuất bản đúng một lần; GPS session riêng, chống nhảy vị trí, ngừng phiên; AI Family only; phí thiếu trả profit=null; quyền người chưa đồng ý điều khoản; bookmark HCM và xóa quota khi xóa account.

Route tests dùng provider response mô phỏng để kiểm tra ranh giới, gồm HMAC/secret, SePay captured/approved/exact VND và không đưa số thẻ vào ledger. Đây không phải provider sandbox hoặc giao dịch live.

## Kiểm tra trình duyệt

Dashboard 8 tab, đúng 3 plan/giá/tháng/4 người, guest không ghi dữ liệu hoặc mua gói, các state dịch vụ chưa cấu hình, admin không có số liệu giả, file PWA và service worker không cache dữ liệu riêng. Bộ hồi quy còn kiểm tra tìm kiếm/ảnh/camera giả lập/bản đồ/3D và ngôn ngữ. Video GPS và push trên iPhone/Android thực cần tài khoản + cấu hình thật, chưa kiểm chứng thiết bị.

## Ảnh lưu

- [Khách — desktop](membership-dashboard-desktop.png)
- [Khách — mobile](membership-dashboard-mobile.png)
- [Admin — desktop](membership-admin-desktop.png)

Giữ phân biệt: code + local tests đã đạt; cloud migration, auth/provider callbacks, dòng tiền thực, chất lượng AI và quyền/hiển thị push trên điện thoại chưa được chứng minh. Xem [vận hành](../../MEMBERSHIP-OPERATIONS.md) cho bước kích hoạt.

