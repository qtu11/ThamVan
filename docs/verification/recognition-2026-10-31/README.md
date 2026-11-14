# Kiểm chứng luồng AI ảnh, GPS và Google OAuth — 31/10/2026

## Đã đạt tại máy local

- `npm test`: **109/109** kiểm thử, 19 file, gồm API nhận diện, retrieval toàn danh
  mục, xử lý ảnh, OAuth direct/hosted, PostgreSQL/RLS và các hồi quy nghiệp vụ.
- `npm run typecheck`: đạt, chạy sau build để tránh tranh chấp file `.next/types`.
- `npx eslint src tests scripts next.config.ts`: đạt, không có lỗi/cảnh báo.
- `npm run build`: đạt; có route `/auth/google/callback` và `/api/recognize`.
- Output trace `.next/server/app/api/recognize/route.js.nft.json` có `prompts/recognition.md`.
- `git diff --check`: đạt.
- Playwright: **8/8**, Chromium, production build, 14,7 giây:

```powershell
npx playwright test tests/e2e/recognition.spec.ts tests/e2e/recognition-results.spec.ts tests/e2e/public.spec.ts --grep 'camera|recognition result|Google sign-in|English and Chinese|denied GPS'
```

Các ca trình duyệt bao gồm Google ba ngôn ngữ ở trạng thái chưa cấu hình, callback
hủy, camera chọn ảnh/chụp và nhả thiết bị, cấp/từ chối GPS, hiển thị sai số, bỏ gửi
vị trí, không tự gọi API khi chưa consent, không tràn ngang ở 390 px và kiểm tra
WCAG AA bằng axe. Kiểm thử cũng phát hiện và sửa CSS ghi đè `hidden` của vùng
hướng dẫn camera, vốn làm ảnh xem trước bị co và chữ sai tương phản.

`recognition-results.spec.ts` kiểm tra component kết quả thật bằng HTML fixture
được render trong `recognition-result.test.ts`, đặt vào layout/CSS ứng dụng thật.
**Đây là dữ liệu kiểm thử xác định, không phải kết quả từ AI live hoặc phiên
đăng nhập thật.** Không có route đăng nhập giả/backdoor trong ứng dụng.

## Chưa xác minh với dịch vụ thật

`npm run env:check` trả exit code 1 đúng dự kiến vì `.env` hiện chưa có Supabase
URL/publishable key, AI key/model, Google Client ID/Secret và Turnstile keys.
Prompt, endpoint HTTPS, tham số giới hạn output và callback local hợp lệ.

Chưa kiểm chứng: Google round trip ngoài trình duyệt tới tài khoản thật, cấu hình
provider/audience trong Dashboard, Supabase migration/RLS trên cloud, phiên OAuth
trên domain production, provider AI thật và chất lượng nhận diện trên bộ ảnh chụp
thực địa. Không công bố tỷ lệ chính xác hoặc trạng thái sẵn sàng production từ các
kiểm thử mô phỏng. Khóa thật không được tạo hoặc lấy từ tài khoản bên ngoài.

`npm run lint` quét toàn thư mục bị lỗi trong mã video/vendor có sẵn: 16 lỗi,
403 cảnh báo tại thời điểm chạy. Lint riêng source ứng dụng/tests/scripts đạt.
Không sửa mã video hoặc tính năng SecurityGuard từ công việc khác.

## Tài liệu và ảnh

- [Cấu hình, API và giới hạn AI](../../AI-RECOGNITION.md)
- [Google OAuth direct và hosted](../../GOOGLE-AUTH.md)
- [Ảnh xem trước và consent trên mobile](recognition-consent-mobile.png)
- [Kết quả fixture có cảnh báo mâu thuẫn GPS](recognition-result-conflict-mobile.png)
- `result-fixture.html`: sinh lại từ component thật bằng `npm test`; không chứa token,
  tọa độ thiết bị thực, dữ liệu tài khoản hoặc kết quả AI live.
