"""Build the approved 120 s narration with the original Mỹ Duyên voice and music.

Run from the repository root with video/.venv-tts/Scripts/python.exe.
Use system Python with --align afterwards (installed faster-whisper, small model).
"""
import argparse
import difflib
import hashlib
import json
import pathlib
import re
import subprocess
import sys
import tempfile
import unicodedata
import urllib.request
import wave

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent
PUBLIC = ROOT / "remotion/public"
VO = PUBLIC / "vo-120"
AUDIO = PUBLIC / "audio-120"
IDS = "intro home gifts events camera learn atlas notification challenge pricing voucher family planner titles journey timeline permissions outro".split()
STARTS = [0, 5, 12, 18, 23, 31, 38, 46, 52, 58, 65, 70, 77, 83, 90, 96, 104, 113, 120]
# Kept identical to make_vo.py: no tempo/pitch changes.
CHAIN = ",".join([
    "silenceremove=start_periods=1:start_threshold=-50dB",
    "areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse",
    "highpass=f=70",
    "acompressor=threshold=-20dB:ratio=2:attack=8:release=120:makeup=1.5",
    "loudnorm=I=-16:TP=-1.5:LRA=9",
    "aresample=48000",
])
CUES = {
    "intro": ["Thám Văn", "Chạm"],
    "home": ["mô hình", "Kéo xuống"],
    "gifts": ["nón lá thêu", "ly sứ", "ký họa Sài Gòn"],
    "events": ["sự kiện văn hóa", "sắp diễn ra"],
    "camera": ["Chạm Camera AI", "tượng rồng", "Nhà thờ Đức Bà", "hiện vật", "tiết mục"],
    "learn": ["thông tin", "Chạm Tìm hiểu thêm", "câu chuyện", "nguồn tư liệu"],
    "atlas": ["web", "điện thoại", "Atlas ba chiều", "bật vị trí", "bán kính", "ba ki lô mét"],
    "notification": ["thông báo chờ", "Chạm", "thông tin", "đường đi"],
    "challenge": ["check-in", "thử thách", "điểm kinh nghiệm", "lên cấp"],
    "pricing": ["Ba gói", "Free", "năm lượt", "Premium", "không giới hạn"],
    "voucher": ["Điểm XP", "đổi voucher", "ưu đãi"],
    "family": ["Premium Family", "cả nhà", "lịch trình"],
    "planner": ["bán kính", "thời gian", "ngân sách", "AI sắp xếp", "chi tiết"],
    "titles": ["địa điểm", "lưu ảnh", "danh hiệu", "Nhà Lãng Du", "Nhà Du Mục", "Nhà Thám Hiểm"],
    "journey": ["Lưu ảnh", "nơi đã đến", "quãng đường", "hành trình"],
    "timeline": ["TimelineMap", "bản đồ", "và ảnh", "dựng lại chuyến đi", "video kỷ niệm", "của riêng bạn"],
    "permissions": ["đồng ý chính sách", "vị trí", "camera", "chọn ảnh", "chỉ nhận ảnh bạn chọn"],
    "outro": ["Thám Văn", "Khám phá Sài Gòn", "Chạm để hiểu"],
}


def texts():
    content = (ROOT / "KICH_BAN_THAM_VAN_2_PHUT_DUYET.md").read_text(encoding="utf-8")
    lines = re.findall(r"\*\*Lời đọc:\*\* “([^”]+)”", content)
    assert len(lines) == len(IDS) == 18, "The approved script must contain 18 scenes"
    return dict(zip(IDS, lines))


def normalize(word):
    return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKD", word.lower().replace("đ", "d")))


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def wav_duration(path):
    with wave.open(str(path), "rb") as stream:
        return stream.getnframes() / stream.getframerate()


def timing_data():
    lines = texts()
    scenes = []
    for i, key in enumerate(IDS):
        path = VO / f"{key}.wav"
        if not path.exists():
            continue
        dur = wav_duration(path)
        # Allow 0.20 s before and after a normal sentence; report excess, never clip.
        offset = min(0.3, max(0, (STARTS[i + 1] - STARTS[i] - dur) / 2))
        words = lines[key].split()
        scenes.append({
            "id": key, "index": i, "sceneStart": STARTS[i], "sceneEnd": STARTS[i + 1],
            "start": round(STARTS[i] + offset, 6), "offset": round(offset, 6),
            "duration": round(dur, 6), "end": round(STARTS[i] + offset + dur, 6),
            "text": lines[key], "file": f"vo-120/{key}.wav",
            # shortcut: equal syllable spacing until local Whisper alignment replaces it.
            "words": [{"text": w, "start": round(offset + dur * j / len(words), 4),
                       "end": round(offset + dur * (j + 1) / len(words), 4), "estimated": True}
                      for j, w in enumerate(words)],
        })
    return {"fps": 30, "total": 120, "voice": "VieNeu-TTS v3 Turbo · Mỹ Duyên",
            "processing": CHAIN, "noTempoOrPitchChange": True, "scenes": scenes}


