# Tổng hợp nhạc nền gốc (không bản quyền): đàn tranh ngũ cung + pad + bass + bộ gõ nhẹ.
# Dùng: python video/make_music.py <seconds>  -> video/remotion/public/music.wav
import sys
import wave
import pathlib

import numpy as np

SR = 44100
LENGTH = float(sys.argv[1]) if len(sys.argv) > 1 else 100.0
BPM = 84
BEAT = 60 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(7)
N = int(SR * (LENGTH + 4))
L = np.zeros(N)
R = np.zeros(N)


def hz(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def add(sig: np.ndarray, t: float, pan: float = 0.0, gain: float = 1.0) -> None:
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    L[i : i + len(sig)] += sig * np.cos((pan + 1) * np.pi / 4)
    R[i : i + len(sig)] += sig * np.sin((pan + 1) * np.pi / 4)


def pluck(midi: float, dur: float, bend: float = 0.0) -> np.ndarray:
    # Karplus-Strong: tiếng gảy dây gần với đàn tranh; `bend` = luyến láy (nửa cung) ở cuối nốt.
    f = hz(midi)
    n = int(dur * SR)
    period = int(SR / f)
    buf = rng.uniform(-1, 1, period)
    out = np.empty(n)
    for k in range(n):
        out[k] = buf[k % period]
        nxt = (k + 1) % period
        buf[k % period] = 0.4985 * (buf[k % period] + buf[nxt])
    if bend:
        t = np.arange(n) / SR
        ramp = np.clip((t - dur * 0.35) / (dur * 0.3), 0, 1)
        vib = 0.12 * np.sin(2 * np.pi * 5.5 * t) * ramp
        ratio = 2 ** ((bend * ramp + vib) / 12)
        pos = np.cumsum(ratio)
        pos = pos[pos < n - 1]
        out = np.interp(pos, np.arange(n), out)
    env = np.exp(-np.arange(len(out)) / (SR * dur * 0.45))
    return out * env


def pad(midis: list[int], dur: float) -> np.ndarray:
    t = np.arange(int(dur * SR)) / SR
    sig = np.zeros_like(t)
    for m in midis:
        for det in (-0.07, 0.07):
            f = hz(m + det)
            sig += np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    env = np.minimum(1, t / 1.2) * np.minimum(1, (dur - t) / 1.2)
    return sig * env / (len(midis) * 2)


def bass(midi: int, dur: float) -> np.ndarray:
    t = np.arange(int(dur * SR)) / SR
    return np.sin(2 * np.pi * hz(midi) * t) * np.exp(-t / (dur * 0.6)) * np.minimum(1, t / 0.01)


def kick() -> np.ndarray:
    t = np.arange(int(0.35 * SR)) / SR
    f = 110 * np.exp(-t * 18) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def shaker() -> np.ndarray:
    n = int(0.09 * SR)
    noise = rng.uniform(-1, 1, n)
    noise = np.diff(noise, prepend=0)  # lọc thông cao đơn giản
    return noise * np.exp(-np.arange(n) / (SR * 0.018))


# Giọng Rê ngũ cung: D E F# A B. Vòng hợp âm: D – Bm – G – A (mỗi hợp âm 1 ô nhịp).
SCALE = [62, 64, 66, 69, 71, 74, 76, 78, 81]
CHORDS = [([50, 57, 62, 66], 38), ([47, 54, 59, 62], 35), ([43, 50, 55, 59], 31), ([45, 52, 57, 61], 33)]
INTRO_BARS = 3  # chỉ có pad + đàn tranh, chưa có bộ gõ

bars = int(LENGTH / BAR)
for b in range(bars + 1):
    t0 = b * BAR
    last = b == bars
    chord, root = CHORDS[b % 4] if not last else CHORDS[0]
    add(pad(chord, BAR + 1.5 if not last else 4.0), t0, gain=0.10)
    add(bass(root, BAR * 0.95 if not last else 3.5), t0, gain=0.22)
    if last:
        # Kết: một chuỗi gảy rải xuống về chủ âm.
        for k, m in enumerate([81, 78, 74, 69, 66, 62]):
            add(pluck(m, 3.5), t0 + k * BEAT / 2, pan=0.3 - k * 0.1, gain=0.33)
        break
    # Giai điệu đàn tranh: nốt móc đơn, ưu tiên nốt trong hợp âm, thỉnh thoảng nghỉ / luyến.
    tones = [m for m in SCALE if (m % 12) in {c % 12 for c in chord}] or SCALE
    for step in range(8):
        if rng.random() < (0.28 if step % 2 else 0.12):
            continue
        pool = tones if step % 2 == 0 else SCALE
        m = int(rng.choice(pool))
        long = step in (3, 7) and rng.random() < 0.5
        add(
            pluck(m, 1.8 if long else 1.1, bend=(2 if long and rng.random() < 0.6 else 0)),
            t0 + step * BEAT / 2,
            pan=float(rng.uniform(-0.5, 0.5)),
            gain=0.30 if step % 2 == 0 else 0.22,
        )
    if b >= INTRO_BARS:
        for beat in range(4):
            if beat in (0, 2):
                add(kick(), t0 + beat * BEAT, gain=0.32)
            for half in range(2):
                add(shaker(), t0 + beat * BEAT + half * BEAT / 2, pan=0.35, gain=0.05 if half else 0.03)

# Reverb: chập với đáp ứng xung nhiễu tắt dần.
ir_len = int(2.2 * SR)
ir = rng.uniform(-1, 1, ir_len) * np.exp(-np.arange(ir_len) / (SR * 0.45))
ir /= np.sqrt(np.sum(ir**2))


def reverb(x: np.ndarray) -> np.ndarray:
    size = 1 << int(np.ceil(np.log2(len(x) + ir_len)))
    wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return 0.78 * x + 0.32 * wet


L, R = reverb(L), reverb(R)
end = int(LENGTH * SR)
L, R = L[:end], R[:end]
fade = np.minimum(1, np.arange(end) / (SR * 1.5)) * np.minimum(1, (end - np.arange(end)) / (SR * 2.5))
stereo = np.stack([L * fade, R * fade], axis=1)
stereo *= 0.7 / np.max(np.abs(stereo))  # đỉnh ≈ -3 dBFS
pcm = (stereo * 32767).astype("<i2")

out = pathlib.Path("video/remotion/public/music.wav")
with wave.open(str(out), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"{out} {LENGTH:.1f}s")
