# Báo cáo bàn giao THÁM VĂN

## Thư viện ảnh và lọc sai chủ thể — cập nhật 27/10/2026

Index giữ 1.505 ID, **409 ảnh thể hiện địa điểm**, **1.096 mục thiếu** (27,18%). Toàn bộ 409 file có dấu kiểm tra chủ thể gắn với SHA-256; 162 ảnh ghi rõ tác giả/giấy phép, chưa có ảnh được duyệt đầy đủ danh tính và quyền sử dụng. Không coi bộ dữ liệu là hoàn chỉnh. Chi tiết, nguồn và cách chạy lại ở `PLACE-IMAGES.md`.

Đã chuyển thêm 33 ảnh món ăn, nhóm người, poster, con vật, mô hình hoặc ảnh không thể hiện công trình khỏi public, có manifest khôi phục. Đã thay ảnh The Vintage Emporium bằng mặt tiền; Cocotte, Marcel và CLAY bằng mặt tiền/không gian; Thảo Cầm Viên bằng cổng; Chợ Rẫy bằng tòa nhà. Đã thêm ảnh khuôn viên đại học và trung tâm thương mại sau khi xem từng file. Không dùng ảnh THISO Trường Chinh cho THISO Sala; chi nhánh chưa xác định được vẫn để thiếu.

Luồng tìm ảnh mới chỉ ghi vào vùng chờ. Finalizer và audit kiểm tra dấu duyệt chủ thể/hash trước khi giữ ảnh trong public. Test xác nhận một file đã được thay nội dung không được kế thừa dấu duyệt cũ. Cũng đã sửa alias địa chỉ trong ngoặc bị hiểu nhầm là tên quán, dẫn tới lấy ảnh đường phố.

Lượt tiếp theo thêm 53 ảnh đã xem từng file, gồm bảo tàng, di tích, khuôn viên và bệnh viện. Danh mục HCM cục bộ được đồng bộ với index: 1.505 mapping, 409 ảnh, không còn mapping khác index. Các trường nội dung khác được giữ nguyên. Đã bỏ khôi phục qua tên file/source metadata và bỏ gán mặc định tác giả Wikimedia/giấy phép CC BY-SA. Ảnh Lăng Ông Thạnh An bị loại ở vùng chờ; mục Cần Thạnh dùng ảnh cổng Miếu Hải Thần. Bảo tàng Áo Dài dùng toàn cảnh thay ảnh khách tạo dáng.

- Hiện tại: `npm run check` đạt lint, TypeScript, **55/55 unit/SQL tests** và build production; log `docs/verification/check-photo-continuation.log`.
- Hiện tại: **3/3 E2E ảnh đạt** trên production (11,7 giây), HEAD toàn bộ 409 ảnh; tìm/lọc/phân trang, no-JavaScript, responsive và axe; so ảnh trang chi tiết Vintage/Bến Đình/Lăng Ông với index. Log `docs/verification/e2e-photo-continuation.log`; ảnh chụp tại `docs/screenshots/`.
- Chạy finalizer lại: 0 ảnh nhập thêm, 0 file chuyển quarantine, 0 ảnh trùng, 0 mapping runtime thay đổi. Đây là bằng chứng lần chạy lại không làm ảnh bị loại xuất hiện trở lại.
- Kết quả lịch sử: toàn bộ **18/18 E2E** đạt ở đợt trước (`docs/verification/e2e-final.log`); **2/2 E2E thư viện** đạt khi còn 346 ảnh (`docs/verification/e2e-images-final.log`). Không coi đây là lần chạy toàn bộ suite ở trạng thái hiện tại.
- Kiểm tra kỹ thuật không tự chứng minh đúng chi nhánh hay có quyền xuất bản.

Môi trường từng có file dependency bị hỏng; đã cài lại bằng `npm ci`. Native Turbopack build thoát với mã Windows `0xC0000006`; chưa xác định nguyên nhân. Dev/build hiện dùng cờ `--webpack` được CLI Next.js cài trong dự án hỗ trợ, và build bằng cấu hình này đã đạt. Không kết luận lỗi ổ đĩa hay phần cứng từ mã thoát này.

Các phần bên dưới ghi lại kết quả của các đợt trước; số ảnh 28 và 1.477 mục thiếu là số liệu lịch sử.

