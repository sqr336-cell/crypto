#!/usr/bin/env python3
"""
Generates BEATLINK demo assets: procedural audio snippets (no samples, no
copyrighted material, no vocals) and abstract cover art for the fictional
demo profiles. Output:

  mobile/assets/demo/audio/<id>.m4a
  mobile/assets/demo/images/<profile>-cover.jpg / -avatar.jpg
  mobile/src/data/demo/assets.generated.ts   (requires + waveform peaks + durations)

Usage: python3 scripts/generate_demo_assets.py   (needs numpy, Pillow, ffmpeg)
"""
import json
import math
import os
import subprocess
import tempfile
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO_DIR = os.path.join(ROOT, "mobile/assets/demo/audio")
IMG_DIR = os.path.join(ROOT, "mobile/assets/demo/images")
TS_OUT = os.path.join(ROOT, "mobile/src/data/demo/assets.generated.ts")
FONT = os.path.join(ROOT, "mobile/node_modules/@expo-google-fonts/syne/800ExtraBold/Syne_800ExtraBold.ttf")

SR = 44100
SECONDS = 20.0
rng = np.random.default_rng(7)

# ---------------------------------------------------------------- synthesis

def t_axis(dur):
    return np.arange(int(dur * SR)) / SR

def env(n, attack=0.005, decay=0.2, curve=1.0):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    d = np.exp(-np.maximum(t - attack, 0) / max(decay, 1e-4)) ** curve
    return a * d

def onepole_lp(x, cutoff):
    a = math.exp(-2 * math.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    b = 1 - a
    for i in range(len(x)):  # fine for short notes
        acc = b * x[i] + a * acc
        y[i] = acc
    return y

def lp_fft(x, cutoff, slope=4):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cutoff) ** slope)
    return np.fft.irfft(X, len(x))

def hp_fft(x, cutoff, slope=4):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 - 1 / (1 + (f / cutoff) ** slope)
    return np.fft.irfft(X, len(x))

def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)

def kick(dur=0.45, f0=150, f1=45, punch=1.0):
    t = t_axis(dur)
    f = f1 + (f0 - f1) * np.exp(-t / 0.04)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env(len(t), 0.001, 0.18) * punch + 0.3 * np.sin(ph * 2) * env(len(t), 0.001, 0.02)

def eight08(note, dur=0.9, glide_from=None, drive=1.8):
    t = t_axis(dur)
    f = np.full(len(t), midi(note))
    if glide_from is not None:
        f = midi(note) + (midi(glide_from) - midi(note)) * np.exp(-t / 0.06)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * env(len(t), 0.003, dur * 0.6)
    return np.tanh(x * drive) / np.tanh(drive)

def snare(dur=0.22, tone=190, bright=1.0):
    n = int(dur * SR)
    noise = hp_fft(rng.standard_normal(n), 1200 * bright) * env(n, 0.001, 0.06)
    body = np.sin(2 * np.pi * tone * t_axis(dur)) * env(n, 0.001, 0.05)
    return 0.6 * noise + 0.5 * body

def clap(dur=0.25):
    n = int(dur * SR)
    x = np.zeros(n)
    for off in (0, 0.011, 0.023):
        i = int(off * SR)
        seg = hp_fft(rng.standard_normal(n - i), 900) * env(n - i, 0.001, 0.045)
        x[i:] += seg
    return x * 0.5

def hat(dur=0.06, open_=False):
    d = 0.25 if open_ else dur
    n = int(d * SR)
    return hp_fft(rng.standard_normal(n), 7000) * env(n, 0.001, 0.09 if open_ else 0.018) * 0.5

def rim(dur=0.08):
    n = int(dur * SR)
    return (np.sin(2 * np.pi * 1700 * t_axis(dur)) + 0.5 * hp_fft(rng.standard_normal(n), 3000)) * env(n, 0.0005, 0.012) * 0.6

def saw(freq, n, detune=0.0):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for d in (-detune, 0, detune):
        ph = (t * freq * (1 + d)) % 1.0
        out += 2 * ph - 1
    return out / 3

