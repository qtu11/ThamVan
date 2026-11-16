# Tạo lời đọc tiếng Việt bằng VieNeu-TTS v3 Turbo (chạy CPU, 48 kHz, Apache-2.0).
# Cài một lần:  uv venv --python 3.12 video/.venv-tts && uv pip install --python video/.venv-tts/Scripts/python.exe vieneu
# Dùng:         video/.venv-tts/Scripts/python.exe video/make_vo.py ["Tên giọng"] [--guide]
#               -> video/remotion/public/vo/<id>.wav + durations.json
#               --guide: lời hướng dẫn sử dụng cho bản ~90 giây -> public/vo-guide/
# Đổi giọng: truyền tên giọng (xem video/voice-samples/). Mặc định: Mỹ Duyên (nữ, miền Nam, đọc truyện).
import json
import pathlib
import subprocess
import sys
import tempfile

from vieneu import Vieneu

sys.stdout.reconfigure(encoding="utf-8")

ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
GUIDE = "--guide" in sys.argv
VOICE = ARGS[0] if ARGS else "Mỹ Duyên"
OUT = pathlib.Path("video/remotion/public/vo-guide" if GUIDE else "video/remotion/public/vo")

LINES = {
    "intro": "Thám Văn. Đi để thấy. Chạm để hiểu.",
    "hook": "Sài Gòn không chỉ để đi qua. Hơn một nghìn bốn trăm điểm di sản, tư liệu có nguồn rõ ràng, và ba ngôn ngữ, tất cả nằm gọn trong tay bạn.",
    "home": "Mở ứng dụng lên, bạn chỉ cần cho biết mình có bao nhiêu thời gian, và thích khám phá điều gì. Thám Văn sẽ gợi ý một lộ trình vừa vặn.",
    "explore": "Muốn tìm một ngôi chùa cổ? Gõ vào ô tìm kiếm, hoặc lọc theo loại hình và khu vực. Chạm vào một địa điểm, đọc câu chuyện của nó, rồi đi thẳng tới đó.",
    "map": "Bản đồ cho bạn thấy những gì đang ở quanh mình, và chỉ đường tới tận nơi.",
    "camera": "Đứng trước một công trình mà chưa biết tên? Bật camera lên. Thám Văn nhận diện, và kể bạn nghe câu chuyện phía sau.",
    "experiences": "Nếu muốn đi sâu hơn, hãy chọn một hành trình kể chuyện. Mỗi điểm dừng là một lát cắt của Sài Gòn, xưa và nay.",
    "challenges": "Còn nếu thích thử thách, hãy trả lời câu đố, check-in tại di sản, và tích điểm để lên cấp.",
    "journey": "Mỗi nơi bạn đi qua đều được đóng dấu, vào cuốn hộ chiếu thực địa của riêng bạn.",
    "dashboard": "Nơi đã lưu, lịch trình, và cả những chuyến đi cùng gia đình, đều gọn trong một không gian.",
    "partners": "Với bảo tàng, điểm du lịch hay trường học, Thám Văn có thể cùng bạn thiết kế những hành trình riêng.",
    "languages": "Tiếng Việt, tiếng Anh, hay tiếng Trung, ai cũng có thể chạm vào Sài Gòn.",
    "outro": "Thám Văn. Khám phá Sài Gòn, qua từng câu chuyện.",
}

# Lời hướng dẫn sử dụng, khớp 11 cảnh của bản 58 giây (Silent58.tsx). Số viết bằng chữ để đọc đúng.
# Đối chiếu: gói ở src/lib/plans.ts (AI lịch trình chỉ có ở Premium Family); thông báo gần bạn còn là định hướng phát triển.
GUIDE_LINES = {
    "intro": "Chào mừng bạn đến với Thám Văn, nền tảng du lịch thông minh giúp bạn khám phá lịch sử, văn hóa và điểm đến tại Việt Nam. Cùng xem cách sử dụng nhé.",
    "camera": "Đầu tiên, bấm nút camera ở giữa thanh điều hướng. Chụp một công trình kiến trúc, linh vật hay hiện vật, rồi chờ vài giây để AI gợi ý thông tin và câu chuyện liên quan.",
    "culture": "Bạn cũng có thể tìm hiểu lễ hội, trang phục và nghề truyền thống qua hình ảnh. Chạm vào từng thẻ để đọc thêm.",
    "map": "Muốn biết quanh mình có gì? Mở bản đồ, chọn bán kính, ví dụ ba ki lô mét, rồi chạm vào một điểm để xem chi tiết và chỉ đường.",
    "notice": "Sắp tới, Thám Văn sẽ báo cho bạn khi có địa điểm thú vị ở gần. Tính năng này đang được phát triển.",
    "challenges": "Vào mục Thử thách, chọn mức dễ, vừa hoặc khó. Đọc gợi ý, đoán tên địa danh, và giải đố về văn hóa.",
    "rewards": "Mỗi thử thách hoàn thành giúp bạn tích lũy điểm kinh nghiệm, lên cấp, và sưu tập thêm huy hiệu.",
    "planner": "Với gói Premium Family, bạn chỉ cần chọn thời gian và sở thích, AI sẽ gợi ý một lịch trình phù hợp.",
    "memories": "Ở trang địa điểm, bấm lưu để giữ lại nơi bạn thích, hoặc đánh dấu nơi đã đến. Hành trình của bạn được giữ lại trong trang cá nhân.",
    "pricing": "Bạn có thể bắt đầu miễn phí, với năm thử thách mỗi ngày. Gói Premium ba mươi chín nghìn đồng một tháng, không giới hạn thử thách. Gói Premium Family tám mươi chín nghìn đồng một tháng, cho bốn thành viên, kèm AI lên lịch trình.",
    "outro": "Thám Văn. Chạm để hiểu di sản Việt. Mở Thám Văn và bắt đầu hành trình của bạn ngay hôm nay.",
}
if GUIDE:
    LINES = GUIDE_LINES

# Giọng gốc đã tự nhiên: chỉ cắt lặng đầu/cuối, lọc trầm, nén nhẹ và chuẩn hóa -16 LUFS.
CHAIN = ",".join(
    [
        "silenceremove=start_periods=1:start_threshold=-50dB",
        "areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse",
        "highpass=f=70",
        "acompressor=threshold=-20dB:ratio=2:attack=8:release=120:makeup=1.5",
        "loudnorm=I=-16:TP=-1.5:LRA=9",
        "aresample=48000",
    ]
)


def duration(path: pathlib.Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def main() -> None:
    tts = Vieneu()
    voices = {vid for _, vid in tts.list_preset_voices()}
    if VOICE not in voices:
        raise SystemExit(f"Không có giọng '{VOICE}'. Có: {', '.join(sorted(voices))}")
    OUT.mkdir(parents=True, exist_ok=True)
    durations: dict[str, float | str] = {}
    with tempfile.TemporaryDirectory() as d:
        for key, text in LINES.items():
            raw = pathlib.Path(d) / f"{key}.wav"
            tts.save(tts.infer(text, voice=VOICE), str(raw))
            out = OUT / f"{key}.wav"
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-af", CHAIN, "-ac", "1", str(out)],
                check=True,
            )
            durations[key] = round(duration(out), 3)
            print(f"{key:12} {durations[key]:6.2f}s")
    durations["_voice"] = f"VieNeu-TTS v3 Turbo · {VOICE}"
    (OUT / "durations.json").write_text(json.dumps(durations, indent=2, ensure_ascii=False), encoding="utf-8")


main()