def add_cues(data):
    for scene in data["scenes"]:
        words = scene["words"]
        tokens = [normalize(w["text"]) for w in words]
        scene["cues"] = {}
        for phrase in CUES[scene["id"]]:
            target = [normalize(w) for w in phrase.split()]
            matches = [i for i in range(len(tokens) - len(target) + 1) if tokens[i:i + len(target)] == target]
            assert matches, (scene["id"], phrase)
            scene["cues"][phrase] = words[matches[0]]["start"]
    return data


def synthesize():
    from vieneu import Vieneu
    import soundfile as sf
    tts = Vieneu()
    assert "Mỹ Duyên" in {key for _, key in tts.list_preset_voices()}
    with tempfile.TemporaryDirectory() as directory:
        for key, line in texts().items():
            target = VO / f"{key}.wav"
            if not target.exists():
                phrases = line.split(". ") if key == "permissions" else [line]
                audio_parts = []
                for j, phrase in enumerate(phrases):
                    raw = pathlib.Path(directory) / "raw.wav"
                    processed = pathlib.Path(directory) / "part.wav"
                    tts.save(tts.infer(phrase, voice="Mỹ Duyên"), str(raw))
                    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-af", CHAIN,
                                    "-ac", "1", str(processed)], check=True)
                    if j:
                        audio_parts.append(np.zeros(round(.14 * 48000)))
                    audio_parts.append(sf.read(processed)[0])
                sf.write(target, np.concatenate(audio_parts), 48000, subtype="PCM_16")
                if key == "permissions":
                    write_json(VO / "permissions-phrases.json", {"texts": phrases,
                        "durations": [len(part)/48000 for part in audio_parts], "gapSeconds": .14})
            dur = wav_duration(target)
            print(f"{key:14} {dur:7.3f} s / slot {STARTS[IDS.index(key)+1]-STARTS[IDS.index(key)]} s", flush=True)
            write_json(VO / "timings.json", add_cues(timing_data()))
    write_json(VO / "durations.json", {**{k: round(wav_duration(VO / f"{k}.wav"), 3) for k in IDS},
                                      "_voice": "VieNeu-TTS v3 Turbo · Mỹ Duyên"})


def align():
    from faster_whisper import WhisperModel
    model = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=4)
    fallback = None
    data = timing_data()
    for scene in data["scenes"]:
        segments, _ = model.transcribe(str(VO / f"{scene['id']}.wav"), language="vi", beam_size=3,
                                       word_timestamps=True, vad_filter=False, condition_on_previous_text=False,
                                       initial_prompt=scene["text"])
        found = [word for seg in segments for word in (seg.words or [])]
        expected = [normalize(w["text"]) for w in scene["words"]]
        actual = [normalize(w.word) for w in found]
        score = lambda tokens: sum(block.size for block in difflib.SequenceMatcher(None, expected, tokens, autojunk=False).get_matching_blocks())
        scene["alignmentModel"] = "Whisper small"
        if score(actual) / len(expected) < .9:
            # ASR can hallucinate on a clean short clip; keep the stronger independent match.
            fallback = fallback or WhisperModel("base", device="cpu", compute_type="int8", cpu_threads=4)
            retry, _ = fallback.transcribe(str(VO / f"{scene['id']}.wav"), language="vi", beam_size=3,
                word_timestamps=True, vad_filter=False, condition_on_previous_text=False, initial_prompt=scene["text"])
            alternate = [word for seg in retry for word in (seg.words or [])]
            alternate_tokens = [normalize(w.word) for w in alternate]
            if score(alternate_tokens) > score(actual):
                found, actual = alternate, alternate_tokens
                scene["alignmentModel"] = "Whisper base (higher approved-word match)"
        anchors = {}
        for block in difflib.SequenceMatcher(None, expected, actual, autojunk=False).get_matching_blocks():
            for j in range(block.size):
                anchors[block.a + j] = found[block.b + j]
        for i, word in enumerate(scene["words"]):
            if i in anchors:
                word.update(start=round(scene["offset"] + anchors[i].start, 4),
                            end=round(scene["offset"] + anchors[i].end, 4), estimated=False)
            else:
                before = max((j for j in anchors if j < i), default=-1)
                after = min((j for j in anchors if j > i), default=len(expected))
                a = anchors[before].end if before >= 0 else 0
                b = anchors[after].start if after < len(expected) else scene["duration"]
                word.update(start=round(scene["offset"] + a + (b-a)*(i-before-1)/(after-before-1), 4),
                            end=round(scene["offset"] + a + (b-a)*(i-before)/(after-before-1), 4))
        scene["alignmentMatch"] = round(len(anchors) / len(expected), 3)
        scene["recognized"] = " ".join(w.word.strip() for w in found)
        print(scene["id"], scene["alignmentMatch"], scene["recognized"], flush=True)
        write_json(VO / "timings.json", add_cues(data))