## Sửa ảnh lặp mẫu và nhận diện các cảnh TP.HCM — 27/10/2026

Đã tách **1.473 ảnh thẻ sinh từ một mẫu**, ba ảnh render bị gán là ảnh chụp và một skyline gán nhầm Cầu Sài Gòn ra khỏi `public/images`. Toàn bộ 1.477 file được giữ trong quarantine kèm manifest; kiểm tra lại SHA-256 xác nhận đủ 1.477 bản lưu nguyên vẹn và không còn các đường dẫn cũ trong public. Index giữ đủ 1.505 ID, 28 ảnh chờ duyệt nguồn, 1.477 mục thiếu ảnh; không còn báo độ phủ ảnh 100%. Sáu ảnh di sản của ứng dụng đã phục hồi từ originals, khớp byte. Chi tiết ở `PLACE-IMAGES.md`.

Đã sửa hai bộ sinh cũ để không tạo thẻ hàng loạt hoặc dùng ảnh chung theo category. Công cụ audit mới có dry run, chặn đường dẫn thoát/symlink, phát hiện trùng byte/pixel và kiểm tra hash trước khi chuyển file. Bộ tải PowerShell giữ các bản ghi cũ khi thêm ảnh và giữ trạng thái chờ duyệt; kiểm tra parser của hai script và thử merge index offline đều đạt. Không chạy tải ảnh hàng loạt hoặc tự duyệt 28 ảnh còn lại.

Ba chương trang chủ hiện là Bạch Đằng, **Cầu Ba Son** và **Landmark 81/Vinhomes Central Park**. Các công trình lấy nhãn theo cùng nguồn dữ liệu, camera và ảnh dự phòng tương ứng từng cảnh. Mặt dựng dùng cửa sổ trong shader; pylon cầu cong, dây văng bất đối xứng; Landmark 81 dùng bó tháp vuông. Đây vẫn là mô hình nghệ thuật, không phải bản sao đo đạc hoặc tái dựng ảnh thực.

- `npm run check`: lint không lỗi/cảnh báo, TypeScript, **45/45 Vitest** và build production đạt.
- Playwright production với `CI=1`: **17/17 đạt**, 38,0 giây. Bao gồm tải 28 ảnh còn lại, danh sách 1.477 mục thiếu, ba góc nhìn/nhãn, đổi ánh sáng, fallback đúng cảnh, reduced motion, mất WebGL, bàn phím, responsive, accessibility và các luồng công khai sẵn có.
- Chạy lại `npm run images:audit`: không còn file cần chuyển hoặc ảnh trùng gán cần xử lý. Kiểm tra này không tự xác nhận nội dung ảnh đúng địa điểm.
- Đã xem ảnh render Bạch Đằng, Cầu Ba Son, Landmark 81 và báo cáo ảnh. Ảnh kiểm chứng trong `docs/screenshots/`; sáu poster mới có PNG gốc tại `asset/city/` và WebP public.

Các phần dưới là báo cáo những phiên bản trước. Kết quả local này không thay thế kiểm tra Supabase/Google/AI với key thật hoặc đo hiệu năng GPU trên thiết bị thực tế.

## Bạch Đằng theo ảnh tham chiếu, chạng vạng mặc định — 27/10/2026

Đã thay bố cục sông/cầu và Landmark 81 trước đây bằng một bờ đô thị liên tục lấy cảm hứng từ bốn ảnh người dùng cung cấp. Cảnh có Bitexco, Times Square, Hilton Saigon và Vietcombank Tower cách điệu, đại lộ ven bờ, công viên/cọ, bến waterbus và tàu vàng. Mặt sông có gợn/vệt sáng màu; bầu trời chuyển sắc. Chạng vạng là mặc định theo lựa chọn của người dùng, có nút Ban ngày.

