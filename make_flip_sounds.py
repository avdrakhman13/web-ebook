import os
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RATE = 44100


def band(noise, lo, hi):
    spec = np.fft.rfft(noise)
    f = np.fft.rfftfreq(len(noise), 1 / RATE)
    center, width = np.sqrt(lo * hi), np.log(hi / lo) / 2
    spec *= np.exp(-0.5 * ((np.log(f + 1) - np.log(center)) / width) ** 2)
    return np.fft.irfft(spec, len(noise))


def sweep(noise, lo0, lo1, hi0, hi1, frames=24):
    out = np.zeros_like(noise)
    size = len(noise) // frames
    window = np.hanning(size * 2)
    for k in range(frames * 2 - 1):
        start = int(k * size / 2)
        seg = noise[start:start + size * 2]
        if len(seg) < size * 2:
            break
        t = start / len(noise)
        piece = band(seg * window, lo0 + (lo1 - lo0) * t, hi0 + (hi1 - hi0) * t)
        out[start:start + size * 2] += piece
    return out


def flip(seed, length):
    rng = np.random.default_rng(seed)
    n = int(length * RATE)
    t = np.arange(n) / RATE
    noise = rng.standard_normal(n)

    swoosh = sweep(noise, 500, 1800, 2500, 7000)
    bell = np.sin(np.pi * np.clip(t / (length * 0.85), 0, 1)) ** 1.6
    flutter = 0.75 + 0.25 * np.sin(2 * np.pi * rng.uniform(18, 26) * t)
    sound = swoosh / np.max(np.abs(swoosh)) * bell * flutter * 0.55

    crinkle = band(rng.standard_normal(n), 2500, 9000)
    crinkle /= np.max(np.abs(crinkle))
    lift = np.exp(-t / 0.025) * 0.5
    sound += crinkle * lift

    land_at = int(length * 0.78 * RATE)
    m = n - land_at
    tau = np.arange(m) / RATE
    slap = band(rng.standard_normal(m), 120, 900)
    slap = slap / np.max(np.abs(slap)) * np.exp(-tau / 0.035) * 0.8
    tick = band(rng.standard_normal(m), 2000, 6000)
    tick = tick / np.max(np.abs(tick)) * np.exp(-tau / 0.012) * 0.35
    sound[land_at:] += slap + tick

    fade = np.minimum(1, t / 0.004) * np.minimum(1, (length - t) / 0.03)
    sound *= fade
    return sound / np.max(np.abs(sound)) * 0.8


for index, (seed, length) in enumerate([(3, 0.62), (11, 0.55), (27, 0.68)], start=1):
    data = flip(seed, length)
    with wave.open(os.path.join(ROOT, "sounds", f"flip{index}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes((data * 32767).astype(np.int16).tobytes())
print("ok")