def assets():
    import soundfile as sf
    source = PUBLIC / "music.wav"
    music, sr = sf.read(source, dtype="float32", always_2d=True)
    bar = 4 * 60 / 84  # The original make_music.py tempo.
    splice, loop_start = 32 * bar, 24 * bar
    half = 0.12
    first = music[:round((splice + half) * sr)]
    loop = music[round((loop_start - half)*sr):round((splice + half)*sr)]
    tail = music[round((splice-half)*sr):]
    n = round(2*half*sr)
    ramp = np.linspace(0, 1, n, dtype=np.float32)[:, None]
    def join(a, b):
        return np.concatenate([a[:-n], a[-n:]*(1-ramp)+b[:n]*ramp, b[n:]])
    extended = join(join(first, loop), tail)[:120*sr]
    assert len(extended) == 120*sr
    extended[-round(2*sr):] *= np.linspace(1, 0, round(2*sr), dtype=np.float32)[:, None]
    sf.write(AUDIO / "music-120.wav", extended, sr, subtype="PCM_16")
    for name, remote in [("click", "mouse-click"), ("whoosh", "whoosh"), ("shutter", "shutter-modern")]:
        target = AUDIO / f"{name}.wav"
        if not target.exists():
            request = urllib.request.Request(f"https://remotion.media/{remote}.wav", headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(request, timeout=30) as response:
                target.write_bytes(response.read())
        assert wav_duration(target) > 0
    # Two restrained UI tones, not replacement music.
    for name, notes in [("notification", [880, 1174.66]), ("chime", [659.25, 880, 1318.51])]:
        tone = np.zeros(round(0.7*48000), dtype=np.float32)
        for i, frequency in enumerate(notes):
            t = np.arange(round(0.46*48000))/48000
            envelope = np.minimum(1, t/.008)*np.exp(-t*11)
            sig = .2*np.sin(2*np.pi*frequency*t)*envelope
            start = round(i*.07*48000)
            tone[start:start+len(sig)] += sig
        sf.write(AUDIO / f"{name}.wav", tone, 48000, subtype="PCM_16")
    write_json(AUDIO / "provenance.json", {
        "musicSource": "music.wav", "musicSourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "originalDuration": len(music)/sr, "duration": 120, "tempo": 84,
        "edit": "Original 0–91.5486 s, repeat original 68.4514–91.5486 s, original 91.3086 s to end; 0.24 s phase-aligned linear crossfades. Trim 0.5571 s tail to 120 s; 2 s closing fade.",
        "noTempoOrPitchChange": True, "sfxSource": "Original Remotion URLs already referenced by Video.tsx",
        "notificationAndChime": "Local sine UI tones; no replacement music or voice.",
    })


def check():
    import soundfile as sf
    data = json.loads((VO / "timings.json").read_text(encoding="utf-8"))
    assert len(data["scenes"]) == 18
    excess = []
    for scene in data["scenes"]:
        audio, sr = sf.read(VO / f"{scene['id']}.wav")
        assert sr == 48000 and len(audio) > 0 and np.isfinite(audio).all()
        assert np.abs(audio).max() < 1
        assert all(word["end"] > word["start"] for word in scene["words"])
        assert all(a["start"] <= b["start"] for a, b in zip(scene["words"], scene["words"][1:]))
        if "alignmentMatch" in scene:
            assert scene["alignmentMatch"] >= .9, scene["id"]
        if scene["end"] > scene["sceneEnd"]:
            excess.append({"id": scene["id"], "excessSeconds": round(scene["end"]-scene["sceneEnd"], 3)})
    music, music_sr = sf.read(AUDIO / "music-120.wav")
    original, original_sr = sf.read(PUBLIC / "music.wav")
    assert len(music) / music_sr == 120 and music_sr == original_sr
    assert np.array_equal(music[:90*music_sr], original[:90*original_sr])
    assert np.abs(music).max() < 1
    write_json(AUDIO / "checks.json", {"allNarrationsPresent": True, "voice": data["voice"],
        "noClippedSamples": True, "noTempoOrPitchChange": True, "nominalSlotExcess": excess,
        "musicFirst90SecondsPCMIdentical": True, "musicDuration": 120,
        "musicPeak": float(np.abs(music).max()),
        "wordAlignmentMinimumMatch": min(s.get("alignmentMatch", 0) for s in data["scenes"]),
        "note": "Any nominal slot excess must be resolved by extending the scene, never clipping narration."})
    print(json.dumps(excess, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--align", action="store_true")
    parser.add_argument("--assets", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    VO.mkdir(parents=True, exist_ok=True)
    AUDIO.mkdir(parents=True, exist_ok=True)
    if args.align:
        align()
    elif args.assets:
        assets()
    elif args.check:
        check()
    else:
        synthesize()