- `npm run check`: ESLint, TypeScript, **40/40 test** và production build đạt trên nguồn cuối cùng.
- `CI=1 npm run test:e2e`: **16/16 đạt**, **40.3 giây**, hai worker, trên production build cuối cùng.
- Đổi ánh sáng giữ nguyên canvas; tắt chuyển động/giảm chuyển động đổi đúng ảnh tĩnh theo chế độ. Đã kiểm tra cả pause/resume, mất context, thiếu WebGL, không JavaScript, bàn phím, responsive và ba ngôn ngữ.
- Axe không báo vi phạm WCAG A/AA ở các trạng thái ban ngày/chạng vạng được kiểm tra. Kiểm tra draw call/tam giác tiếp tục đạt giới hạn 100/200.000 ở toàn cảnh.
- Đã sửa thời gian nội suy để khung GPU bị trễ có thể bắt kịp tiến độ cuộn, giữ nguyên độ mượt của khung bình thường. Đã cập nhật projection matrix của camera bóng đổ sau khi đặt vùng phủ cho thành phố.
- Hai ảnh dự phòng được tạo từ chính mô hình: `public/images/hcm-city-poster.webp` và `hcm-city-day.webp`, PNG gốc trong `asset/city/`. Ảnh tham chiếu được giữ riêng trong `asset/city/references/`.
- Đã kiểm tra trực quan toàn cảnh desktop, góc cận đủ bốn tháp, bản điện thoại và cả hai chế độ ánh sáng. Ảnh bàn giao hiện tại nằm trong `docs/screenshots/hcm-city-*.png`.

Các lần chạy trước phát hiện bài kiểm tra đọc kích thước ảnh trước khi ảnh ban ngày tải xong và góc máy theo chậm trong GPU phần mềm tải nặng. Đã sửa chờ ảnh đúng trạng thái và phần nội suy, rồi chạy lại toàn bộ production suite đạt. Không suy kết quả này thành cam kết FPS trên thiết bị thật. Vệt sáng trên sông là hiệu ứng nghệ thuật, không phải phản xạ vật lý; vị trí/tỷ lệ công trình không phải dữ liệu GIS. Không sửa SQL, cấu hình key hoặc các luồng Auth trong đợt giao diện này.

## Nâng chi tiết đô thị TP.HCM — 27/10/2026

Đã dựng lại mô hình theo các module dùng chung: mặt dựng có lưới kính và ô cửa, mái giật cấp, vườn sân thượng, podium, sân đáp, đường phố/vạch kẻ/xe/đèn, bờ sông/cọ/ghế/người đi bộ, thuyền và nhà mái ngói có hành lang vòm. Ánh sáng kính desktop dùng môi trường studio tạo trong ứng dụng; mobile dùng cấu hình nhẹ hơn. Nhãn tên tháp bám theo phép chiếu của camera.

- `npm run check`: lint, TypeScript, **40/40 test** và production build đạt.
- `CI=1 npm run test:e2e`: **16/16 đạt**, 44.2 giây, gồm điều hướng cuộn, pause/resume, mất WebGL, ảnh dự phòng, không JavaScript, responsive/ba ngôn ngữ và các luồng trước.
- Đã thêm kiểm tra giới hạn **100 draw call / 200.000 tam giác** tại toàn cảnh được kiểm tra. Instancing, shadow map lưu lại và dừng renderer khi đứng yên được giữ; không coi giới hạn hình học là cam kết FPS trên mọi GPU.
- Đã sửa race giữa đo tiến độ và renderer nghỉ: góc máy nhận thông báo sau khi giá trị tiến độ đã cập nhật.
- Đã xem trực quan ảnh toàn cảnh, mặt dựng cận và bản điện thoại. Ảnh `docs/screenshots/hcm-city-*.png` là phiên bản chi tiết mới nhất.
- Ảnh dự phòng được render lại từ mô hình mới, không có nhãn/điều khiển HTML. Ảnh gốc đời đầu được giữ tại `asset/city/hcm-city-v1-poster.png`.

Phạm vi vẫn là mô hình nghệ thuật local, chưa xác nhận quy hoạch/vị trí thực tế hoặc FPS trên thiết bị thật; cấu hình Supabase/Google/AI và kiểm tra tích hợp dịch vụ thật theo các báo cáo trước.

## Đô thị TP.HCM 3D — 27/10/2026

Đã thay phần mở đầu trang chủ bằng mô hình Three.js riêng: quần thể cao ốc, hai tháp lấy cảm hứng từ Landmark 81/Bitexco, sông, cầu và cây xanh. Ba chương điều khiển góc máy theo cuộn; có hiệu ứng chữ, nút chuyển động, giao diện Việt/Anh/Trung và ảnh dự phòng được render từ cùng mô hình.

