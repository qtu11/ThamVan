# Đánh giá & tinh chỉnh prompt nhận diện ảnh

`npm run vision:eval` chạy **đúng pipeline production** (`src/lib/recognition-pipeline.ts`) với
model DeepSeek trên TheHive, trên ảnh thật trong danh mục, rồi chấm điểm. Cần `THEHIVE_API_KEY`
trong `.env.local`. Không nằm trong `npm test` vì gọi API thật (tốn phí, ~3–4 phút cho 30 ca).

## Bộ dữ liệu
- **located**: ảnh của một địa điểm có tọa độ đã xác minh (`hasGps`), thiết bị "đứng" đúng tại đó.
  Đạt khi ứng viên số 1 là địa điểm đó.
- **visual**: cùng ảnh, không có vị trí. Đạt khi địa điểm nằm trong 3 ứng viên.
- **negative**: ảnh Hạ Long, Hội An, Huế, Mỹ Sơn, Thăng Long, Tràng An trong khi thiết bị báo đang
  ở một địa điểm TP.HCM. Đạt khi **không** có ứng viên nào (ảnh phải thắng vị trí).

## Tùy chọn (biến môi trường)
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `EVAL_SIZE` | 12 | Số địa điểm (chia đều theo nhóm danh mục) |
| `EVAL_SEED` | 1 | Đổi để lấy mẫu khác, giữ nguyên để so sánh A/B |
| `EVAL_LOCALE` | vi | vi / en / zh |
| `EVAL_CONTEXT` | 0 | 1 = gọi Nominatim/Overpass thật cho ngữ cảnh địa điểm |
| `EVAL_CONCURRENCY` | 3 | Số request song song |
| `VISION_PROMPT_FILE` | prompts/recognition.md | Trỏ sang bản nháp prompt để A/B |
| `VISION_MODEL` | deepseek-ai/deepseek-v4.1-flash-1017 | Model trên TheHive |

Báo cáo JSON (tóm tắt, ca lỗi, toàn bộ kết quả) ghi vào `evals/results/` (đã gitignore).

## Quy trình "training" prompt
1. Chạy baseline, đọc `failures` trong báo cáo.
2. Sửa một quy tắc trong bản nháp prompt nhắm đúng kiểu lỗi.
3. Chạy lại **cùng seed**, so `locatedTop1`, `visualTop3`, `negativeRejected`. Chỉ giữ thay đổi
   nếu tăng điểm mà `negativeRejected` không giảm.
4. Đổi seed để kiểm tra không bị quá khớp vào một mẫu.

## Lịch sử
| Ngày | Prompt | locatedTop1 | locatedTop3 | visualTop3 | negativeRejected |
|---|---|---|---|---|---|
| 2026-11-15 | v1 (trước) | 0.67 | 0.75 | 0.25 | 1.00 |
| 2026-11-15 | v2 (hiện tại) | 0.83 | 0.92 | 0.33 | 1.00 |
