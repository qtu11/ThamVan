# Bổ sung tính năng theo kịch bản THÁM VĂN gần 2 phút

Ngày đối chiếu: 16/11/2026. Tài liệu phục vụ triển khai sau khi duyệt kịch bản; không sửa ứng dụng trong bước này.

**Trải nghiệm trong video là mục tiêu sản phẩm theo yêu cầu.** Phân tích mã nguồn dưới đây không đồng nghĩa các tính năng đã được nghiệm thu trên điện thoại, ứng dụng cài đặt hoặc dịch vụ AI thật. Khi dựng video trước khi hoàn thiện ứng dụng, các màn hình bổ sung là minh họa trải nghiệm mục tiêu.

## 1. XP đổi voucher giảm giá

- **Hiện có:** XP, cấp độ và danh hiệu. Chính sách hiện tại ghi rõ XP không có giá trị tiền tệ hoặc đổi voucher: [legal.ts:102](D:/thamvan-moi/src/data/legal.ts:102), [i18n.ts:331](D:/thamvan-moi/src/lib/i18n.ts:331).
- **Cần bổ sung:** Danh mục voucher thực sự có đối tác chấp nhận; điều kiện đổi, số lượng, hạn dùng và cách sử dụng. Thêm nghiệp vụ đổi ở máy chủ: kiểm tra số dư/quyền sở hữu, trừ điểm và cấp voucher trong cùng giao dịch, chống đổi trùng. Phân biệt tổng XP dùng xếp hạng với điểm khả dụng nếu việc đổi không được làm mất cấp độ hoặc danh hiệu. Không tự đặt tỷ lệ XP, giá trị giảm hoặc đối tác.
- **Nghiệm thu:** Một lần đổi hợp lệ tạo đúng một voucher và một lần trừ điểm; gửi lại yêu cầu không trừ hai lần; thiếu điểm, hết hàng và hết hạn có thông báo rõ. Người dùng xem được số dư và lịch sử đổi. Voucher được bên phát hành xác nhận sử dụng được.
- **Trước phát hành:** Cập nhật điều khoản, nội dung quyền lợi và các bản dịch đang tuyên bố XP không đổi voucher; công bố điều kiện thực tế trước thao tác xác nhận đổi.

## 2. AI lập lịch trình theo bán kính, thời lượng và ngân sách

- **Hiện có:** Gói Premium Family mở AI lịch trình: [plans.ts:5](D:/thamvan-moi/src/lib/plans.ts:5). Biểu mẫu gửi số ngày, giờ mỗi ngày, khu vực, nhịp độ và sở thích; chưa có bán kính/ngân sách trong payload này: [planner.tsx:130](D:/thamvan-moi/src/components/dashboard/planner.tsx:130). Các lựa chọn thời gian hiện tại: [planner.tsx:151](D:/thamvan-moi/src/components/dashboard/planner.tsx:151).
- **Cần bổ sung:** Giữ các trường đang có; thêm tâm xuất phát, bán kính và ngân sách tối đa, nêu rõ ngân sách cho một người hay cả nhóm. Kiểm tra đầu vào trên máy chủ; lọc điểm theo khoảng cách; tính thời gian di chuyển, thời gian tham quan và chi phí có nguồn trước khi đề xuất. Không lấy số chi phí AI đoán làm giá thực tế. Chi phí chưa rõ phải được đánh dấu, không tuyên bố đã bảo đảm trần ngân sách.
- **Nghiệm thu:** Nhập bán kính, thời lượng và ngân sách rồi nhận được lịch trình có bản đồ, thứ tự điểm dừng, thời gian và bảng chi phí. Trường hợp không đủ điểm hoặc không thể đáp ứng ràng buộc phải báo rõ, không âm thầm nới điều kiện. Kiểm tra quyền Family ở máy chủ và xử lý được khi AI không kết nối.

## 3. Gợi ý trong 3 km và thông báo khi chạy nền/màn hình khóa

