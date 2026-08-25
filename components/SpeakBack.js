"use client";

// "Sprich nach!" – Mikro-Knopf auf der Lernkarte.
// Wird nur gezeigt, wenn der Browser Spracherkennung kann.
import { useEffect, useRef, useState } from "react";
import { isRecognitionSupported, listenOnce, matches } from "@/lib/recognition";
import { speak, stopSpeaking } from "@/lib/speech";
import { playCorrect, playPop } from "@/lib/sfx";
import { burstFromElement } from "@/lib/fx";
import { randomOf, PRAISE } from "@/lib/phrases";

export default function SpeakBack({ expected, spoken, onSuccess }) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState("idle"); // idle | listening | ok | retry
  const btnRef = useRef(null);

  useEffect(() => {
    setSupported(isRecognitionSupported());
  }, []);

  if (!supported) return null;

  async function listen() {
    if (state === "listening") return;
    stopSpeaking();
    playPop();
    setState("listening");
    const heard = await listenOnce({ timeoutMs: 5000 });
    if (matches(heard, expected)) {
      setState("ok");
      playCorrect();
      burstFromElement(btnRef.current, ["🎤", "⭐", "✨"], 12);
      speak(`${spoken || expected}! ${randomOf(PRAISE)}`);
      onSuccess?.();
    } else {
      setState("retry");
      speak(
        heard
          ? `Ich habe ${heard.split("|")[0].trim()} verstanden. Sag nochmal: ${spoken || expected}!`
          : `Ich habe nichts gehört. Sprich laut und deutlich: ${spoken || expected}!`
      );
    }
  }

  const label =
    state === "listening"
      ? "🎤 Ich höre zu…"
      : state === "ok"
      ? "✅ Super gesprochen!"
      : state === "retry"
      ? "🎤 Nochmal sagen"
      : "🎤 Sprich nach!";

  return (
    <button
      ref={btnRef}
      className={`btn btn-blue speakback ${state}`}
      onClick={listen}
      style={{ marginTop: 12 }}
    >
      {label}
    </button>
  );
}
