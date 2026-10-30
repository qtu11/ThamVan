# Vận hành membership và điều kiện chạy thật

## Đã triển khai trong mã nguồn

- Dashboard khách: tổng quan, đúng 3 gói, checkout, lịch sử đơn membership, lượt ghé, ghi GPS có đồng ý, phát lại/tải video, AI Family, lời mời 4 thành viên, đóng góp và hộp thư/push.
- Dashboard admin: sổ giao dịch membership, khách hàng/quyền gói hiệu lực, duyệt địa điểm, phí và chi phí thực tế, lãi theo sổ, nhật ký và thông báo duyệt. Đơn cũ/yêu cầu đối tác giữ trang riêng.
- RLS giữ riêng GPS, lịch sử và itinerary. Không có UI cho admin đọc GPS thành viên.
- Chỉ máy chủ cấp quyền sau callback. Hết hạn/hoàn nguồn quyền không mở lại bằng callback lặp. Giá không lấy từ trình duyệt.

## Cài đặt

1. Sao lưu và chạy migration **001–008 theo thứ tự** trên Supabase; migration mới là additive, không xóa đơn cũ. Chạy seed cho nội dung thử thách. Kiểm thử PGlite chỉ chứng minh SQL cục bộ, không chứng minh dự án cloud đã được migrate.
2. Điền Supabase URL/publishable/service-role; service-role chỉ phía server. Cấu hình auth redirect và email/Google theo tài liệu auth hiện có.
3. Điền site URL HTTPS thật và địa chỉ hỗ trợ có người xử lý. `COMMERCE_ENABLED=true` chỉ sau cấu hình và kiểm thử provider.
4. VietQR: payOS merchant keys, callback `/api/payments/payos`. Cần migration 007 để phân phối callback đơn membership mới và đơn cũ.
5. Visa/Mastercard: SePay **Payment Gateway**, merchant ID/secret, bật kênh thẻ phía SePay, đặt IPN `/api/payments/sepay` với phương thức xác thực SECRET_KEY và giá trị trùng `SEPAY_IPN_SECRET`; bật `SEPAY_CARD_ENABLED=true`. Không nhầm với API webhook chuyển khoản ngân hàng của SePay. Checkout POST lên trang do SePay host; website không nhận số thẻ hoặc CVV.
6. AI: key, endpoint HTTPS OpenAI-compatible và model trong `ITINERARY_*`. Không có fallback lịch trình giả. Technical limit 3 yêu cầu/phút/tài khoản, output có giới hạn kích thước và schema.
7. Push: tạo VAPID với `npx web-push generate-vapid-keys`, public key vào `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, secret vào `VAPID_PRIVATE_KEY`, subject thật. Public key được đưa vào client lúc build, nên build lại khi thay. HTTPS + trình duyệt hỗ trợ + quyền từ người dùng; iPhone/iPad hỗ trợ từ iOS/iPadOS16.4 và cần mở web từ màn hình chính. Không bảo đảm hiện màn hình khóa.
8. Cấp admin qua thao tác quản trị Supabase có kiểm soát trong `user_roles`, không từ form khách. Không tạo tài khoản admin mặc định.

## Đối soát và hoàn tiền

- Cổng trả về success URL không phải xác nhận thu tiền. Chỉ chữ ký payOS/secret IPN SePay hợp lệ và kiểm tra số tiền, currency, order/provider/reference mới kích hoạt gói.
- Mỗi đơn có một membership ledger, callback lặp không cộng thêm tháng. Gia hạn cùng gói tạo kỳ nối tiếp. Family tối đa chủ +3 người, token mời một lần/7 ngày.
- Tại admin, nhập phí thực tế từng đơn và chứng từ chi phí; lãi chỉ theo chi phí đã ghi. Chưa phải báo cáo kế toán cuối cùng, chưa tự đồng bộ phí hoặc thuế từ provider.
- Không có nút giả hoàn tiền. Sau khi provider hoàn **toàn bộ** và đối soát xong, backend service tin cậy gọi `refund_plan_order(order_uuid, confirmed_reference)`. Hàm lưu reference, revoke quyền từ đơn; chỉ service_role có quyền gọi. Chưa tự động hóa hoàn một phần, chargeback hoặc TRANSACTION_VOID. Cần quy trình hỗ trợ để xử lý các sự kiện này trước mở bán rộng.
- Nếu giao dịch về sau xóa tài khoản: đơn được tách user, không cấp lại gói; người vận hành đối soát và hoàn phù hợp.

## Giới hạn đã công khai

- GPS chỉ khi trang mở, tự dừng khi ẩn. Km là tổng khoảng cách giữa các điểm ghi, không xác nhận tuyến giao thông. Tua nhanh tải tối đa 2.000 điểm; trình duyệt cần canvas captureStream và MediaRecorder mới xuất video.
- Catalog cộng đồng hiển thị tối đa 500 địa điểm mới nhất/truy vấn; dashboard có giới hạn danh sách (100 visits, 30 trips, 50 orders, 20 itineraries). Tổng thu admin được tính độc lập với giới hạn danh sách.
- AI chỉ dùng danh mục và đề xuất thời gian, không có API vé/giờ mở cửa/traffic live. Không cam kết một lịch trình được tối ưu tuyến giao thông.
- Tính năng mới ưu tiên nội dung tiếng Việt; một số nhãn dashboard còn tiếng Việt ở locale en/zh. Core navigation/checkout có bản dịch.
- Export giới hạn 20.000 bản ghi mỗi bảng/điểm GPS, có cờ có thể bị cắt để yêu cầu xuất bổ sung. Xóa session xóa điểm GPS. Dữ liệu order còn theo nghĩa vụ và chính sách vận hành, không còn user link khi xóa account.

## Các bước cần kiểm tra trên môi trường có cấu hình

- Đăng nhập thật: Free→thanh toán→Premium→gia hạn, Premium→Family, mời đủ4, rời/xóa thành viên, hết hạn và hoàn toàn bộ.
- PayOS và SePay sandbox/live: callback hợp lệ/sai chữ ký/sai số tiền/trùng, nhận IPN sau khi đóng tab, giao dịch đến chậm, provider outage.
- Android và iPhone cài Home Screen: quyền camera/GPS/push, gửi thử thực, thông báo admin và phản hồi tác giả.
- AI với key thật: chất lượng tuyến 2 ngày, các khu vực ít điểm, lỗi model, kiểm tra thực địa và chi phí thực.
- Dữ liệu vận hành thật, quyền ảnh/nội dung, chủ thể kinh doanh, chính sách hỗ trợ/hoàn tiền và sao lưu.

Chưa có các credentials hoặc giao dịch thật ở phiên triển khai này. Không xem build, unit tests hoặc dashboard preview là bằng chứng đã thu tiền hay sẵn sàng vận hành thương mại toàn bộ.

## Tài liệu provider chính thức đã đối chiếu

- [SePay: form thanh toán](https://developer.sepay.vn/vi/cong-thanh-toan/API/don-hang/form-thanh-toan)
- [SePay: IPN](https://developer.sepay.vn/vi/cong-thanh-toan/IPN)
- [Web Push trên iOS/iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [web-push Node library](https://github.com/web-push-libs/web-push)