- **Hiện có:** Theo dõi vị trí và tạo thông báo qua service worker: [nearby-alerts.tsx:57](D:/thamvan-moi/src/components/nearby-alerts.tsx:57), [nearby-alerts.tsx:70](D:/thamvan-moi/src/components/nearby-alerts.tsx:70), [nearby-alerts.tsx:99](D:/thamvan-moi/src/components/nearby-alerts.tsx:99). Mã nguồn ghi rõ web không lấy vị trí khi ứng dụng đóng hẳn: [nearby-alerts.tsx:7](D:/thamvan-moi/src/components/nearby-alerts.tsx:7).
- **Cần bổ sung:** Giữ cơ chế thông báo đang có; xác định nền tảng điện thoại sẽ hỗ trợ thực tế. Nếu mục tiêu bao gồm ứng dụng đã đóng hẳn, cần khả năng theo dõi vị trí/geofencing của nền tảng cài đặt; không coi web push đơn thuần là giải pháp lấy vị trí nền. Thêm trạng thái quyền, bật/tắt rõ ràng, tránh gửi lặp và mở đúng hồ sơ địa điểm khi chạm thông báo.
- **Nghiệm thu:** Trên từng thiết bị/nền tảng được công bố, thử khi ứng dụng đang mở, chạy nền, khóa màn hình và đóng hẳn; ghi rõ trạng thái nào được hỗ trợ. Thông báo chỉ xuất hiện với điểm nằm trong phạm vi quy định, khi đã được cấp quyền; tắt tính năng phải dừng theo dõi. Chạm thông báo mở đúng điểm đến. Không quảng bá trạng thái chưa vượt kiểm tra thực tế.

## 4. Tái sử dụng Atlas 3D đã có trong app

- **Hiện có:** App có Atlas 3D; tái sử dụng lớp bản đồ, công trình và điều khiển góc nhìn đang có, không dựng lại thành lưới hoặc khối minh họa. Nguồn MapLibre/OpenFreeMap của Atlas: [map-canvas.tsx:22](D:/thamvan-moi/src/components/map-canvas.tsx:22), [map-canvas.tsx:173](D:/thamvan-moi/src/components/map-canvas.tsx:173), góc nhìn tuyến đường [map-canvas.tsx:614](D:/thamvan-moi/src/components/map-canvas.tsx:614). Mô hình nghệ thuật ở trang chủ là một thành phần khác, không phải căn cứ để kết luận Atlas thiếu 3D.
- **Cần làm khi dựng video:** Chụp lớp bản đồ 3D thật từ app, giữ nguồn bản đồ; dùng tuyến theo đường phố lấy từ [API chỉ đường](D:/thamvan-moi/src/app/api/route/route.ts:10). Chiếu đầy đủ tọa độ tuyến bằng cùng camera bản đồ. Không nối thẳng hai ghim, không thay bằng đường vẽ tùy ý. Đây là việc tái sử dụng tính năng hiện có, không phải yêu cầu viết lại Atlas.
- **Nghiệm thu:** Xoay/nghiêng/phóng bản đồ được trên web và điện thoại; các công trình/địa danh mẫu khớp vị trí; chọn công trình mở đúng thông tin. Vùng công bố đã phủ 3D phải có dữ liệu được kiểm tra. Thiết bị không hỗ trợ hoặc tải lỗi vẫn dùng được bản đồ dự phòng và chức năng tìm điểm đến.

## 5. Ảnh + địa điểm + GPS + quãng đường → video kỷ niệm TimelineMap

- **Hiện có:** Ghi GPS, tính km ước tính và xuất video tua nhanh tuyến đường: [timeline.tsx:115](D:/thamvan-moi/src/components/dashboard/timeline.tsx:115), [timeline.tsx:397](D:/thamvan-moi/src/components/dashboard/timeline.tsx:397). Giao diện ghi video xuất dài 8 giây: [timeline.tsx:538](D:/thamvan-moi/src/components/dashboard/timeline.tsx:538). GPS chỉ ghi khi trang mở, dừng khi bị ẩn: [timeline.tsx:567](D:/thamvan-moi/src/components/dashboard/timeline.tsx:567). Danh sách nơi đã ghé có tại [timeline.tsx:635](D:/thamvan-moi/src/components/dashboard/timeline.tsx:635); chưa thấy ghép ảnh chuyến đi vào video trong thành phần này.
- **Cần bổ sung:** Cho lưu ảnh do người dùng chọn/chụp vào chuyến đi và điểm dừng tương ứng; chỉ lưu khi được đồng ý. Thêm ảnh vào bản phát lại theo thứ tự thời gian, xen tuyến đường và tên địa điểm; dùng điểm GPS thật để tính km, không suy diễn quãng đường từ ảnh hoặc điểm tự đánh dấu. Giữ khả năng xem trước, tải video, xử lý lỗi xuất và xóa chuyến đi/ảnh theo quyền sở hữu.
- **Nghiệm thu:** Một chuyến đi thử có nhiều ảnh và điểm GPS xuất được video đúng ảnh, đúng thứ tự, đúng địa điểm; km khớp phép tính từ dữ liệu đã ghi và có nhãn ước tính. Không có GPS thì không tạo số km giả. Không có ảnh vẫn phát lại tuyến đường. Người dùng khác không đọc được ảnh/chuyến đi riêng. Xóa ảnh phải loại ảnh đó khỏi lần xuất tiếp theo.

