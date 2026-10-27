# Đô thị TP.HCM 3D

Trang chủ `/vi`, `/en`, `/zh` có một mô hình đô thị TP.HCM được dựng bằng Three.js. Hướng tương tác tham khảo trải nghiệm không gian của [Primland](https://explore.ownprimland.com/); hình học, bố cục và mã của mô hình được tạo riêng cho THÁM VĂN. Không lấy mô hình, ảnh hoặc mã nguồn của website tham chiếu.

## Nội dung và thao tác

- Ba cảnh riêng: bờ Bạch Đằng với Bitexco Financial Tower, Saigon Times Square, Hilton Saigon và Vietcombank Tower; Cầu Ba Son; Landmark 81 tại Vinhomes Central Park. Không gán tên Landmark 81 cho Vietcombank hoặc đặt cầu Ba Son vào nhóm bốn tháp Bạch Đằng.
- Bitexco có thân thuôn và sân đáp ở khoảng 192 m; Times Square gồm hai khối; Hilton có thân kính phía trên bệ giật cấp; Vietcombank có thân liền và đỉnh giật bậc. Cầu Ba Son có một trụ cong nghiêng về Thủ Thiêm, hai phía dây văng bất đối xứng. Landmark 81 có bó tháp vuông vươn cao ở giữa, các cụm căn hộ và công viên ven sông. Nhãn lấy từ `city-places.ts`, chiếu theo camera và chỉ hiện trong đúng cảnh.
- Đường phố có vạch kẻ, xe và đèn; bờ sông có đại lộ uốn cong, công viên/hàng cọ, ghế, người đi bộ, tiểu cảnh vòng tròn, bến waterbus và tàu vàng. Đây đều là thành phần nghệ thuật của mô hình.
- Bản startup 27/10/2026 mở mặc định cảnh Bạch Đằng ban ngày. Ba nút chọn góc nhìn chuyển camera và ánh sáng theo cảnh: Bạch Đằng ban ngày, Ba Son hoàng hôn và Landmark chạng vạng. Không dựng lại canvas khi đổi cảnh.
- Trang chủ mới thu gọn mô hình vào hero. Ba nút góc nhìn dùng được với bàn phím, có trạng thái aria-pressed; không yêu cầu cuộn qua nhiều màn hình trước khi chọn sản phẩm.
- Góc máy nội suy mượt theo cảnh đã chọn; chuột tạo độ lệch nhẹ trên thiết bị có con trỏ chính xác. Không chặn bánh xe, thao tác chạm hoặc phím cuộn của trình duyệt.
- Bộ tìm hành trình, ba thẻ trải nghiệm và luồng xem mẫu/mua bộ hướng dẫn thay phần dẫn nhập nhiều chương.
- Tìm kiếm, bản đồ, tài khoản và các mục nội dung tiếp tục dùng các luồng hiện có.

**Đây là mô hình nghệ thuật.** Vị trí, chiều cao, tỷ lệ và cảnh quan đã được cách điệu, không phải bản đồ GIS, bản sao công trình hoặc hồ sơ quy hoạch. Mô hình không tạo các bản ghi TP.HCM hay tọa độ giả trong Supabase. Danh mục và bản đồ tiếp tục chỉ dùng dữ liệu đã có nguồn.

Ảnh người dùng được giữ trong `asset/city/references/01..04-*.png` để đối chiếu hình dáng/bố cục; không dùng làm cảnh giả 3D hoặc ảnh dự phòng. Bản sao Bạch Đằng trong bộ ảnh địa điểm đang chờ duyệt nguồn theo `PLACE-IMAGES.md`. Thông tin nhận diện được đối chiếu với [Bitexco](https://bitexco.com.vn/en/project/bitexco-financial-tower/), [Saigon Times Square](https://www.thereveriesaigon.com/times-square/), [Turner – Hilton Saigon](https://www.turnerconstruction.com/projects/hilton-saigon), [Vietcombank Tower](https://vietcombanktower.vn/vn/mat-bang-tang.html), [WSP – Cầu Ba Son](https://www.wsp.com/en-nz/projects/thu-thiem-2-cable-stayed-bridge) và [Mace – Landmark 81](https://www.macegroup.com/projects/landmark-81/). Các tài liệu Hilton dùng số tầng/chiều cao khác nhau; mô hình không tuyên bố tái dựng chính xác các thông số này.

## Hiệu năng và phương án dự phòng

Module dựng 3D được tải riêng khi vùng cảnh sắp xuất hiện. Khối nhà và cây dùng instancing, giới hạn mật độ điểm ảnh, chạy hiệu ứng thuyền/nước khi cảnh đang hiển thị và dừng vòng lặp khi ra ngoài khung nhìn hoặc tab bị ẩn.

Ánh sáng phản xạ trên desktop được tạo ngay trong ứng dụng bằng `RoomEnvironment`/PMREM của Three.js, không tải HDR từ bên ngoài. Màn hình nhỏ bỏ bước này và tắt shadow map để giảm chi phí GPU. Bóng đổ của thành phố tĩnh được lưu lại, không tính lại trong từng khung cuộn. Thuyền và gợn nước có chuyển động trong cảnh đang hiển thị; người dùng có thể tắt bằng nút chuyển động.

Mặt sông dùng một shader với gợn nước và các vệt sáng hồng/xanh/vàng/trắng đặt theo các cụm tháp. Đây là hiệu ứng phản chiếu cách điệu, không phải phản xạ vật lý hay ray tracing. Pha gợn thay đổi theo thời gian và góc máy trong cảnh đang hiển thị. Bầu trời chuyển sắc dùng texture 1×128 tạo tại máy. Texture, shader, shadow map và môi trường phản xạ đều được giải phóng cùng renderer.

Tiến độ góc máy được cập nhật theo nút chọn cảnh và thông báo qua sự kiện city:progress. Bài kiểm tra trình duyệt xác minh canvas thật, camera thay đổi, dừng/khởi tạo lại, mất context và fallback. Draw call/tam giác được đọc từ renderer thực, không phải số minh họa; chưa có cam kết FPS trên mọi thiết bị.

Nút chuyển động tắt phần 3D và hiện ảnh đúng cảnh, đúng ánh sáng. `prefers-reduced-motion` và chế độ tiết kiệm dữ liệu được ưu tiên; các chế độ này không khởi tạo WebGL. Trình duyệt không có WebGL hoặc mất context chuyển về ảnh dự phòng. Nội dung và các liên kết vẫn dùng được.

Trang chủ không nằm trong loading boundary toàn bộ locale, để nội dung server và ảnh dự phòng hiển thị cả khi JavaScript bị tắt. Skeleton được giữ riêng cho các route dữ liệu trong `explore`, `map`, `challenges`, `journey`, `profile`, `auth`, `admin`.

## Sửa mô hình

- `src/components/experience/city-model.ts`: ghép cảnh, nền địa hình và sông.
- `city-kit.ts`: vật liệu, hình học dùng chung, instancing, lưới mặt dựng và cây.
- `city-landmarks.ts`: bốn tháp, podium, sân đáp, đèn mặt dựng và điểm neo nhãn.
- `city-destinations.ts`: Cầu Ba Son và cụm Landmark 81/Vinhomes Central Park.
- `city-places.ts`: danh tính, cảnh, neo nhãn và ảnh dự phòng.
- `city-facade.ts`: ô kính và cửa sổ sáng trong shader bề mặt, không đắp khối hộp sáng lên mặt nhà.
- `city-streets.ts`: đường phố, xe và các cụm nhà; bộ sinh dùng seed cố định.
- `city-waterfront.ts`: bờ sông, công viên, cọ, tàu vàng và bến.
- `city-river.ts`: shader gợn nước và vệt sáng phản chiếu.
- `city-lighting.ts`: hai bảng ánh sáng/vật liệu, nền trời và giải phóng texture.
- `city-renderer.ts`: ánh sáng, ba góc máy, nội suy, giới hạn GPU và giải phóng tài nguyên.
- `city-canvas.tsx`: tải module và ảnh dự phòng.
- `home-experience.tsx`, `home-experience.css`: chương nội dung, điều khiển và responsive.
- `src/lib/i18n.ts`: nội dung Việt/Anh/Trung.

Sau khi sửa hình học/chất liệu, chạy app local rồi tạo lại ảnh:

```powershell
npm run dev
# Trong terminal khác:
npm run city:poster
```

Lệnh cần Chromium của Playwright (`npx playwright install chromium` nếu chưa cài). Nó render ba cảnh ở hai chế độ, giữ sáu PNG gốc trong `asset/city/`, rồi tạo WebP cùng tên trong `public/images/`: `hcm-city-poster`/`hcm-city-day`, `hcm-ba-son`/`hcm-ba-son-day`, `hcm-landmark81`/`hcm-landmark81-day`. Sau đó build lại production để bàn giao cùng ảnh mới. Ảnh dựng này không được gắn nhãn ảnh chụp địa điểm trong danh mục.

Ảnh mô hình ban đầu được giữ tại `asset/city/hcm-city-v1-poster.png` để đối chiếu. Ảnh mới chỉ chứa cảnh 3D, không ghép các điều khiển hoặc nhãn HTML lên ảnh dự phòng.

Cảnh 3D không cần thêm key hoặc SQL. Các dịch vụ tài khoản, Supabase và Google OAuth vẫn cấu hình theo README và GOOGLE-AUTH.md.