def pad_chord(notes, dur, cutoff=1800, attack=0.6):
    n = int(dur * SR)
    x = sum(saw(midi(m), n, 0.004) for m in notes) / len(notes)
    x = lp_fft(x, cutoff)
    t = np.arange(n) / SR
    a = np.clip(t / attack, 0, 1)
    r = np.clip((dur - t) / 0.4, 0, 1)
    return x * a * r

def epiano(note, dur, bright=1.0):
    t = t_axis(dur)
    f = midi(note)
    mod = np.sin(2 * np.pi * f * 14 * t) * env(len(t), 0.001, 0.08) * 1.2 * bright
    car = np.sin(2 * np.pi * f * t + mod)
    tine = 0.15 * np.sin(2 * np.pi * f * 4 * t) * env(len(t), 0.001, 0.15)
    return (car + tine) * env(len(t), 0.002, 0.9)

def pluck(note, dur, damp=0.996):
    n = int(dur * SR)
    period = int(SR / midi(note))
    buf = rng.uniform(-1, 1, period)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % period]
        buf[i % period] = damp * 0.5 * (buf[i % period] + buf[(i + 1) % period])
    return out

def lead(notes, step, total_n, vib=5.5, glide=0.04, tone="tri"):
    """Monophonic topline: list of (start_step, length_steps, midi)."""
    freq = np.zeros(total_n)
    amp = np.zeros(total_n)
    for start, length, m in notes:
        i0, i1 = int(start * step * SR), min(total_n, int((start + length) * step * SR))
        k = i1 - i0
        if k <= 0:
            continue
        freq[i0:i1] = midi(m)
        a = np.ones(k)
        a[: min(k, 600)] = np.linspace(0, 1, min(k, 600))
        a[-min(k, 1500):] *= np.linspace(1, 0, min(k, 1500))
        amp[i0:i1] = a
    # portamento
    last = 0.0
    sm = np.empty_like(freq)
    coef = math.exp(-1 / (glide * SR))
    for i in range(total_n):
        target = freq[i] if freq[i] > 0 else last
        last = target if last == 0 else coef * last + (1 - coef) * target
        sm[i] = last
    t = np.arange(total_n) / SR
    sm = sm * (1 + 0.006 * np.sin(2 * np.pi * vib * t))
    ph = 2 * np.pi * np.cumsum(sm) / SR
    if tone == "tri":
        x = 2 / np.pi * np.arcsin(np.sin(ph))
    else:
        x = np.sin(ph) + 0.25 * np.sin(2 * ph)
    return lp_fft(x * amp, 3200)

def log_drum(note, dur=0.5):
    t = t_axis(dur)
    f = midi(note) * (1 + 0.6 * np.exp(-t / 0.03))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(2.5 * np.sin(ph) * env(len(t), 0.002, 0.22)) * 0.8

def crackle(n, density=18):
    x = np.zeros(n)
    idx = rng.integers(0, n, int(density * n / SR))
    x[idx] = rng.uniform(-1, 1, len(idx))
    return hp_fft(x, 2000) * 0.25 + hp_fft(rng.standard_normal(n), 4000) * 0.004

def reverb(x, seconds=1.6, mix=0.25, tone=5000):
    n = int(seconds * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR / (seconds / 5))
    ir = lp_fft(ir, tone)
    ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return (1 - mix) * x + mix * wet

# ---------------------------------------------------------------- sequencing

class Track:
    def __init__(self, bpm, seconds=SECONDS):
        self.bpm = bpm
        self.step = 60 / bpm / 4  # 16th note
        self.n = int(seconds * SR)
        self.bus = {}

    def add(self, bus, sound, step_pos, gain=1.0, swing=0.0):
        pos = step_pos * self.step
        if swing and int(step_pos) % 2 == 1:
            pos += swing * self.step
        i = int(pos * SR)
        if i >= self.n:
            return
        buf = self.bus.setdefault(bus, np.zeros(self.n))
        k = min(len(sound), self.n - i)
        buf[i : i + k] += sound[:k] * gain

    def steps(self):
        return int(self.n / SR / self.step)

    def pattern(self, bus, sound_fn, pattern, gain=1.0, swing=0.0, every=16):
        for s in range(self.steps()):
            ch = pattern[s % len(pattern)]
            if ch != ".":
                g = gain * (1.0 if ch in "xX" else 0.6)
                self.add(bus, sound_fn() if callable(sound_fn) else sound_fn, s, g, swing)

    def mix(self, levels, rev=None):
        out = np.zeros(self.n)
        for bus, buf in self.bus.items():
            b = buf * levels.get(bus, 1.0)
            if rev and bus in rev:
                b = reverb(b, *rev[bus])
            out += b
        # fade in/out and master
        fade = int(0.08 * SR)
        out[:fade] *= np.linspace(0, 1, fade)
        out[-int(1.2 * SR):] *= np.linspace(1, 0, int(1.2 * SR))
        out = np.tanh(out * 1.3)
        return out / (np.max(np.abs(out)) + 1e-9) * 0.89

