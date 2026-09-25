#!/usr/bin/env python3
"""밝은 칩튠 BGM 루프 합성 -> public/bgm.wav

구성: 132BPM, 8마디(4/4), C-G-Am-F x2, C메이저 펜타토닉 리드
레이어: 스퀘어 리드 + 바운스 베이스 + 킥/스네어/햇
루프가 끊기지 않게 마디 경계에 정확히 맞추고 양 끝 12ms 페이드.
재실행해도 같은 결과가 나오도록 난수 시드 고정.
"""
import os
import wave

import numpy as np

SR = 44100
BPM = 132
BEAT = 60.0 / BPM
N_BARS = 8
TOTAL_BEATS = N_BARS * 4
TOTAL = int(TOTAL_BEATS * BEAT * SR)
rng = np.random.default_rng(7)


def midi(m):
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


def lead_tone(freq, dur):
    n = max(1, int(dur * SR))
    t = np.arange(n) / SR
    s = np.zeros(n)
    for k in (1, 3, 5, 7):
        s += np.sin(2 * np.pi * freq * k * t) / (k * k)
    s *= 1.4
    a = min(int(0.005 * SR), n // 4)
    r = min(int(0.08 * SR), n // 2)
    e = np.ones(n)
    if a:
        e[:a] = np.linspace(0, 1, a)
    e[-r:] *= np.linspace(1, 0, r) ** 1.5
    e *= np.exp(-np.arange(n) / (SR * max(dur, 0.05) * 1.1)) * 0.35 + 0.65
    return s * e


def bass_tone(freq, dur):
    n = max(1, int(dur * SR))
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * 2 * freq * t)
    a = min(int(0.006 * SR), n // 4)
    r = min(int(0.05 * SR), n // 2)
    e = np.ones(n)
    if a:
        e[:a] = np.linspace(0, 1, a)
    e[-r:] *= np.linspace(1, 0, r)
    return s * e * 0.9


def kick():
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    f = 130 * np.exp(-t * 30) + 38
    phase = np.cumsum(f) / SR
    return np.sin(2 * np.pi * phase) * np.exp(-t * 14)


def snare():
    n = int(0.14 * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    tone = np.sin(2 * np.pi * 190 * t) * 0.4
    return (noise * 0.6 + tone) * np.exp(-t * 28) * 0.7


def hat():
    n = int(0.05 * SR)
    noise = rng.standard_normal(n)
    hp = np.diff(noise, prepend=noise[0])
    t = np.arange(n) / SR
    return hp * np.exp(-t * 90) * 0.5


def place(buf, beat, dur_beats, sig, vol):
    start = int(beat * BEAT * SR)
    end = min(len(buf), start + len(sig))
    if end > start:
        buf[start:end] += sig[: end - start] * vol


mix = np.zeros(TOTAL)

# 리드 멜로디: (midi, 박자오프셋, 길이) x 8마디
MELODY = [
    [(76, 0, .5), (79, .5, .5), (84, 1, 1), (79, 2, .5), (76, 2.5, .5), (74, 3, 1)],
    [(74, 0, .5), (76, .5, .5), (79, 1, 1), (81, 2, .5), (79, 2.5, .5), (76, 3, 1)],
    [(76, 0, 1), (81, 1, 1), (79, 2, .5), (76, 2.5, .5), (72, 3, 1)],
    [(69, 0, .5), (72, .5, .5), (77, 1, 1.5), (76, 2.5, .5), (74, 3, .5), (72, 3.5, .5)],
    [(76, 0, .5), (79, .5, .5), (81, 1, .5), (79, 1.5, .5), (76, 2, 1), (74, 3, 1)],
    [(74, 0, .5), (79, .5, .5), (83, 1, 1), (81, 2, 1), (79, 3, 1)],
    [(81, 0, 1), (79, 1, .5), (76, 1.5, .5), (74, 2, 1), (76, 3, 1)],
    [(77, 0, 1.5), (76, 1.5, .5), (74, 2, .5), (72, 2.5, 1.5)],
]
for bar, notes in enumerate(MELODY):
    for m, off, d in notes:
        place(mix, bar * 4 + off, d, lead_tone(midi(m), d * BEAT), 0.50)

# 베이스: 루트-옥타브 바운스 (C2-G2-A2-F2) x2
ROOTS = [36, 43, 45, 41, 36, 43, 45, 41]
for bar, root in enumerate(ROOTS):
    steps = [0, 12, 0, 12, 0, 12, 7, 12]
    for i, iv in enumerate(steps):
        b = bar * 4 + i * 0.5
        place(mix, b, 0.5, bass_tone(midi(root + iv), 0.5 * BEAT), 0.40)

# 드럼: 킥 4온더플로어, 스네어 2·4박, 햇 오프비트
for bar in range(N_BARS):
    for q in range(4):
        place(mix, bar * 4 + q, 0.22, kick(), 0.50)
    for q in (1, 3):
        place(mix, bar * 4 + q, 0.14, snare(), 0.28)
    for i in range(4):
        place(mix, bar * 4 + i + 0.5, 0.05, hat(), 0.14)

# 마스터: 소프트 클립 + 정규화 + 루프 경계 페이드
mix = np.tanh(mix * 1.1)
peak = np.max(np.abs(mix))
mix *= 0.89 / max(peak, 1e-6)
f = int(0.012 * SR)
fade = np.ones(len(mix))
fade[:f] = np.linspace(0, 1, f) ** 2
fade[-f:] = np.linspace(1, 0, f) ** 2
mix *= fade

os.makedirs('public', exist_ok=True)
out = 'public/bgm.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())

dur = len(mix) / SR
print(f'wrote {out}  {dur:.2f}s  peak {np.max(np.abs(mix)):.2f}  {os.path.getsize(out)/1024:.0f}KB')