- `npm run check`: ESLint, TypeScript strict, **40/40 test** logic/SQL/auth và Next.js production build đạt.
- `CI=1 npm run test:e2e`: **16/16 đạt** trên production (45.2 giây), đã chạy lại sau khi sửa ảnh dự phòng. Bao gồm toàn bộ 12 luồng trước và 4 bài mới cho thành phố.
- Đã kiểm tra camera đổi theo tiến độ cuộn, điều hướng chương bằng bàn phím, pause/resume không nhân bản canvas, giải phóng khi mất context và chuyển về ảnh tĩnh.
- Đã kiểm tra giảm chuyển động, thiếu WebGL và trang chủ tắt JavaScript; nội dung, ảnh và điểm neo vẫn dùng được.
- Không tràn ngang ở 320/390/768/1024/1440 px; kiểm tra thêm cả ba ngôn ngữ. Axe không báo vi phạm WCAG A/AA trong các trạng thái được kiểm tra.
- Đã xem trực quan toàn cảnh, góc cận cao ốc và bản điện thoại. Ảnh lưu trong `docs/screenshots/hcm-city-*.png`.
- Ảnh dự phòng WebP khoảng 48 KB, chỉ chứa mô hình, không chứa điều khiển giao diện; PNG gốc trong `asset/city/`. Xem `HCM-3D.md` để sửa mô hình và tạo lại ảnh.

Mô hình mang tính nghệ thuật, không xác nhận vị trí/tỷ lệ hoặc quy hoạch thực tế. Kiểm tra render tự động dùng Chromium/SwiftShader và kiểm tra trực quan trong trình duyệt local; chưa đo FPS trên các điện thoại thực tế hoặc xác nhận trên mọi GPU/trình duyệt. Các dịch vụ Supabase/Google/AI vẫn cần key và kiểm tra tích hợp thật như báo cáo trước.

## Cập nhật Google OAuth — 27/10/2026

Đã bổ sung đăng nhập Google qua Supabase/PKCE, callback giữ ngôn ngữ/route, trạng thái hủy/lỗi, tạo hồ sơ Google, màn hình xác nhận điều khoản, SQL nâng cấp giữ dữ liệu cũ và xóa tài khoản bằng OAuth gần đây.

- `npm run check`: lint, TypeScript strict, **40/40 test** và build production đều đạt.
- PostgreSQL: tổng 17 test, bao gồm Google mới không tự nhận consent/admin, chặn provider giả trong user metadata, RLS/RPC trước consent, không gọi được implementation private, chạy lại migration/backfill không làm mất consent cũ.
- Auth policy/SDK: 4 test; dùng SDK Supabase SSR thật để tạo S256 challenge và cookie verifier HttpOnly, kiểm tra redirect và AMR gần đây.
- Route auth: 9 test với dịch vụ Auth được mô phỏng, kiểm tra callback thành công/chưa consent/hủy/code cũ, Origin, validation và điều kiện xóa tài khoản.
- Logic và ảnh: 10 test còn lại giữ kết quả đạt.
- **12/12 Playwright** đạt trên bản production với `CI=1` (20.3 giây), bao gồm Google UI ba ngôn ngữ, trạng thái chưa kết nối, callback hủy và consent gate cho khách.
- Dependency audit: **0 lỗ hổng được báo cáo**. Không có tên biến service-role/Turnstile/Google secret trong bundle `.next/static`.
- Đã xem ảnh desktop/mobile của trang login mới; lưu tại `docs/screenshots/google-login-desktop.png` và `docs/screenshots/google-login-mobile.png`.

**Chưa thực hiện round trip Google/Supabase thật** vì chưa có key/provider cấu hình. Test route mô phỏng không chứng minh Google Cloud consent screen, identity linking, redirect allowlist hoặc session trên domain thật đã hoạt động. Theo `GOOGLE-AUTH.md` để nạp cấu hình và kiểm tra.

Nếu database đã có 001/002, chỉ chạy thêm `supabase/migrations/202610270003_google_auth_consent.sql`; không chạy lại SQL khởi tạo. Google Client ID/Secret nhập tại Supabase Auth Providers; bật `AUTH_GOOGLE_ENABLED=true` sau khi cấu hình. Bộ E2E hiện dành cho chế độ chưa có key, như phần hướng dẫn ở README.

