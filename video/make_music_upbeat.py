"""58-second original instrumental: 116 BPM plucked strings, melody and light drums."""
from functools import lru_cache
from pathlib import Path
import json
import subprocess
import wave

import numpy as np

SR = 48000
LENGTH = 58
BPM = 116
BEAT = 60 / BPM
BAR = 4 * BEAT
N = LENGTH * SR
rng = np.random.default_rng(116)
stereo = np.zeros((N, 2))
out = Path(__file__).parent / "remotion/public/silent58/soundtrack-upbeat"


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def add(sig, time, pan=0, gain=1):
    start = round(time * SR)
    if start >= N:
        return
    sig = sig[:N - start] * gain
    stereo[start:start + len(sig), 0] += sig * np.cos((pan + 1) * np.pi / 4)
    stereo[start:start + len(sig), 1] += sig * np.sin((pan + 1) * np.pi / 4)


@lru_cache(maxsize=None)
def pluck(midi, duration=0.7):
    t = np.arange(round(duration * SR)) / SR
    sig = np.zeros_like(t)
    for harmonic, amplitude in enumerate((1, .52, .25, .13, .065, .035), 1):
        sig += amplitude * np.sin(2 * np.pi * hz(midi) * harmonic * t) * np.exp(-t * (5 + harmonic * 2))
    return sig * np.minimum(1, t / .003) * np.minimum(1, (duration - t) / .025)


@lru_cache(maxsize=None)
def bass(midi):
    t = np.arange(round(BEAT * .85 * SR)) / SR
    sig = np.sin(2 * np.pi * hz(midi) * t) + .22 * np.sin(4 * np.pi * hz(midi) * t)
    return sig * np.minimum(1, t / .008) * np.exp(-t * 6) * np.minimum(1, (t[-1] - t) / .03)


def kick():
    t = np.arange(round(.3 * SR)) / SR
    frequency = 100 * np.exp(-t * 35) + 48
    return np.sin(2 * np.pi * np.cumsum(frequency) / SR) * np.exp(-t * 14)


def shaker():
    t = np.arange(round(.09 * SR)) / SR
    noise = np.diff(rng.uniform(-1, 1, len(t)), prepend=0)
    return noise * np.exp(-t / .016) * np.minimum(1, t / .001)


def clap():
    t = np.arange(round(.2 * SR)) / SR
    noise = np.diff(rng.uniform(-1, 1, len(t)), prepend=0)
    envelope = sum(np.where(t >= delay, np.exp(-np.maximum(0, t - delay) / .012), 0)
                   for delay in (0, .012, .024))
    envelope += .25 * np.exp(-t / .05)
    return noise * envelope


# D major, four-bar melodic phrases repeated with a quieter middle section.
chords = [(50, 57, 62, 66), (45, 57, 61, 64), (47, 54, 59, 62), (43, 55, 59, 62)]
roots = [38, 33, 35, 31]
melody = [
    [(0, 74), (1, 78), (2, 81), (3, 78), (4, 76), (6, 74), (7, 76)],
    [(0, 76), (1, 73), (2, 76), (3, 81), (4, 78), (6, 76)],
    [(0, 78), (1, 74), (2, 71), (3, 74), (4, 78), (5, 81), (6, 78)],
    [(0, 79), (2, 78), (3, 76), (4, 74), (6, 71), (7, 73)],
]
drum = kick()
for bar in range(27):
    start = bar * BAR
    chord = chords[bar % 4]
    root = roots[bar % 4]
    for step, velocity in [(0, .85), (1, .55), (3, .75), (4, .65), (5, .5), (7, .75)]:
        for string, note in enumerate(chord):
            add(pluck(note), start + step * BEAT / 2 + string * .007,
                pan=-.4 + string * .16, gain=.13 * velocity)
    for beat, note in enumerate((root, root + 12, root + 7, root + 12)):
        add(bass(note), start + beat * BEAT, gain=.21 if beat % 2 == 0 else .15)
    for beat in (0, 2):
        add(drum, start + beat * BEAT, gain=.26)
    if bar >= 4:
        for beat in (1, 3):
            add(clap(), start + beat * BEAT, pan=.08, gain=.063)
    for step in range(8):
        add(shaker(), start + step * BEAT / 2 + (step % 2) * .012,
            pan=.42 if step % 2 else -.25, gain=.038 if step % 2 else .024)
    if bar not in range(8, 12):
        for step, note in melody[bar % 4]:
            time = start + step * BEAT / 2
            add(pluck(note, 1.1), time, pan=.18, gain=.21)
            add(pluck(note, 1.1), time + BEAT * .75, pan=-.5, gain=.035)
    elif bar % 2 == 0:
        for step, note in [(0, 81), (3, 78), (6, 74)]:
            add(pluck(note, 1.1), start + step * BEAT / 2, pan=.18, gain=.10)
    if bar in (7, 15, 23):
        for step in range(4):
            add(clap(), start + (3 + step / 4) * BEAT, pan=.12, gain=.025 + step * .004)

