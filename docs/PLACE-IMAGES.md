# Ảnh địa điểm TP.HCM

## Hiện trạng ngày 27/10/2026

Index giữ đủ **1.505 bản ghi**. Thư viện có **409 ảnh thể hiện địa điểm**, còn **1.096 mục thiếu ảnh** (27,18%). Tất cả 409 file đã được xem để lọc chủ thể: mặt tiền, kiến trúc, khuôn viên, cảnh quan hoặc không gian bên trong. Bước này chưa thay thế xác nhận danh tính, chi nhánh và quyền xuất bản.

**162 ảnh có tác giả và thông tin giấy phép; 0 ảnh được gắn trạng thái duyệt đầy đủ.** Ảnh từ website trường, doanh nghiệp hoặc báo chí còn chờ xác nhận quyền sử dụng. Không suy ra quyền sử dụng chỉ vì ảnh có trên web.

Đã rà lại toàn bộ ảnh và chuyển **33 ảnh không phù hợp** ra khỏi public: món ăn, nhóm người, banner, cận cảnh con vật, mô hình, ảnh đường phố không thể hiện công trình. The Vintage Emporium, Cocotte, Marcel Gourmet Burger và CLAY đã được thay bằng ảnh mặt tiền/không gian; Thảo Cầm Viên được thay bằng ảnh cổng, Chợ Rẫy bằng ảnh tòa nhà. Hai ảnh gán nhầm Masteri Thảo Điền và The Global City đã được loại ở đợt trước. Ảnh THISO chi nhánh Trường Chinh không được dùng cho THISO Mall Sala.

Số liệu mới nhất ở `public/images/_thamvan_reports/coverage-summary.json`. Danh mục HCM cục bộ trong `src/data/hcm-places.json` đã nhận mapping từ index sau audit, thay cho các đường dẫn ảnh cũ. Bộ lọc vùng hiện tại của ứng dụng vẫn áp dụng. Không tự xuất bản lên Supabase. Fallback sáu địa điểm chỉ dùng ảnh đủ thông tin tác giả, giấy phép và nguồn theo schema nội dung.

Lượt tiếp theo thêm 53 ảnh sau khi xem từng file: địa đạo Bến Đình, bảo tàng, di tích, khuôn viên du lịch và bệnh viện. Ảnh cổng Lăng Ông ghi “xã Thạnh An” được loại ở vùng chờ; dùng ảnh Miếu Hải Thần tại Cần Thạnh cho mục tương ứng. Ảnh chân dung khách tại Bảo tàng Áo Dài được thay bằng ảnh toàn cảnh khuôn viên.

## Xem và đối chiếu

Mở `/images/_thamvan_reports/index.html`: tìm không dấu theo tên/ID/địa chỉ, lọc nhóm, chọn đã có ảnh/thiếu ảnh/toàn bộ 1.505 mục, phân trang 24 mục. Mỗi ảnh có nguồn và trạng thái duyệt. Không có JavaScript vẫn đọc được toàn bộ ảnh và danh sách thiếu.

Báo cáo cạnh trang thư viện:

- `coverage-current.csv`: toàn bộ danh mục và trạng thái.
- `missing-current.csv`: các mục còn thiếu.
- `coverage-by-category.csv`: độ phủ theo nhóm.
- `photo-research.csv`: nguồn tìm kiếm, tác giả, giấy phép, URL giấy phép và bước kiểm tra chủ thể.

Nguồn gồm Wikimedia Commons, website trường/doanh nghiệp và các trang nguồn đối chiếu tìm trên web. Sổ thu thập ghi nhận **523 URL nguồn**, gồm cả lỗi kết nối và trang không có ảnh phù hợp; đây không phải số nguồn tải thành công. Một số trang yêu cầu xác minh trình duyệt hoặc trả 404/410. Nhiều bản ghi đầu vào thiếu địa chỉ/tọa độ; các chi nhánh chưa xác định được giữ trạng thái thiếu.

## Luồng kiểm tra