## 6. Danh hiệu phản ánh đúng hành động khám phá

- **Hiện có:** “Khoai Lang Thang” là danh hiệu khởi đầu, “Nhà Du Mục” cần 180 XP, “Nhà Thám Hiểm” cần 2.000 XP: [explorer-titles.ts:18](D:/thamvan-moi/src/data/explorer-titles.ts:18), [explorer-titles.ts:78](D:/thamvan-moi/src/data/explorer-titles.ts:78), [explorer-titles.ts:198](D:/thamvan-moi/src/data/explorer-titles.ts:198).
- **Cần bổ sung:** Đổi tên hiển thị danh hiệu khởi đầu thành “Nhà Lãng Du” theo bản video đã sửa; giữ ID và thành tích đã lưu. Nếu video thể hiện việc ghé và chụp ảnh mở danh hiệu, cần quy tắc được duyệt cho đúng hành động đó, hiển thị tiến độ và điều kiện mở. Tái sử dụng hệ thống danh hiệu hiện có; không gán ngầm mọi ảnh Camera AI thành lượt check-in hoặc XP. Giữ nguyên danh hiệu đã đạt của người dùng khi thay quy tắc.
- **Nghiệm thu:** Mỗi danh hiệu có điều kiện nhìn thấy được; hành động hợp lệ tăng đúng tiến độ; ảnh/lượt gửi lặp không tạo thưởng trùng. “Nhà Lãng Du” không được minh họa như phần thưởng chỉ có sau nhiều chuyến đi nếu vẫn giữ quy tắc khởi đầu hiện tại.

## 7. Dữ liệu sự kiện thực sự sắp diễn ra

- **Hiện có:** Danh sách biên tập trong mã, gồm khung thời gian định kỳ như “Cuối tuần”; giao diện gọi là “Không gian sinh hoạt văn hóa nổi bật”: [home-discovery-hub.tsx:39](D:/thamvan-moi/src/components/home-discovery-hub.tsx:39), [home-discovery-hub.tsx:55](D:/thamvan-moi/src/components/home-discovery-hub.tsx:55), [home-discovery-hub.tsx:319](D:/thamvan-moi/src/components/home-discovery-hub.tsx:319).
- **Cần bổ sung:** Thêm dữ liệu sự kiện có tên, ngày/giờ, địa điểm, nguồn đơn vị tổ chức, thời điểm cập nhật và trạng thái hoãn/hủy. Dùng nơi quản lý dữ liệu đang có hoặc một nguồn biên tập thống nhất; không cần thêm dịch vụ chỉ để chứa vài sự kiện. Tách lịch có ngày xác nhận khỏi giới thiệu không gian/hoạt động thường kỳ.
- **Nghiệm thu:** Mục “Sắp diễn ra” chỉ hiện sự kiện còn hiệu lực theo giờ Việt Nam; sự kiện hết hạn/hoãn/hủy được xử lý đúng. Người dùng mở được nguồn xác nhận. Không có sự kiện đã xác minh thì hiện trạng thái trống, không tạo lịch thay thế bằng AI.

## Phần không cần mở rộng trong đợt duyệt kịch bản

Giữ ba gói và quyền lợi đã có, Camera AI, sản phẩm văn hóa, luồng chọn ảnh và xin quyền; tái sử dụng thành phần hiện tại khi triển khai. Các hình minh họa mới trong video không tự trở thành dữ liệu thật, giá thật hoặc tính năng đã nghiệm thu. Tên thương hiệu, giọng đọc, nhạc nền và định dạng video giữ theo bản gốc; thay đổi mã ứng dụng và render video được thực hiện sau bước duyệt này.

Chưa triển khai hoặc kiểm tra trên thiết bị thật trong công việc này. Các hạng mục trên là yêu cầu bổ sung và tiêu chí nghiệm thu, chưa phải cam kết chức năng đã hoạt động.
