THÁM VĂN — BỔ SUNG ẢNH ĐỊA ĐIỂM TP.HCM V3
=========================================

TÓM TẮT
- Danh bạ đầu vào (27/10/2026): 1.505 địa điểm; 341 có GPS; 1.164 thiếu GPS; 26 có liên kết ảnh gốc.
- Bản V3 không khẳng định tất cả 1.505 nơi đều có ảnh chụp được phép tải.
- Không ghi đè hoặc xóa các ảnh đang có trong D:\thamvan\public\images.
- Các ảnh tìm kiếm nhưng chưa đủ căn cứ được chuyển vào trang duyệt, không gán sai địa điểm.
- Chỉ tự tải tệp từ upload.wikimedia.org đã qua lọc giấy phép và mức độ khớp.
- Các nguồn thử: link trong danh bạ, Wikidata, Wikipedia, Commons, ảnh Commons liên kết với OSM (cần GPS), Openverse (chỉ đề cử ảnh để duyệt).
- Google Images và Bing chỉ là đường tìm kiếm phục vụ duyệt thủ công, KHÔNG tải ảnh tìm được một cách mù quáng.

MỘT LỆNH CÀI + CHẠY (Windows PowerShell)
Tải THAMVAN_HCM_V3.zip vào Downloads rồi chạy:
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\THAMVAN_HCM_V3.zip" -DestinationPath "D:\thamvan\tools\hcm-v3" -Force; powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\thamvan\tools\hcm-v3\RUN_V3.ps1"

TEST ÍT ĐỊA ĐIỂM
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\thamvan\tools\hcm-v3\RUN_V3.ps1" -MaxPlaces 20 -DryRun

CHẠY LẠI (tự bỏ qua ảnh đã tải)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\thamvan\tools\hcm-v3\RUN_V3.ps1"

KIỂM TRA CHÍNH XÁC CÒN THIẾU BAO NHIÊU
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\thamvan\tools\hcm-v3\Audit-ThamVanImages.ps1"

BAO CAO SAU KHI CHAY
D:\thamvan\public\images\_thamvan_reports\coverage-summary.json
D:\thamvan\public\images\_thamvan_reports\missing-current.csv
D:\thamvan\public\images\_thamvan_reports\coverage-by-category.csv
D:\thamvan\public\images\_thamvan_reports\review-candidates-v3.csv
D:\thamvan\public\images\_thamvan_reports\errors-v3.csv
D:\thamvan\public\images\thamvan-image-index.json

XỬ LÝ NHỮNG NƠI VẪN THIẾU (QUAN TRỌNG)
1. Mở MISSING_DASHBOARD.html trong gói ZIP bằng Chrome/Edge.
2. Chọn missing-current.csv để lọc danh sách, mở Google Images/Commons tìm ảnh ĐÚNG địa điểm.
3. Chỉ sử dụng ảnh thuộc quyền của bạn, ảnh được cho phép tái sử dụng hoặc có giấy phép tương thích.
4. Lưu file ảnh vào D:\thamvan\public\images\_thamvan_manual_inbox\HCM-0001.jpg (đổi ID tương ứng).
5. Lần đầu chạy Import-Reviewed-ThamVanImages.ps1 sẽ tạo mẫu approved-local.csv.
6. Điền Id, LocalFile, SourceUrl, Author, License, Confirmed=YES cho ảnh đã xác minh.
7. Chạy lại Import-Reviewed-ThamVanImages.ps1, tiếp đến RUN_V3.ps1 để cập nhật index.

DUYỆT ẢNH COMMONS GỢI Ý
Mở REVIEW_IMAGES.html -> chọn review-candidates-v3.csv -> mở trang nguồn,
so sánh ảnh / tên / địa chỉ / giấy phép -> nhấn duyệt -> xuất manually-approved.csv
-> lưu trong _thamvan_reports -> chạy lại RUN_V3.ps1.

QUAN TRỌNG VỀ ĐÚNG ẢNH
- Không thể khẳng định mọi tệp tự tải chính xác tuyệt đối chỉ dựa vào từ khóa.
- Tên chung như 'Trường tiểu học Nguyễn Du' hoặc chi nhánh ngân hàng cần đúng địa chỉ,
  GPS hoặc đối chứng thủ công; không dùng ảnh cơ sở khác cùng thương hiệu.
- Ảnh có thông tin bản quyền không rõ không nên sử dụng trên website công khai.
- Google Maps/Google Places Photos có giới hạn đối với việc lưu trữ và phát lại ảnh;
  không sử dụng link nhặt từ Google để tải hàng loạt vào thư mục local.
- Openverse chỉ là danh mục tổng hợp; cần kiểm tra giấy phép tại trang nguồn.
- OSM/Overpass public API có giới hạn và có thể bị tạm ngưng truy cập khi quá tải.

YÊU CẦU & KIỂM THỬ
Windows 11, PowerShell 5.1 hoặc 7, kết nối mạng.
Đã xác nhận JSON có 1505 ID và đóng gói công cụ trên môi trường này.
Chưa chạy thử network thực tế tại máy Windows của bạn; không được coi là hoàn tất tải 1505 ảnh.