## Kết quả bàn giao ban đầu — 26/10/2026

Kiểm tra ngày **26/10/2026**, tại `D:\thamvan`. Phạm vi là source và runtime local, **chưa kết nối Supabase/AI thật** vì `.env` chưa có key. Không coi bản build này là chứng nhận sẵn sàng vận hành công khai.

## Kết quả thực thi

| Kiểm tra                                      | Kết quả                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm ci --ignore-scripts` từ lockfile         | Thành công                                                                     |
| ESLint                                        | Đạt, không lỗi/cảnh báo                                                        |
| TypeScript strict                             | Đạt                                                                            |
| Vitest                                        | **22/22 đạt**: 8 logic/validation, 12 PostgreSQL/RLS, 2 xử lý ảnh              |
| Next.js production build                      | Thành công, Next.js 16.4.3 / React 19.3.1                                      |
| Playwright Chromium trên `next start`, `CI=1` | **11/11 đạt**, 16.6 giây                                                       |
| `npm audit` toàn bộ dependency                | **0 lỗ hổng được báo cáo**                                                     |
| `npm audit signatures`                        | 396 gói xác minh chữ ký registry; 111 gói có attestation đã xác minh           |
| Tìm tên biến secret trong `.next/static/*.js` | Không có `SUPABASE_SERVICE_ROLE_KEY`, `VISION_API_KEY`, `TURNSTILE_SECRET_KEY` |

Môi trường kiểm tra hiện có Node 25.9.0. Vitest báo cảnh báo engine cho Node lẻ này dù toàn bộ test đạt; môi trường cài mới/CI được hướng dẫn dùng **Node 24 LTS**. npm được khóa ở 11.12.1. Lifecycle scripts bị tắt khi cài dependency.

## Đã kiểm chứng trên trình duyệt

- Trang chủ tải ảnh đúng và không phát sinh `pageerror` trong bài kiểm tra.
- Trang chủ không tràn ngang ở 320, 390, 768, 1024 và 1440 px.
- **27 tổ hợp màn hình/ngôn ngữ** (9 màn hình × Việt/Anh/Trung) không tràn ngang ở 320 px: danh mục, chi tiết Huế, bản đồ, camera, thử thách, hành trình, cá nhân, đăng ký, giới thiệu.
- Tìm `Hoi An` tìm được `Hội An`; thẻ mở đúng chi tiết và nguồn; chủ đề chưa có dữ liệu hiển thị empty state.
- Chuyển ngôn ngữ giữ trang chi tiết, đổi nội dung và thuộc tính `html[lang]`, giữ tên riêng Việt Nam.
- Chọn ảnh từ file tạo preview; khi chưa cấu hình dịch vụ, nút phân tích không giả vờ chạy.
- Camera dùng **thiết bị mô phỏng của Chromium**: mở stream, chụp frame, xem preview và dừng các track sau chụp. Chưa kiểm tra camera vật lý trên điện thoại.
- Định vị trình duyệt với tọa độ kiểm thử lọc Huế; bán kính lưu được qua reload; chọn khu vực Hà Nội lọc đúng. Khi bị từ chối quyền, có thông báo và lựa chọn khu vực thủ công.
- Tùy chọn khách lưu được; luồng giới thiệu yêu cầu đồng ý trước bước điều khoản; các trang pháp lý/credits đọc được.
- Lưu khi chưa đăng nhập dẫn đến trang đăng nhập; hành trình và quản trị khách không lộ dữ liệu riêng.
- Axe không có vi phạm WCAG 2 A/AA và 2.1 AA trên các trang được quét: trang chủ, danh mục tiếng Anh, cá nhân tiếng Trung, đăng ký, camera và thử thách. Đây là kiểm tra tự động theo phạm vi đó, chưa phải thẩm định accessibility toàn diện bằng công cụ đọc màn hình.
- Response có CSP nonce, `nosniff`, `private, no-store`; Origin giả bị chặn 403; ghi khi chưa kết nối bị từ chối 503; payload auth sai bị từ chối 422; callback không chuyển đến domain ngoài.

## Đã kiểm chứng trên PostgreSQL

Dùng PGlite (PostgreSQL thật chạy WASM), schema `auth` tối thiểu và hai tài khoản độc lập cùng một quản trị viên. Chạy chính các migration và seed bàn giao:

- Khách đọc tư liệu published, không đọc draft; admin đọc được draft.
- Người dùng chỉ đọc hồ sơ của mình; không thêm địa điểm lưu với owner giả hoặc sửa địa điểm của người khác.
- Không tự cấp role admin, không sửa metadata đồng ý điều khoản.
- Không tạo hồ sơ nếu thiếu metadata xác nhận phiên bản điều khoản.
- Không đọc bảng đáp án trong schema private, không ghi điểm trực tiếp.
- Phải tham gia trước khi trả lời; sai không cộng điểm; đúng cộng một lần; gọi lặp không cộng thêm.
- Quota nhận diện dừng sau 10 lượt trong cửa sổ 24 giờ của tài khoản.
- Người thường không xuất bản nội dung hoặc sửa đáp án; phản hồi không lộ cho người khác.
- Xóa user cascade hồ sơ/lưu và xóa quota theo tài khoản.

PGlite không thay thế Supabase Auth, PostgREST hoặc email thật. Migration mới cần được áp dụng và kiểm tra lại trên project Supabase của chủ vận hành.

## Phần đã code nhưng cần key hoặc thiết bị thật để nghiệm thu

| Luồng                                                        | Việc cần làm khi nạp key                                                                                               |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Đăng ký, xác nhận email, đăng nhập, refresh phiên, đăng xuất | Chạy migration, cấu hình Supabase Auth/SMTP/redirect và kiểm tra trên domain thật                                      |
| Quên/đổi mật khẩu                                            | Cấu hình template token hash; kiểm tra link hết hạn, khác trình duyệt và phiên cũ                                      |
| Lưu/nhóm hành trình, ghé thăm tự xác nhận                    | Kiểm tra ghi và đồng bộ giữa hai thiết bị, thử truy cập chéo tài khoản                                                 |
| Thử thách/huy hiệu                                           | Kiểm tra UI kết nối RPC thật và gọi đồng thời; SQL idempotency đã đạt local                                            |
| Cá nhân/export/xóa tài khoản                                 | Điền service role cho xóa; kiểm tra dữ liệu xuất, phiên và cascade trên project thật                                   |
| Quản trị                                                     | Cấp admin bằng SQL; kiểm tra tạo/sửa/ẩn tư liệu và thử thách, xử lý phản hồi, audit                                    |
| AI nhận diện                                                 | Chọn model vision hỗ trợ JSON, điền key/model/endpoint, chạy ảnh đúng/sai/mờ/không liên quan và kiểm tra chi phí/quota |
| Turnstile production                                         | Điền hai key, whitelist đúng domain, kiểm tra token hết hạn/giả và hostname                                            |
| Camera, vị trí và thông báo                                  | Kiểm tra thiết bị iOS/Android và quyền trình duyệt; thông báo chỉ khi trang chủ đang mở                                |
| Bản đồ                                                       | Tile OSM tải từ mạng; kiểm tra mạng chậm/offline và chính sách sử dụng khi tăng lưu lượng                              |
| Vận hành                                                     | HTTPS, origin, retention cron, backup, liên hệ vận hành và duyệt nội dung bởi chuyên gia                               |

## Dữ liệu bàn giao

6 tư liệu tham khảo có nguồn/ảnh và ba bản dịch, 2 thử thách, migration/RLS/retention, cấu hình `.env` trống và CI. Không có database di sản do chủ dự án cung cấp ngoài tài liệu đặc tả. Các chủ đề chưa có tư liệu để trống đúng trạng thái; không tạo bản ghi hoặc voucher giả. Ảnh và giấy phép có trong `asset/heritage/attribution.json`, mapping sang `public/images/`.

Ảnh chụp UI từ lần E2E production đạt: `docs/screenshots/home-desktop.png`, `docs/screenshots/home-mobile.png`. Các ảnh có thể xem trực tiếp trong editor.

## Quy trình test tiếp theo

Làm theo `README.md`: điền `.env` → chạy hai migration và seed → cấu hình SMTP/redirect/Turnstile → khởi động lại hoặc build lại → tạo hai tài khoản → thực hiện các luồng ở bảng trên. Không đưa service role/AI key vào biến `NEXT_PUBLIC_*`.
