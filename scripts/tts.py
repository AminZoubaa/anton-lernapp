#!/usr/bin/env python3
"""
Rendert Sprach-Texte und Anlaut-LAUTE mit Piper (Open Source, offline).

  python3 scripts/tts.py --voice voices/de-kerstin-low.onnx --jobs jobs.json --out public/audio

jobs.json: [{"text": "Hallo!", "file": "sprache/abc.wav"}, {"laut": "M", "file": "laute/M.wav"}, ...]

Laute werden NICHT als Text gesprochen (das ergäbe "Em"), sondern direkt als
Phoneme an das Modell gegeben: M → "mːː" (gedehntes m), B → "bə" (kurz mit
Schwa, wie in der Anlauttabelle), A → "aːː" usw.
"""
import argparse, json, os, wave
import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig

# Anlaut-Laute als espeak-IPA-Phoneme (ː = lang). Dauerlaute gedehnt,
# Verschlusslaute kurz + leises Schwa – so sprechen es Lehrkräfte vor.
LAUTE = {
    "A": ["a", "ː", "ː"],
    "B": ["b", "ə"],
    "C": ["k", "ə"],           # C wie Clown/Computer → k
    "D": ["d", "ə"],
    "E": ["e", "ː", "ː"],
    "F": ["f", "ː", "ː"],
    "G": ["g", "ə"],
    "H": ["h", "ə"],
    "I": ["i", "ː", "ː"],
    "J": ["j", "ə"],
    "K": ["k", "ə"],
    "L": ["l", "ː", "ː"],
    "M": ["m", "ː", "ː"],
    "N": ["n", "ː", "ː"],
    "O": ["o", "ː", "ː"],
    "P": ["p", "ə"],
    "Q": ["k", "v", "ə"],      # Qu → kw
    "R": ["ʁ", "ː", "ː"],
    "S": ["s", "ː", "ː"],
    "T": ["t", "ə"],
    "U": ["u", "ː", "ː"],
    "V": ["f", "ː", "ː"],      # Vogel, Vulkan → f
    "W": ["v", "ː", "ː"],
    "X": ["k", "s", "ː"],
    "Y": ["j", "ə"],           # Yacht, Yoga → j
    "Z": ["t", "s", "ː", "ː"],
    "Ä": ["ɛ", "ː", "ː"],
    "Ö": ["ø", "ː", "ː"],
    "Ü": ["y", "ː", "ː"],
}


def write_wav(path, samples, rate):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    arr = np.asarray(samples)
    if arr.dtype.kind == "f":
        arr = (np.clip(arr, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(arr.tobytes())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", required=True)
    ap.add_argument("--jobs", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--length", type=float, default=1.15, help="Sprechtempo (>1 = langsamer)")
    a = ap.parse_args()

    voice = PiperVoice.load(a.voice)
    rate = voice.config.sample_rate
    jobs = json.load(open(a.jobs))
    speech_cfg = SynthesisConfig(length_scale=a.length)
    laut_cfg = SynthesisConfig(length_scale=2.4)
    done = 0
    for j in jobs:
        out = os.path.join(a.out, j["file"])
        if os.path.exists(out):
            continue
        if "laut" in j:
            ph = LAUTE.get(j["laut"])
            if not ph:
                continue
            ids = voice.phonemes_to_ids(ph)
            audio = voice.phoneme_ids_to_audio(ids, laut_cfg)
            # kurze Stille vorn/hinten, damit nichts abgeschnitten klingt
            pad = np.zeros(int(rate * 0.08), dtype=audio.dtype)
            write_wav(out, np.concatenate([pad, audio, pad]), rate)
        else:
            chunks = [c.audio_float_array for c in voice.synthesize(j["text"], speech_cfg)]
            write_wav(out, np.concatenate(chunks) if chunks else np.zeros(1), rate)
        done += 1
        if done % 50 == 0:
            print(f"{done} gerendert…", flush=True)
    print(f"fertig: {done} neue Dateien")


if __name__ == "__main__":
    main()