1. Lưu ứng viên vào `asset/place-photo-research/`, chưa ghi ảnh mới vào public.
2. Đọc nguồn, so tên/địa chỉ/chi nhánh và xem ảnh. Loại món ăn, chân dung, logo, poster, bản đồ, ảnh dựng và địa điểm khác. Caption trùng tên chưa đủ.
3. Ghi `visualReview.decision = accepted`, `subject = LOCATION_VIEW` và SHA-256 của đúng file đã xem.
4. Finalizer audit file hiện có trước khi nhập ứng viên đã duyệt chủ thể, kiểm tra hash và ảnh trùng, rồi tạo lại báo cáo. Audit `--apply` và finalizer đều đồng bộ mapping ảnh vào danh mục HCM cục bộ; giữ nguyên tọa độ, địa chỉ, nội dung và bản dịch.
5. Danh tính và quyền sử dụng được duyệt riêng. Chỉ `review.identity = approved` và `review.license = approved`, kèm tác giả/giấy phép/URL giấy phép/nguồn HTTPS, mới được coi là duyệt đầy đủ.

Audit yêu cầu dấu duyệt chủ thể khớp SHA-256. Thay nội dung file làm mất hiệu lực bước duyệt cũ. File chưa được xem, ảnh sinh từ mẫu, render và ảnh trùng gán được chuyển vào quarantine khi chạy `--apply`, kèm manifest và hash. So hash không tự phát hiện món ăn hay ảnh sai địa điểm; việc xem ảnh vẫn bắt buộc.

Đã bỏ bước khôi phục ảnh dựa vào tên file và `.source.json`. Nếu nhập bị ngắt, chỉ nhận lại file public có byte khớp đúng ứng viên đã duyệt; file xung đột không bị ghi đè. Bộ dựng danh mục cũng không quét ảnh ngoài index hoặc tự gán Wikimedia/CC BY-SA cho nguồn chưa rõ. Trang chi tiết hiển thị tên miền nguồn và trạng thái quyền sử dụng khi thiếu credit.

## Chạy lại

```powershell
npm run images:audit       # kiểm tra, không thay đổi file
npm run images:repair      # lưu bản sao, chuyển ảnh không đạt, tạo báo cáo
npm run images:discover    # tìm Commons và tải vào vùng chờ xem
npm run images:wikipedia   # tìm từ bài Wikipedia
npm run images:sources     # nguồn tham khảo và website trường
npm run images:galleries   # album chi tiết của các quán còn thiếu
npm run images:web -- asset/place-photo-research/web-sources.json
npm run images:finalize    # chỉ nhập file đã duyệt chủ thể và khớp hash
```

Các lệnh tải liên hệ nguồn ngoài, có giới hạn thời gian/dung lượng và checkpoint; các nguồn này không cần API key. Không có bước tạo ảnh giả để lấp danh mục. Không sửa ledger hoặc gắn cờ duyệt hàng loạt khi chưa xem từng ảnh.

Sổ nguồn: `discovery-state.json` (Commons/Wikipedia), `source-discovery.json` (trang nguồn/album), `web-discovery.json` (tìm trực tiếp bằng web). Các manifest `web-*.json` ghi URL cụ thể.

## File ảnh và khôi phục

Ảnh Commons và `.source.json` ở `asset/places/`. Ảnh web/album/trường ở `asset/place-photo-research/web-photos/`, `gallery-candidates/`, `source-photos/`; ledger ghi mapping sang public. Đây là JPEG phục vụ web, có thể đã nén/đổi kích thước. Cache giữ dữ liệu tải được khi có; không coi file tải về là chứng nhận quyền sử dụng.

Đợt sửa ban đầu chuyển **1.473 thẻ tiêu đề**, ba render và một skyline sai ra khỏi public. Cả **1.477 file** nằm tại `asset/quarantine/place-images/2026-10-27T06-28-11-537Z/`. Các đợt loại tiếp theo có thư mục thời gian riêng và `moves.json`. Không phục hồi hàng loạt quarantine vào public.

Sáu ảnh dùng trong ứng dụng giữ tách biệt tại `asset/heritage/`. Hai bộ sinh cũ chỉ gọi audit; mẫu đồ họa đơn lẻ chỉ xuất vào `asset/design-samples/`.

Unit/E2E kiểm tra luồng này; xem `TEST-REPORT.md` và `docs/verification/`. Các kiểm tra kỹ thuật không tự xác nhận danh tính công trình hay quyền sử dụng ảnh.