def chords_over(tr, bus, progression, bars_per_chord, fn, gain=1.0):
    bar = 16
    total_bars = tr.steps() // bar + 1
    for b in range(0, total_bars, bars_per_chord):
        notes = progression[(b // bars_per_chord) % len(progression)]
        fn(tr, bus, notes, b * bar, bars_per_chord * bar, gain)

def place_pad(tr, bus, notes, start, length, gain):
    tr.add(bus, pad_chord(notes, length * tr.step + 0.3), start, gain)

def place_keys(tr, bus, notes, start, length, gain, rhythm=(0, 6, 10)):
    for r in rhythm:
        for m in notes:
            tr.add(bus, epiano(m, 1.4), start + r, gain / len(notes) * 1.6)

# ---------------------------------------------------------------- tracks

def alt_rnb_velours():
    tr = Track(92)
    tr.pattern("kick", lambda: kick(0.5, 120, 42), "x.........x..x..x.......x.......")
    tr.pattern("snare", lambda: clap(), "....x.......x...")
    tr.pattern("hat", lambda: hat(), "x.x.x.x.x.xxx.x.", gain=0.5, swing=0.25)
    prog = [[62, 65, 69, 72], [58, 62, 65, 69], [60, 64, 67, 70], [57, 61, 64, 67]]
    chords_over(tr, "keys", prog, 1, place_keys, 0.55)
    chords_over(tr, "pad", prog, 1, place_pad, 0.25)
    bass = [38, 34, 36, 33]
    for b in range(tr.steps() // 16 + 1):
        tr.add("bass", eight08(bass[b % 4], 1.3), b * 16, 0.8)
        tr.add("bass", eight08(bass[b % 4] + 12, 0.4), b * 16 + 10, 0.3)
    return tr.mix({"kick": 0.9, "snare": 0.5, "hat": 0.35, "keys": 0.6, "pad": 0.5, "bass": 0.8},
                  rev={"keys": (2.2, 0.35, 4000), "snare": (1.2, 0.2, 6000)})

def alt_rnb_minuit():
    tr = Track(86)
    tr.pattern("kick", lambda: kick(0.5, 110, 40), "x......x..x.....x.........x.....")
    tr.pattern("snare", lambda: snare(0.25, 170, 0.7), "....x.......x...")
    tr.pattern("hat", lambda: rim(), "..x...x...x..x..", gain=0.6)
    prog = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62]]
    chords_over(tr, "pad", prog, 1, place_pad, 0.5)
    for b in range(tr.steps() // 16 + 1):
        tr.add("bass", eight08([33, 29, 31, 28][b % 4], 1.6), b * 16, 0.8)
    mel = [(0, 3, 76), (4, 2, 74), (6, 6, 72), (16, 3, 76), (20, 2, 77), (22, 6, 76), (32, 4, 74), (36, 4, 72), (40, 8, 69), (48, 3, 72), (52, 3, 71), (56, 8, 67)]
    full = [(s + 64 * k, l, m) for k in range(4) for (s, l, m) in mel]
    tr.add("lead", lead(full, tr.step, tr.n, tone="sine"), 0, 0.22)
    return tr.mix({"kick": 0.9, "snare": 0.45, "hat": 0.4, "pad": 0.45, "bass": 0.8, "lead": 0.6},
                  rev={"pad": (2.5, 0.4, 3500), "lead": (2.0, 0.4, 5000)})

def topline(bpm, prog, mel, name_tone="tri", root_bass=None):
    tr = Track(bpm)
    tr.pattern("kick", lambda: kick(0.4, 130, 45), "x.......x.......")
    tr.pattern("snare", lambda: snare(0.2, 200, 0.8), "....x.......x...", gain=0.6)
    tr.pattern("hat", lambda: hat(), "x.x.x.x.x.x.x.x.", gain=0.35)
    chords_over(tr, "pad", prog, 1, place_pad, 0.45)
    if root_bass:
        for b in range(tr.steps() // 16 + 1):
            tr.add("bass", eight08(root_bass[b % len(root_bass)], 1.0, drive=1.2), b * 16, 0.6)
    full = [(s + 64 * k, l, m) for k in range(6) for (s, l, m) in mel]
    tr.add("lead", lead(full, tr.step, tr.n, tone=name_tone), 0, 0.3)
    return tr.mix({"kick": 0.8, "snare": 0.4, "hat": 0.3, "pad": 0.5, "bass": 0.6, "lead": 0.8},
                  rev={"lead": (1.8, 0.3, 6000), "pad": (2.2, 0.35, 4000)})

def drill():
    tr = Track(142)
    tr.pattern("kick", lambda: kick(0.35, 160, 50), "x.........x.....")
    tr.pattern("snare", lambda: snare(0.2, 210, 1.0), "........x.......", gain=0.9)
    tr.pattern("hat", lambda: hat(), "x..x..x.x.x..x.xx..x..x.x..x.x..", gain=0.5)
    slides = [(0, 37, None), (6, 37, None), (10, 40, 37), (16, 35, None), (22, 35, None), (26, 32, 35)]
    for bar2 in range(tr.steps() // 32 + 1):
        for s, note, g in slides:
            tr.add("bass", eight08(note, 0.7, glide_from=g, drive=2.4), bar2 * 32 + s, 0.85)
    prog = [[61, 64, 68], [59, 63, 66], [57, 61, 64], [56, 59, 63]]
    def bells(tr_, bus, notes, start, length, gain):
        for r in (0, 3, 6, 10, 12):
            tr_.add(bus, epiano(notes[r % 3] + 12, 0.7, 1.6), start + r, gain)
    chords_over(tr, "bells", prog, 2, bells, 0.25)
    return tr.mix({"kick": 0.8, "snare": 0.6, "hat": 0.35, "bass": 0.9, "bells": 0.55},
                  rev={"bells": (1.6, 0.35, 6000)})

def afro_lagune():
    tr = Track(112)
    tr.pattern("kick", lambda: kick(0.4, 120, 48), "x.......x.......")
    tr.pattern("snare", lambda: rim(), "...x..x....x..x.", gain=0.7)
    tr.pattern("shaker", lambda: hat(0.05), "xxxxxxxxxxxxxxxx", gain=0.25, swing=0.18)
    tr.pattern("clap", lambda: clap(), "........x.......", gain=0.5)
    logs = [(0, 41), (3, 41), (6, 44), (10, 39), (14, 41)]
    for b in range(tr.steps() // 16 + 1):
        for s, m in logs:
            tr.add("log", log_drum(m), b * 16 + s, 0.7)
    prog = [[65, 69, 72, 76], [62, 65, 69, 72], [63, 67, 70, 74], [60, 64, 67, 70]]
    chords_over(tr, "keys", prog, 2, lambda t_, b_, n_, s_, l_, g_: place_keys(t_, b_, n_, s_, l_, g_, (0, 3, 6, 11, 14)), 0.4)
    return tr.mix({"kick": 0.8, "snare": 0.5, "shaker": 0.4, "clap": 0.5, "log": 0.8, "keys": 0.5},
                  rev={"keys": (1.8, 0.3, 5000), "clap": (1.0, 0.2, 7000)})

def rhodes_3am():
    tr = Track(78)
    tr.pattern("kick", lambda: kick(0.45, 100, 42, 0.8), "x......x..x.....")
    tr.pattern("snare", lambda: snare(0.25, 160, 0.6), "....x.......x...", gain=0.4)
    tr.pattern("hat", lambda: hat(), "x.x.x.x.x.x.x.x.", gain=0.25, swing=0.33)
    prog = [[62, 65, 69, 72, 76], [55, 59, 62, 65, 69], [60, 64, 67, 71, 74], [57, 60, 64, 67, 71]]
    chords_over(tr, "keys", prog, 1, lambda t_, b_, n_, s_, l_, g_: place_keys(t_, b_, n_, s_, l_, g_, (0, 7, 10)), 0.75)
    for b in range(tr.steps() // 16 + 1):
        tr.add("bass", eight08([38, 31, 36, 33][b % 4], 1.4, drive=1.1), b * 16, 0.6)
    tr.add("vinyl", crackle(tr.n), 0, 1.0)
    return tr.mix({"kick": 0.7, "snare": 0.35, "hat": 0.25, "keys": 0.8, "bass": 0.6, "vinyl": 0.5},
                  rev={"keys": (2.6, 0.4, 3500)})

def garage_fog():
    tr = Track(132)
    tr.pattern("kick", lambda: kick(0.3, 140, 50), "x.........x.....x..x......x.....")
    tr.pattern("snare", lambda: snare(0.18, 230, 1.2), "....x.......x...", gain=0.7)
    tr.pattern("hat", lambda: hat(), "..x...x...x...x.", gain=0.5, swing=0.22)
    tr.pattern("hat2", lambda: hat(open_=True), "..x...x...x...x.", gain=0.12)
    prog = [[60, 63, 67, 70], [58, 62, 65, 69], [56, 60, 63, 67], [55, 58, 62, 65]]
    def stabs(tr_, bus, notes, start, length, gain):
        for r in (0, 3, 6, 9, 14):
            tr_.add(bus, pad_chord(notes, 0.18, 2500, 0.005), start + r, gain)
    chords_over(tr, "stab", prog, 1, stabs, 0.6)
    chords_over(tr, "pad", prog, 1, place_pad, 0.25)
    for b in range(tr.steps() // 16 + 1):
        for s in (0, 7, 10):
            tr.add("bass", eight08([36, 34, 32, 31][b % 4], 0.35, drive=2.0), b * 16 + s, 0.5)
    return tr.mix({"kick": 0.8, "snare": 0.5, "hat": 0.4, "hat2": 0.3, "stab": 0.5, "pad": 0.4, "bass": 0.7},
                  rev={"stab": (2.0, 0.4, 5000), "pad": (3.0, 0.5, 3000)})

def boom_mix():
    tr = Track(90)
    tr.pattern("kick", lambda: kick(0.4, 120, 50), "x.....x...x.....x.....x.......x.")
    tr.pattern("snare", lambda: snare(0.25, 180, 0.9), "....x.......x...", gain=0.8)
    tr.pattern("hat", lambda: hat(), "x.x.x.x.x.x.x.x.", gain=0.4, swing=0.3)
    prog = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]]
    chords_over(tr, "keys", prog, 1, lambda t_, b_, n_, s_, l_, g_: place_keys(t_, b_, n_, s_, l_, g_, (0, 3, 8, 11)), 0.5)
    for b in range(tr.steps() // 16 + 1):
        tr.add("bass", eight08([33, 29, 31, 28][b % 4], 0.8, drive=1.6), b * 16, 0.7)
        tr.add("bass", eight08([33, 29, 31, 28][b % 4], 0.5, drive=1.6), b * 16 + 8, 0.5)
    return tr.mix({"kick": 1.0, "snare": 0.7, "hat": 0.4, "keys": 0.55, "bass": 0.8},
                  rev={"snare": (0.9, 0.18, 6000), "keys": (1.6, 0.3, 4500)})

def rain_tape():
    tr = Track(84)
    tr.pattern("kick", lambda: kick(0.4, 100, 45, 0.9), "x.......x.x.....")
    tr.pattern("snare", lambda: snare(0.25, 170, 0.5), "....x.......x...", gain=0.55)
    tr.pattern("hat", lambda: hat(), "x.x.x.x.x.x.x.x.", gain=0.3, swing=0.35)
    prog = [[64, 67, 71, 74], [62, 65, 69, 72], [60, 64, 67, 71], [59, 62, 66, 69]]
    chords_over(tr, "keys", prog, 1, lambda t_, b_, n_, s_, l_, g_: place_keys(t_, b_, n_, s_, l_, g_, (0, 6, 12)), 0.6)
    tr.add("vinyl", crackle(tr.n, 30), 0, 1.4)
    out = tr.mix({"kick": 0.8, "snare": 0.45, "hat": 0.3, "keys": 0.75, "vinyl": 0.7}, rev={"keys": (2.0, 0.35, 3000)})
    return lp_fft(out, 6000) * 1.0

def choir():
    tr = Track(70)
    prog = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]]
    chords_over(tr, "pad", prog, 1, lambda t_, b_, n_, s_, l_, g_: t_.add(b_, pad_chord(n_, l_ * t_.step + 0.5, 1200, 1.2), s_, g_), 0.8)
    mel = [(0, 6, 72), (8, 4, 74), (12, 4, 76), (16, 8, 74), (28, 4, 72), (32, 8, 69), (40, 8, 72), (48, 12, 71)]
    full = [(s + 64 * k, l, m) for k in range(3) for (s, l, m) in mel]
    tr.add("lead", lead(full, tr.step, tr.n, vib=5.0, glide=0.08, tone="sine"), 0, 0.3)
    tr.pattern("kick", lambda: kick(0.5, 90, 40, 0.6), "x...............")
    return tr.mix({"pad": 0.6, "lead": 0.8, "kick": 0.5}, rev={"pad": (3.5, 0.5, 2500), "lead": (3.0, 0.45, 4000)})

def glass_shards():
    tr = Track(150)
    tr.pattern("kick", lambda: kick(0.25, 200, 55), "x...x...x...x.x.")
    tr.pattern("snare", lambda: clap(), "....x.......x...", gain=0.6)
    tr.pattern("hat", lambda: hat(0.03), "xxxxxxxxxxxxxxxx", gain=0.3)
    arp = [72, 76, 79, 84, 79, 76, 74, 79]
    for s in range(tr.steps()):
        root = [0, 0, -3, -5][(s // 32) % 4]
        tr.add("arp", pad_chord([arp[s % 8] + root + 12], 0.12, 6000, 0.002), s, 0.35)
    for b in range(tr.steps() // 16 + 1):
        tr.add("bass", eight08([36, 36, 33, 31][b % 4], 0.5, drive=3.0), b * 16, 0.6)
        tr.add("bass", eight08([36, 36, 33, 31][b % 4] + 12, 0.25, drive=3.0), b * 16 + 6, 0.4)
    return tr.mix({"kick": 0.8, "snare": 0.5, "hat": 0.3, "arp": 0.6, "bass": 0.7}, rev={"arp": (1.4, 0.3, 8000)})

def nylon_loop():
    tr = Track(96)
    pattern = [(0, 52), (2, 59), (4, 64), (6, 67), (8, 55), (10, 62), (12, 67), (14, 71)]
    prog_shift = [0, -3, -7, -5]
    for b in range(tr.steps() // 16 + 1):
        for s, m in pattern:
            tr.add("gtr", pluck(m + prog_shift[b % 4], 1.2, 0.995), b * 16 + s, 0.45)
    tr.pattern("kick", lambda: kick(0.4, 110, 45, 0.8), "x.......x..x....")
    tr.pattern("snare", lambda: rim(), "....x.......x...", gain=0.5)
    tr.pattern("hat", lambda: hat(), "..x...x...x...x.", gain=0.3)
    return tr.mix({"gtr": 0.8, "kick": 0.7, "snare": 0.5, "hat": 0.3}, rev={"gtr": (1.6, 0.3, 6000)})

TRACKS = {
    "nayla-velours": (alt_rnb_velours, dict(title="Velours", bpm=92, key="Dm", genre="alt_rnb")),
    "nayla-minuit": (alt_rnb_minuit, dict(title="Minuit 12", bpm=86, key="Am", genre="rnb")),
    "koz-lune": (lambda: topline(88, [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]],
                                 [(0, 2, 72), (2, 2, 74), (4, 4, 76), (10, 2, 74), (12, 4, 72), (16, 6, 79), (24, 4, 76), (32, 2, 74), (34, 2, 72), (36, 8, 69), (48, 4, 72), (52, 8, 71)],
                                 "tri", [36, 33, 29, 31]), dict(title="Lune (topline)", bpm=88, key="C", genre="rnb")),
    "mira-pressure": (drill, dict(title="Pressure (beat de référence)", bpm=142, key="C#m", genre="drill")),
    "sahel-lagune": (afro_lagune, dict(title="Lagune", bpm=112, key="F", genre="amapiano")),
    "theo-rhodes": (rhodes_3am, dict(title="Rhodes 3am", bpm=78, key="Dm", genre="soul")),
    "lina-neon": (lambda: topline(118, [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]],
                                  [(0, 3, 76), (4, 1, 74), (5, 3, 76), (8, 4, 79), (14, 2, 76), (16, 3, 74), (20, 4, 72), (26, 6, 69), (32, 3, 76), (36, 4, 81), (42, 6, 79), (52, 8, 76)],
                                  "sine", [33, 29, 36, 31]), dict(title="Néon (topline)", bpm=118, key="Am", genre="pop")),
    "dex-fog": (garage_fog, dict(title="2-step Fog", bpm=132, key="Cm", genre="uk_garage")),
    "ayo-mix": (boom_mix, dict(title="Mix test (avant master)", bpm=90, key="Am", genre="hiphop")),
    "kenji-rain": (rain_tape, dict(title="Rain Tape", bpm=84, key="Em", genre="lofi")),
    "saya-choir": (choir, dict(title="Chorale (esquisse)", bpm=70, key="C", genre="gospel")),
    "vex-glass": (glass_shards, dict(title="Glass Shards", bpm=150, key="C", genre="hyperpop")),
    "rico-nylon": (nylon_loop, dict(title="Nylon Loop", bpm=96, key="Em", genre="indie")),
}

def write_m4a(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        tmp = f.name
    with wave.open(tmp, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", path], check=True)
    os.unlink(tmp)

def peaks(x, bars=64):
    seg = np.array_split(np.abs(x), bars)
    rms = np.array([np.sqrt(np.mean(s ** 2)) for s in seg])
    rms = rms / (rms.max() + 1e-9)
    return [int(max(6, round(v * 100))) for v in rms]

# ---------------------------------------------------------------- covers

PALETTES = {
    "nayla": ((24, 18, 40), (150, 120, 255), (255, 214, 170)),
    "koz": ((14, 22, 30), (120, 190, 210), (240, 240, 230)),
    "mira": ((18, 14, 16), (220, 60, 70), (240, 230, 230)),
    "sahel": ((30, 20, 10), (240, 150, 60), (250, 230, 190)),
    "theo": ((16, 18, 24), (90, 110, 160), (230, 210, 170)),
    "lina": ((22, 10, 30), (255, 90, 200), (120, 230, 255)),
    "dex": ((12, 14, 16), (110, 130, 120), (210, 220, 200)),
    "ayo": ((20, 20, 20), (200, 190, 160), (255, 250, 240)),
    "kenji": ((14, 20, 26), (90, 140, 170), (200, 220, 230)),
    "saya": ((28, 20, 16), (210, 160, 110), (250, 235, 215)),
    "vex": ((10, 10, 14), (170, 255, 240), (240, 140, 255)),
    "rico": ((26, 18, 14), (200, 120, 80), (240, 220, 190)),
}

def cover(name, initial, style, size=(900, 1200)):
    base, a, b = PALETTES[name]
    w, h = size
    img = Image.new("RGB", size, base)
    layer = Image.new("RGB", size, base)
    d = ImageDraw.Draw(layer)
    r = np.random.default_rng(int.from_bytes(name.encode(), "little") % 2**32)
    if style == "blobs":
        for _ in range(5):
            cx, cy, rad = r.integers(0, w), r.integers(0, h), r.integers(180, 420)
            col = a if r.random() < 0.6 else b
            d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=col)
        layer = layer.filter(ImageFilter.GaussianBlur(140))
        img = Image.blend(img, layer, 0.85)
    elif style == "rings":
        for i in range(14, 0, -1):
            rad = i * 48
            col = tuple(int(base[k] + (a[k] - base[k]) * (i % 2) * 0.7) for k in range(3))
            d.ellipse([w // 2 - rad, int(h * 0.42) - rad, w // 2 + rad, int(h * 0.42) + rad], outline=col, width=10)
        img = Image.blend(img, layer, 0.9)
    elif style == "bars":
        n = 28
        for i in range(n):
            x0 = int(i * w / n)
            hh = int(h * (0.2 + 0.6 * abs(math.sin(i * 0.7 + r.random()))))
            d.rectangle([x0 + 6, h - hh, x0 + int(w / n) - 6, h], fill=a if i % 5 else b)
        img = Image.blend(img, layer, 0.8)
    elif style == "sun":
        d.ellipse([w * 0.18, h * 0.16, w * 0.82, h * 0.16 + w * 0.64], fill=a)
        for i in range(9):
            y = int(h * 0.36 + i * 26)
            d.rectangle([0, y, w, y + 9 + i], fill=base)
        layer = layer.filter(ImageFilter.GaussianBlur(2))
        img = Image.blend(img, layer, 0.95)
    elif style == "grid":
        for i in range(0, w, 60):
            d.line([i, 0, i, h], fill=a, width=2)
        for j in range(0, h, 60):
            d.line([0, j, w, j], fill=a, width=2)
        d.rectangle([w * 0.2, h * 0.3, w * 0.8, h * 0.6], fill=b)
        layer = layer.filter(ImageFilter.GaussianBlur(1))
        img = Image.blend(img, layer, 0.7)
    # typographic mark
    try:
        font = ImageFont.truetype(FONT, 520)
        t = Image.new("L", size, 0)
        td = ImageDraw.Draw(t)
        td.text((w * 0.08, h * 0.52), initial, font=font, fill=70)
        img = Image.composite(Image.new("RGB", size, b), img, t)
    except OSError:
        pass
    # film grain
    grain = (r.standard_normal((h, w, 1)) * 14).astype(np.int16)
    arr = np.clip(np.asarray(img).astype(np.int16) + grain, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)

PROFILES = [
    ("nayla", "N", "blobs"), ("koz", "K", "rings"), ("mira", "M", "bars"), ("sahel", "S", "sun"),
    ("theo", "T", "grid"), ("lina", "L", "blobs"), ("dex", "D", "grid"), ("ayo", "A", "bars"),
    ("kenji", "K", "rings"), ("saya", "S", "sun"), ("vex", "V", "bars"), ("rico", "R", "blobs"),
]

def main():
    os.makedirs(AUDIO_DIR, exist_ok=True)
    os.makedirs(IMG_DIR, exist_ok=True)
    meta = {}
    for tid, (fn, info) in TRACKS.items():
        print("audio", tid)
        x = fn()
        write_m4a(os.path.join(AUDIO_DIR, f"{tid}.m4a"), x)
        meta[tid] = dict(info, durationMs=int(len(x) / SR * 1000), waveform=peaks(x))
    for name, initial, style in PROFILES:
        print("image", name)
        c = cover(name, initial, style)
        c.save(os.path.join(IMG_DIR, f"{name}-cover.jpg"), quality=78, optimize=True, progressive=True)
        av = c.crop((150, 250, 750, 850)).resize((320, 320), Image.LANCZOS)
        av.save(os.path.join(IMG_DIR, f"{name}-avatar.jpg"), quality=80, optimize=True)

    lines = [
        "// Generated by scripts/generate_demo_assets.py — do not edit by hand.",
        "// Procedural demo audio (no samples, no vocals) and abstract cover art.",
        "",
        "export const DEMO_AUDIO = {",
    ]
    for tid, m in meta.items():
        lines.append(
            f"  '{tid}': {{ source: require('../../../assets/demo/audio/{tid}.m4a'), title: {json.dumps(m['title'], ensure_ascii=False)}, "
            f"bpm: {m['bpm']}, musicalKey: '{m['key']}', genre: '{m['genre']}', durationMs: {m['durationMs']}, waveform: {json.dumps(m['waveform'])} }},"
        )
    lines += ["} as const;", "", "export const DEMO_IMAGES = {"]
    for name, _, _ in PROFILES:
        lines.append(
            f"  {name}: {{ cover: require('../../../assets/demo/images/{name}-cover.jpg'), avatar: require('../../../assets/demo/images/{name}-avatar.jpg') }},"
        )
    lines += ["} as const;", ""]
    os.makedirs(os.path.dirname(TS_OUT), exist_ok=True)
    with open(TS_OUT, "w") as f:
        f.write("\n".join(lines))
    print("done")

if __name__ == "__main__":
    main()
