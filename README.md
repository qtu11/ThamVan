# THÁM VĂN

Website Next.js App Router + TypeScript + Supabase cho sản phẩm **“Chạm để hiểu di sản Việt”**, xây từ đặc tả Word và bộ nhận diện trong `asset/`.

## Bản nâng cấp startup — 27/10/2026

Giao diện mới dùng hệ chữ, màu, thẻ và điều hướng thống nhất; trang chủ 3D đổi cảnh bằng nút Bạch Đằng/Ba Son/Landmark, bộ tìm hành trình theo gu, hộ chiếu tự đánh dấu trên thiết bị, bảng giá và kênh B2B. `/` đi thẳng vào trang chủ theo ngôn ngữ đã chọn; phần giới thiệu vẫn có ở `/vi/welcome`.

- `/vi/experiences`: ba bộ hướng dẫn tự khám phá; nhiệm vụ đầu tiên đọc miễn phí.
- `/vi/checkout`: Bản Premium 39.000đ (39k) hoặc Saigon Collection 89.000đ; đi kèm 111 gói khám phá di sản miễn phí trong danh mục. Giá triển khai ban đầu, chưa kiểm chứng bằng thị trường.
- `/vi/orders/:id`: trạng thái đơn do máy chủ xác nhận; URL quay về không tự mở quyền.
- `/vi/partners`: nhận đề bài trường học/khách sạn/đội ngũ khi đã có lưu trữ và CAPTCHA; nếu chưa cấu hình thì chỉ tải mẫu cục bộ.
- `/vi/journey`: hộ chiếu trên trình duyệt, thư viện đã mua và đơn gần đây cho tài khoản đăng nhập.
- `/vi/admin/commerce`: quản trị xem đơn hàng và yêu cầu hợp tác, tối đa 100 bản ghi mỗi loại.

Mở [mô hình doanh thu và đối chiếu thị trường](docs/STARTUP-STRATEGY.md), [hướng dẫn kích hoạt thanh toán, webhook và hoàn tiền](docs/COMMERCE-SETUP.md). Cần migration `202610270004_commerce.sql`, cấu hình payOS, hỗ trợ khách và kiểm tra cloud thực tế. Mặc định chưa mở bán; phần mềm không giả lập đã nhận tiền hoặc đã gửi yêu cầu. Dấu hộ chiếu không phải xác minh GPS và không có giá trị đổi thưởng.

## Chạy ngay

Khuyến nghị **Node.js 24 LTS**, npm 11. Dự án đã có `.env` với giá trị trống, không chứa key thật.

