"use client";

// "Sprich nach!" – läuft streng nacheinander, nie gleichzeitig mit anderen Ansagen:
//   1. alle Sprachausgabe stoppen + Sperre setzen (keine Nudges/Wiederholungen)
//   2. Signalton, Aufnahme (Mikrofon) für ~2,5 s – parallel Spracherkennung, falls vorhanden
//   3. Aufnahme vorspielen ("So hast du es gesagt")
//   4. Vorbild vorspielen ("So klingt es")
//   5. Urteil (nur wenn Erkennung verfügbar) → Lob oder "nochmal"
//   6. Sperre lösen
// Während des Ablaufs ist der Weiter-Knopf gesperrt.
import { useEffect, useRef, useState } from "react";
import { isRecognitionSupported, listenOnce, matches } from "@/lib/recognition";
import { speak, speakSeq, stopSpeaking, holdSpeech, whenSpeechDone } from "@/lib/speech";
import { playCorrect, playPop } from "@/lib/sfx";
import { burstFromElement } from "@/lib/fx";
import { randomOf, PRAISE } from "@/lib/phrases";

const RECORD_MS = 2500;

function speakAndWait(parts) {
  return new Promise((resolve) => {
    speakSeq(parts);
    whenSpeechDone(resolve, { startDelay: 400 });
  });
}

async function recordClip(ms) {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return null;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // Lautstärke messen, damit "nichts gesagt" erkannt wird
  let peak = 0;
  let ctx = null;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    const buf = new Uint8Array(an.fftSize);
    const iv = setInterval(() => {
      an.getByteTimeDomainData(buf);
      for (const v of buf) peak = Math.max(peak, Math.abs(v - 128) / 128);
    }, 50);
    setTimeout(() => clearInterval(iv), ms);
  } catch {}
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise((r) => (rec.onstop = r));
  rec.start();
  await new Promise((r) => setTimeout(r, ms));
  rec.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  try {
    ctx?.close();
  } catch {}
  return { blob: new Blob(chunks, { type: rec.mimeType || "audio/webm" }), peak };
}

function playBlob(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const a = new Audio(url);
    a.onended = a.onerror = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    a.play().catch(resolve);
  });
}

export default function SpeakBack({ expected, spoken, onSuccess }) {
  const [available, setAvailable] = useState(false);
  const [recog, setRecog] = useState(false);
  const [state, setState] = useState("idle"); // idle | listening | playback | model | ok | retry
  const btnRef = useRef(null);
  const release = useRef(null);

  useEffect(() => {
    setAvailable(!!navigator.mediaDevices?.getUserMedia);
    setRecog(isRecognitionSupported());
    return () => release.current?.();
  }, []);

  if (!available) return null;

  async function run() {
    if (state !== "idle" && state !== "retry" && state !== "ok") return;
    stopSpeaking();
    release.current = holdSpeech();
    try {
      await speakAndWait([{ text: `Sag: ${spoken || expected}!` }]);
      playPop();
      setState("listening");
      const [clip, heard] = await Promise.all([
        recordClip(RECORD_MS),
        recog ? listenOnce({ timeoutMs: RECORD_MS + 1500 }).catch(() => "") : Promise.resolve(""),
      ]);
      const saidSomething = clip ? clip.peak > 0.08 : true;
      if (!saidSomething) {
        setState("retry");
        await speakAndWait([{ text: "Ich habe nichts gehört. Sprich laut und deutlich!" }]);
        return;
      }
      if (clip?.blob?.size) {
        setState("playback");
        await speakAndWait([{ text: "So hast du es gesagt:" }]);
        await playBlob(clip.blob);
      }
      setState("model");
      await speakAndWait([{ text: "Und so klingt es:" }, { pause: 200 }, { text: `${spoken || expected}!`, opts: { rate: 0.75 } }]);
      if (!recog) {
        setState("ok");
        await speakAndWait([{ text: "Sag es nochmal mit! " + randomOf(PRAISE) }]);
        onSuccess?.();
        return;
      }
      if (matches(heard, expected)) {
        setState("ok");
        playCorrect();
        burstFromElement(btnRef.current, ["🎤", "⭐", "✨"], 12);
        await speakAndWait([{ text: `Genau, ${spoken || expected}! ${randomOf(PRAISE)}` }]);
        onSuccess?.();
      } else {
        setState("retry");
        await speakAndWait([{ text: `Das klang noch anders. Probier es gleich nochmal!` }]);
      }
    } catch {
      setState("retry");
      speak("Das Mikrofon geht gerade nicht.");
    } finally {
      release.current?.();
      release.current = null;
    }
  }

  const label = {
    idle: "🎤 Sprich nach!",
    listening: "🔴 Ich höre zu…",
    playback: "▶️ So hast du es gesagt",
    model: "🔊 So klingt es",
    ok: "✅ Super! Nochmal?",
    retry: "🎤 Nochmal versuchen",
  }[state];

  return (
    <button ref={btnRef} className={`btn btn-blue speakback ${state}`} onClick={run} style={{ marginTop: 12 }}>
      {label}
    </button>
  );
}
