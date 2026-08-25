"use client";

// Trainer: 8 kurze Aufgaben mit den wackeligsten Buchstaben/Zahlen/Wörtern
// aus ALLEN Kapiteln. Kein Lernkarten-Teil, keine Spiele – reines Abrufen.
// Das ist der Teil, der wirklich zeigt, was hängen geblieben ist.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Exercise, NudgeButton } from "@/components/Exercise";
import FullscreenButton from "@/components/FullscreenButton";
import { buildTraining } from "@/lib/lesson";
import { rankItemsForTraining, recordAttempt, addPoints, touchDaily } from "@/lib/progress";
import { speak, speakSeq, stopSpeaking, whenSpeechDone } from "@/lib/speech";
import { unlockAudio, playFanfare } from "@/lib/sfx";
import { confettiRain } from "@/lib/fx";
import { enableWakeLock, disableWakeLock } from "@/lib/wakeLock";
import { getChapter } from "@/lib/content";

export default function Training() {
  const router = useRouter();
  const [steps, setSteps] = useState(null);
  const [idx, setIdx] = useState(0);
  const [solved, setSolved] = useState(false);
  const [praiseDone, setPraiseDone] = useState(false);
  const [right, setRight] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const mistake = useRef(false);

  useEffect(() => {
    setSteps(buildTraining(rankItemsForTraining(), 8));
    return () => {
      stopSpeaking();
      disableWakeLock();
    };
  }, []);

  useEffect(() => {
    if (!solved) return;
    return whenSpeechDone(() => setPraiseDone(true), { startDelay: 900 });
  }, [solved]);

  function start() {
    unlockAudio();
    enableWakeLock();
    setStarted(true);
    setTimeout(() => speak("Trainer! Zeig mir, was du noch weißt!"), 300);
  }

  function next() {
    stopSpeaking();
    setSolved(false);
    setPraiseDone(false);
    mistake.current = false;
    if (idx + 1 >= steps.length) {
      setDone(true);
      touchDaily();
      playFanfare();
      confettiRain();
      setTimeout(
        () => speakSeq([{ text: `Fertig! ${right} von ${steps.length} beim ersten Versuch richtig!` }]),
        500
      );
    } else setIdx(idx + 1);
  }

  if (!steps) return <main className="shell" />;
  const step = steps[idx];

  if (!started)
    return (
      <main className="shell">
        <div className="lesson-splash" style={{ background: "#ff9600" }}>
          <div className="splash-emoji bounce-slow">🏋️</div>
          <div className="splash-title">TRAINER</div>
          <div className="audio-warn" style={{ background: "rgba(255,255,255,0.2)" }}>
            8 Aufgaben – alles, was noch wackelt
          </div>
          <button className="btn splash-start pulse" onClick={start}>
            🔊 TIPP MICH – START!
          </button>
          <button className="btn btn-blue" style={{ marginTop: 14 }} onClick={() => router.push("/")}>
            ZURÜCK
          </button>
        </div>
      </main>
    );

  if (done)
    return (
      <main className="shell">
        <div className="complete">
          <div className="complete-emoji">🏋️</div>
          <div className="complete-title">Trainer fertig!</div>
          <div className="points-earned">
            {right} / {steps.length} sofort gewusst
          </div>
          <div className="complete-stars">
            {steps.map((_, i) => (
              <span key={i} className={i < right ? "star-on" : "star-off"} style={{ fontSize: "1.6rem" }}>
                ⭐
              </span>
            ))}
          </div>
          <NudgeButton onClick={() => router.push("/")} nudgeText="Tippe auf den grünen Knopf!">
            WEITER 🗺️
          </NudgeButton>
          <button className="btn btn-blue" onClick={() => window.location.reload()}>
            NOCHMAL 🔁
          </button>
        </div>
      </main>
    );

  return (
    <main className="shell">
      <div className="lesson-top">
        <button className="close-btn" aria-label="Beenden" onClick={() => router.push("/")}>
          ✕
        </button>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${Math.max((idx / steps.length) * 100, 4)}%` }} />
        </div>
        <div className="lesson-stats">
          <span className="points-pill">
            {getChapter(step.fromChapter)?.emoji} {idx + 1}/{steps.length}
          </span>
        </div>
        <FullscreenButton />
      </div>
      <div className="lesson-body">
        <Exercise
          key={idx}
          step={step}
          solved={solved}
          guided={false}
          onSolved={(firstTry) => {
            setSolved(true);
            recordAttempt(step.fromChapter, step.itemKey, firstTry);
            if (firstTry) {
              setRight((r) => r + 1);
              addPoints(10);
            } else addPoints(3);
          }}
          onMistake={() => {
            mistake.current = true;
          }}
        />
      </div>
      {solved && (
        <div className="feedback good">
          <div className="feedback-inner">
            <div className="feedback-text">Richtig! 🎉</div>
            {praiseDone ? (
              <NudgeButton key={`s-${idx}`} onClick={next} nudgeText="Tippe auf Weiter!">
                WEITER
              </NudgeButton>
            ) : (
              <button className="btn" disabled>
                🔊 …
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