```powershell
npm ci --ignore-scripts
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) để vào trang chủ theo ngôn ngữ đã chọn. Hướng dẫn giới thiệu có ở `/vi/welcome`. Trang chủ trực tiếp: [http://localhost:3000/vi](http://localhost:3000/vi).

Khi chưa có key: đọc bộ tư liệu tham khảo, tìm kiếm, đổi ngôn ngữ, bản đồ, tính khoảng cách, tùy chọn thiết bị, chụp/chọn ảnh xem trước đều dùng được. Đăng nhập, lưu đồng bộ và AI không giả lập thành công.

Trang chủ có **đô thị TP.HCM 3D** với cao ốc, sông và ba nút chọn góc nhìn; hỗ trợ tắt chuyển động và ảnh dự phòng. Xem [hướng dẫn mô hình, hiệu ứng và tạo lại ảnh](docs/HCM-3D.md). Đây là mô hình nghệ thuật, không phải bản đồ vị trí thực tế; không cần key để xem.

## Kết nối Supabase

1. Tạo project Supabase mới. Điền `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` vào `.env`.
2. Mở SQL Editor, chạy lần lượt:
   - `supabase/migrations/202610260001_initial.sql`
   - `supabase/migrations/202610260002_retention.sql`
   - `supabase/migrations/202610270003_google_auth_consent.sql`
   - `supabase/seed.sql`
3. Trong Authentication → URL Configuration: Site URL là `http://localhost:3000` khi phát triển; thêm `http://localhost:3000/auth/callback` và `http://localhost:3000/auth/confirm` vào redirect allowlist. Khi deploy, thay bằng domain HTTPS thật và đặt lại `NEXT_PUBLIC_SITE_URL`.
4. Bật xác minh email. Đặt mật khẩu tối thiểu 12 ký tự; bật kiểm tra mật khẩu bị lộ nếu gói Supabase hỗ trợ. Cấu hình SMTP thật trước khi mở đăng ký công khai.
5. Mẫu email hoạt động xuyên thiết bị nên dùng token hash thay cho đường dẫn PKCE mặc định:

   Xác nhận đăng ký:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/vi"
     >Xác nhận email</a
   >
   ```

   Khôi phục mật khẩu:

   ```html
   <a
     href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/vi/auth/reset"
     >Đặt lại mật khẩu</a
   >
   ```

   `/auth/callback` vẫn hỗ trợ trao đổi code PKCE khi xác nhận trên cùng trình duyệt. Đường dẫn `next` chỉ chấp nhận các route nội bộ `/vi`, `/en`, `/zh`.

6. Điền `SUPABASE_SERVICE_ROLE_KEY` nếu muốn xóa tài khoản từ giao diện. Key này chỉ được đọc trong module `server-only`, không dùng để truy vấn dữ liệu người dùng thông thường.
7. Khởi động lại dev server sau khi đổi `.env`. Nếu build production, build lại vì các biến `NEXT_PUBLIC_*` được đóng gói lúc build.

```powershell
npm run env:check
```

Lệnh chỉ báo có/thiếu cấu hình, không in key. Migration phải chạy riêng; điền key không tự tạo database.

## Đăng nhập Google

Đã có nút Google ở đăng nhập/đăng ký, PKCE callback, tạo hồ sơ và bước xác nhận điều khoản trước khi sử dụng tài khoản. Tài khoản Google có thể xóa bằng xác thực OAuth gần đây, không cần tạo mật khẩu riêng.

Làm theo **[hướng dẫn Google OAuth và SQL](docs/GOOGLE-AUTH.md)**. Nếu đã chạy 001/002 trước đó, chỉ chạy thêm `202610270003_google_auth_consent.sql`; không chạy lại migration khởi tạo. Điền Google Client ID/Secret trong **Supabase → Authentication → Providers → Google**, rồi đặt `AUTH_GOOGLE_ENABLED=true` trong `.env`. Không đưa Google Client Secret vào biến public hoặc source client.

## Cấu hình chống lạm dụng khi deploy

Tạo Cloudflare Turnstile widget cho đúng domain, điền cả `NEXT_PUBLIC_TURNSTILE_SITE_KEY` và `TURNSTILE_SECRET_KEY`. Đăng nhập, đăng ký, quên mật khẩu và xóa tài khoản **yêu cầu Turnstile khi `NODE_ENV=production`**. Local development không bắt buộc. Token được xác minh server và kiểm tra hostname. Không bật CAPTCHA của Supabase song song với widget tùy biến này nếu chưa tích hợp thêm `captchaToken` vào Auth options.

Supabase Auth có giới hạn riêng; nên cấu hình Auth Rate Limits cho môi trường thực. AI có quota 10 lượt/tài khoản/24 giờ trong Postgres, câu trả lời 30 lượt/giờ, báo sai 5 lượt/giờ. Điểm thử thách được ghi server trong transaction với row lock, chỉ cộng một lần.

## Nhận diện ảnh

Điền `VISION_API_KEY`, `VISION_MODEL`, `VISION_API_URL` (mặc định OpenAI Chat Completions). Model phải hỗ trợ ảnh và JSON object response. Endpoint phải HTTPS, do chủ vận hành cấu hình, không nhận URL endpoint từ người dùng.

Ảnh JPG/PNG/WebP tối đa 5 MB; server kiểm tra chữ ký file, giới hạn stream đầu vào và timeout. Ảnh được giải mã với trần 24 triệu pixel, thu nhỏ tối đa 1600 px và loại EXIF/GPS trước khi gửi. Người dùng phải đăng nhập và đồng ý gửi ảnh cho nhà cung cấp. Ảnh không được ghi vào database/storage, không được log hoặc công khai. Chính sách lưu của nhà cung cấp là độc lập; bổ sung tên/điều khoản nhà cung cấp trong chính sách trước khi vận hành.

Kết quả AI chỉ có quan sát và tối đa ba gợi ý từ danh mục hiện có. Không sử dụng tên file để nhận diện, không sinh điểm tin cậy giả, không xem kết quả là thẩm định chuyên gia. Model có thể nhầm; đối chiếu nguồn trên trang tư liệu. Danh mục gửi vào prompt hiện giới hạn 100 bản ghi; khi mở rộng cần thêm tầng retrieval.

Camera/định vị cần HTTPS hoặc localhost. Thông báo gần chỉ chạy khi trang chủ đang mở, có quyền vị trí và thông báo; không có theo dõi vị trí hay thông báo đẩy chạy nền. Không phải geofencing native.

## Quản trị nội dung

Đăng ký và xác nhận email cho tài khoản quản trị, sau đó tự cấp quyền trong SQL Editor:

```sql
insert into public.user_roles(user_id, role)
select id, 'admin' from auth.users
where email = 'THAY_BANG_EMAIL_QUAN_TRI'
on conflict(user_id) do nothing;
```

Mở `/vi/admin` (hoặc `/en/admin`, `/zh/admin`). Chỉ tài khoản có dòng `admin` được truy cập; metadata đăng ký không thể tự cấp quyền.

- **Tư liệu:** thêm/chỉnh JSON có validation, đủ ba ngôn ngữ, nguồn, tọa độ và giấy phép ảnh. `status`: `draft`, `published`, `archived`. `verification`: `reference`, `reviewed`. Chỉ `published` hiển thị công khai. Dùng `archived` để ẩn thay vì xóa dữ liệu liên quan.
- **Ảnh mới:** đặt ảnh đã được cấp quyền trong `public/images/` trước build, hoặc tải vào bucket công khai của chính project Supabase và điền HTTPS URL; lưu tác giả/giấy phép/nguồn. Không mở upload tùy ý cho khách. Ảnh chưa có không được thay bằng ảnh sai địa điểm.
- **Thử thách:** chỉnh nội dung câu hỏi, đúng bốn lựa chọn mỗi ngôn ngữ; xác nhận đáp án A–D ở trường riêng. Đáp án không xuất hiện ở API công khai. Quá trình ghi giữ bản nháp đến khi đáp án lưu thành công, rồi mới xuất bản.
- **Phản hồi:** xử lý/đóng các báo sai. Nhật ký ghi ID người quản trị, đối tượng, loại thao tác và thời điểm, không sao chép nội dung nhạy cảm vào log.

UI hiện tải tối đa 500 tư liệu, 200 thử thách, 200 phản hồi và 100 sự kiện quản trị gần nhất. Danh mục khám phá phân trang 9 bản ghi. Cần mở rộng truy vấn/phân trang server khi vượt quy mô này.

## Nội dung và hình ảnh

Seed có 6 tư liệu: Huế, Hội An, Mỹ Sơn, Hạ Long–Cát Bà, Thăng Long, Tràng An; và 2 thử thách học tập. Đây là **bộ tư liệu tham khảo được biên soạn**, chưa phải database chuyên gia thẩm định. Không có voucher hay quyền lợi tài trợ giả. Các chủ đề chưa có dữ liệu hiển thị trạng thái trống.

Nội dung tóm tắt dựa trên hồ sơ UNESCO; tọa độ tham khảo có provenance trong manifest, không phải tọa độ cổng vào. Tên riêng Việt Nam giữ nguyên khi chuyển ngôn ngữ. Bộ ảnh đúng đối tượng được đối chiếu bằng mắt và lưu giấy phép/ghi công tại `asset/heritage/attribution.json`; trang `/vi/credits` hiển thị nguồn. Ảnh không bị chỉnh sửa; UI có thể crop khi hiển thị, file gốc tải về vẫn được giữ.

Mapping: `asset/heritage/<file>` → `public/images/<file>`. Logo từ `asset/logo.png`. Các poster thiết kế chỉ làm tham chiếu, không được nhúng thành giao diện. Tư liệu nội dung cần chuyên gia kiểm duyệt trước khi gắn nhãn `reviewed`.

```powershell
npm run assets:sync
npm run db:seed:generate
```

Hai lệnh dành cho cập nhật có kiểm soát; nguồn trực tuyến có thể thay đổi nên cần rà soát lại ảnh/giấy phép. Seed dùng `on conflict do nothing`, không ghi đè bản ghi đã được quản trị sửa.

## Kiểm tra và build

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

E2E mặc định dành cho trạng thái `.env` chưa có key; dùng context trình duyệt tách biệt. `npm test` chạy cả unit test và PostgreSQL thật bằng PGlite, giả lập schema `auth` để kiểm tra SQL/RLS; không thay thế kiểm tra Supabase Auth trực tiếp.

Build production và chạy:

```powershell
npm run build
npm run start
```

Triển khai Vercel hoặc Node server hỗ trợ Next.js. Đặt origin chính xác; API ghi kiểm tra Origin bằng `NEXT_PUBLIC_SITE_URL`, không dựa trên Host do client gửi. Truy cập qua `localhost` khi `.env` dùng localhost. Nếu triển khai sau reverse proxy, giữ nguyên HTTPS origin, chuyển tiếp cookie và không cache response cá nhân. Cấu hình body limit 6 MB cho endpoint nhận diện và 64 KB cho các endpoint JSON ở proxy/WAF.

## Vận hành dữ liệu

Ảnh địa điểm TP.HCM: chạy `npm run images:audit` để kiểm tra, `npm run images:repair` để lưu trữ ảnh sai/lặp và cập nhật báo cáo. Xem [quy trình ảnh](docs/PLACE-IMAGES.md). Bộ dữ liệu thiếu ảnh giữ trạng thái thiếu; không sinh thẻ tiêu đề thành ảnh chụp hoặc dùng ảnh chung để lấp chỗ trống.

Thư viện đối chiếu ở `/images/_thamvan_reports/index.html`, tìm/lọc/phân trang đủ 1.505 bản ghi và vẫn đọc được khi không có JavaScript. Cập nhật 27/10/2026: 409 ảnh qua kiểm tra chủ thể, còn 1.096 mục thiếu; danh tính và quyền sử dụng chưa được duyệt đầy đủ. Ảnh tìm từ web/Commons/album chỉ vào vùng chờ, sau khi xem từng file mới chạy `npm run images:finalize`. Audit/finalizer đồng bộ mapping vào danh mục HCM cục bộ, giữ nguyên nội dung khác và không tự xuất bản Supabase. Không tự khôi phục ảnh đã loại từ tên file hoặc tự gán tác giả/giấy phép. Chi tiết ở `docs/PLACE-IMAGES.md`.

Dev/build dùng Webpack theo CLI của Next.js cài trong dự án, sau khi native Turbopack bị lỗi tiến trình trên máy này. `npm run check` đã chạy đạt với cấu hình hiện tại; xem log trong `docs/verification/`.

Migration retention cung cấp `public.prune_operational_data()`, chỉ service role có quyền gọi. Đặt lịch hằng ngày trong Supabase Cron (bật pg_cron từ Dashboard trước):

```sql
select cron.schedule('tham-van-retention', '17 3 * * *',
  'select public.prune_operational_data()');