# Resolve on the tonic at 55.86 seconds; let the last chord ring into the fade.
ending = 27 * BAR
for string, note in enumerate((38, 50, 57, 62, 66, 74)):
    add(pluck(note, 2.1), ending + string * .015, pan=-.25 + string * .1, gain=.27)
add(drum, ending, gain=.24)
fade_in = np.minimum(1, np.arange(N) / (SR * .012))
fade_out = np.minimum(1, (N - 1 - np.arange(N)) / (SR * .65))
stereo *= (fade_in * fade_out)[:, None]
assert stereo.shape == (N, 2) and np.isfinite(stereo).all()
assert np.sqrt(np.mean(stereo ** 2)) > .01
stereo *= .68 / np.max(np.abs(stereo))
assert np.max(np.abs(stereo)) < .69
out.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(out.with_suffix(".wav")), "wb") as audio:
    audio.setnchannels(2)
    audio.setsampwidth(2)
    audio.setframerate(SR)
    audio.writeframes((stereo * 32767).astype("<i2").tobytes())

# Two-pass loudness normalization also limits intersample peaks after AAC encoding.
measure = subprocess.run([
    "ffmpeg", "-hide_banner", "-i", str(out.with_suffix(".wav")),
    "-af", "loudnorm=I=-17:TP=-3:LRA=8:print_format=json", "-f", "null", "-"
], capture_output=True, text=True, check=True)
stats, _ = json.JSONDecoder().raw_decode(measure.stderr[measure.stderr.rfind("{"):])
normalization = (f"loudnorm=I=-17:TP=-3:LRA=8:measured_I={stats['input_i']}:"
                 f"measured_TP={stats['input_tp']}:measured_LRA={stats['input_lra']}:"
                 f"measured_thresh={stats['input_thresh']}:offset={stats['target_offset']}:linear=true")
subprocess.run([
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(out.with_suffix(".wav")),
    "-af", normalization, "-c:a", "aac", "-b:a", "192k", "-ar", str(SR),
    "-movflags", "+faststart", str(out.with_suffix(".m4a"))
], check=True)
decoded = subprocess.run([
    "ffmpeg", "-v", "error", "-i", str(out.with_suffix(".m4a")),
    "-f", "f32le", "-acodec", "pcm_f32le", "-"
], capture_output=True, check=True)
samples = np.frombuffer(decoded.stdout, dtype="<f4").reshape(-1, 2)
assert abs(len(samples) / SR - LENGTH) < .03
assert np.isfinite(samples).all() and np.max(np.abs(samples)) < .9
assert np.sqrt(np.mean(samples[:SR] ** 2)) > .01
check = subprocess.run([
    "ffmpeg", "-hide_banner", "-nostats", "-i", str(out.with_suffix(".m4a")),
    "-af", "loudnorm=I=-17:TP=-3:LRA=8:print_format=json", "-f", "null", "-"
], capture_output=True, text=True, check=True)
stats, _ = json.JSONDecoder().raw_decode(check.stderr[check.stderr.rfind("{"):])
assert -18 < float(stats["input_i"]) < -16
assert float(stats["input_tp"]) < -2.5
receipt = {
    "file": str(out.with_suffix(".m4a")), "duration_seconds": LENGTH,
    "bpm": BPM, "sample_rate": SR, "channels": 2,
    "integrated_lufs": float(stats["input_i"]), "true_peak_dbtp": float(stats["input_tp"]),
    "loudness_range_lu": float(stats["input_lra"]),
    "sample_peak_dbfs": float(20 * np.log10(np.max(np.abs(samples)))),
    "checks": "duration, finite samples, nonempty opening, no clipping, stereo, loudness",
}
out.with_name("soundtrack-upbeat-checks.json").write_text(json.dumps(receipt, indent=2), encoding="utf-8")
print(json.dumps(receipt, indent=2))
