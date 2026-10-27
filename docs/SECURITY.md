# Bảo mật và ranh giới tin cậy

Cập nhật Google OAuth 27/10/2026: xem `GOOGLE-AUTH.md` và migration 003. Google dùng PKCE qua Supabase, xác nhận điều khoản riêng sau khi tạo hồ sơ; chưa consent bị chặn ở API/RLS/RPC. Xóa tài khoản Google yêu cầu OAuth AMR đã được xác minh trong 5 phút và xác nhận email/DELETE; không dựa vào dữ liệu client hoặc chỉ thời gian refresh JWT.

## Tài sản

Email và phiên đăng nhập, dữ liệu hành trình riêng, lựa chọn vị trí/camera, ảnh người dùng, điểm thử thách, quyền quản trị và bí mật dịch vụ.

## Các ranh giới

| Ranh giới               | Biện pháp                                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Trình duyệt → API       | Same-origin Origin/Fetch Metadata, kiểm tra auth mỗi endpoint, Zod, giới hạn body stream, lỗi theo mã không trả stack trace               |
| API → Supabase          | Cookie HttpOnly/SameSite=Lax/Secure production, xác minh user bằng Auth server, truy vấn theo user, RLS và column grants                  |
| Người thường → quản trị | Role nằm bảng `user_roles` do người vận hành cấp, không đọc role từ user metadata; API và database đều kiểm tra                           |
| Client → điểm thưởng    | Không có quyền insert/update progress trực tiếp; RPC xác minh đáp án trong schema private, row lock và trạng thái hoàn tất chống cộng lặp |
| Ảnh → AI                | Đăng nhập, consent, file signature/MIME/size, timeout 45s, quota Postgres, input ảnh là dữ liệu không phải chỉ thị                        |
| AI → giao diện          | Parse JSON với schema có độ dài giới hạn; lọc ID theo catalog; React escape toàn bộ text; không nhận HTML hoặc lệnh                       |
| Quản trị → nội dung     | Validation nguồn HTTPS, ảnh cùng project hoặc path tĩnh, nhãn kiểm chứng, quyền RLS, nhật ký, workflow draft trước publish thử thách      |

Không có Supabase browser client: token phiên không cần localStorage hoặc JavaScript client. Module Supabase/secret/DAL dùng `server-only`. Publishable key là định danh công khai; service role và vision key chỉ server đọc. `.env*` bị ignore, chỉ `.env.example` được phép theo dõi.

CSP dùng nonce khác nhau mỗi response, `strict-dynamic`, chặn object/frame ancestry/base URI ngoài trang; production không có `unsafe-eval`. Cho phép style inline phục vụ Leaflet/Next. Frame chỉ cho Turnstile; ảnh bản đồ chỉ từ OpenStreetMap và project Supabase đã cấu hình. Security headers áp dụng qua Next config; dữ liệu động `private, no-store`, không cache phiên ở CDN.

Origin tin cậy là biến `NEXT_PUBLIC_SITE_URL`; không có wildcard CORS. Các callback auth dùng origin cấu hình và giới hạn route `next` nội bộ. Cookie refresh được chuyển cả vào request mới và response.

Giới hạn AI 10 lượt/24h/tài khoản, quiz 30/giờ, báo sai 5/giờ trong Postgres. Auth dựa trên giới hạn Supabase cộng Turnstile bắt buộc ở production. Không dùng bộ đếm RAM làm hạn mức phân tán.

## Trước khi vận hành thật

Áp dụng migration/RLS trong project thật; kiểm tra Auth SMTP/redirect/Turnstile. Bật HTTPS, backup và lịch retention. Cấp admin theo nguyên tắc tối thiểu. Kiểm tra các API với 2 tài khoản độc lập. Chọn nhà cung cấp/model nhận diện hỗ trợ JSON, xác minh chính sách giữ ảnh. Công bố pháp nhân/liên hệ/quy trình hỗ trợ và chính sách backup phù hợp. Cấu hình giới hạn request trên hạ tầng để giảm lưu lượng đến app; server-side quota không ngăn toàn bộ DDoS.

PGlite kiểm chứng SQL trên PostgreSQL; chưa chứng minh dịch vụ Supabase đang chạy đúng migration hoặc cookie SMTP hoạt động trên domain thật. Không có key thật trong lần bàn giao nên chưa chạy đăng nhập/khôi phục/xóa tài khoản và AI end-to-end với nhà cung cấp.