```

Xóa counter hết hạn sau 30 ngày, phản hồi đã đóng sau 180 ngày, audit sau 365 ngày. Xóa tài khoản cascade hồ sơ/lưu/tiến độ/phản hồi và xóa counter của tài khoản; audit bỏ liên kết người dùng. Chính sách backup do project Supabase thực tế quyết định, cần công bố trước khi mở công khai. Export gồm hồ sơ, email, nội dung đã lưu, tiến độ và phản hồi do người dùng gửi.

Xem `docs/SECURITY.md`, `docs/TEST-REPORT.md` và đặc tả trích xuất `docs/product-spec.txt` để biết phạm vi, kiểm chứng và phần cần test với key thật.

Hồ chí minh:
Quận 10
Quận 5
TP Thủ Đức
Quận 11
Hóc Môn
Bình Dương
Quận 3
Quận 1
Bình Thạnh
Gò Vấp
Vũng Tàu
Quận 4
Củ Chi
Côn Đảo
Cần Giờ
Phú Nhuận
Quận 6
Tân Bình
Bình Chánh
Bình Tân
Tân Phú
Quận 7
Quận 12
Nhà Bè
Quận 8
Hồ Tràm

## Membership update — 28/10/2026

Current consumer offers are Free, Premium 39,000 VND/month and Premium Family 89,000 VND/month for four members. New one-time guide checkout is retired; verified legacy guide rights are preserved.

- Customer workspace: `/vi/dashboard`
- Operations: `/vi/admin/dashboard` (admin required once Supabase is configured)
- Apply migrations 001–008 in order; checkout remains disabled without required configuration.
- Setup and live verification: [MEMBERSHIP-OPERATIONS.md](docs/MEMBERSHIP-OPERATIONS.md)
- Reference-site audit and revenue hypotheses: [THAMVAN-PRODUCT-AND-REVENUE.md](docs/THAMVAN-PRODUCT-AND-REVENUE.md)

Local build/test results do not establish live payments, push delivery, AI-provider operation, or deployed database state.
