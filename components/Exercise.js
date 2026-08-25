"use client";

// Übungs-Aufgabe (Multiple Choice) und Weiter-Knopf – wird in Lektion und
// Trainer verwendet.
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { speak, speakSeq, whenSpeechDone, isSpeaking, isSpeechHeld } from "@/lib/speech";
import { playCorrect, playWrong } from "@/lib/sfx";
import { randomOf, PRAISE, TRY_AGAIN, MOTIVATION } from "@/lib/phrases";
import { burstFromElement, popIn, staggerIn } from "@/lib/fx";
import { letterSoundText } from "@/lib/lesson";
import { hasAudio } from "@/lib/audio";

// ---------- Weiter-Button mit Anleitung bei Inaktivität ----------
// Wartet, bis nichts mehr gesprochen wird; kommt dann keine Interaktion,
// wird der Button animiert, eine 👇-Hand gezeigt und eine Anweisung gesprochen.

export function NudgeButton({ onClick, children, className = "btn", style, nudgeText }) {
  const btnRef = useRef(null);
  const quiet = useRef(0);
  const nudges = useRef(0);
  const [showHand, setShowHand] = useState(false);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => {
      setHeld(isSpeechHeld());
      const speaking = isSpeaking();
      if (speaking) {
        quiet.current = 0;
        return;
      }
      quiet.current += 0.5;
      const threshold = nudges.current === 0 ? 4 : 8;
      if (quiet.current >= threshold) {
        quiet.current = 0;
        nudges.current += 1;
        setShowHand(true);
        speak(nudgeText || "Tippe auf den grünen Knopf! Dann geht es weiter!");
        if (btnRef.current) {
          gsap.fromTo(
            btnRef.current,
            { scale: 1 },
            { scale: 1.14, duration: 0.28, yoyo: true, repeat: 5, ease: "power1.inOut" }
          );
        }
      }
    }, 500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span className="btn-wrap" style={style}>
      {showHand && <span className="nudge-hand">👇</span>}
      <button ref={btnRef} className={className} onClick={onClick} disabled={held}>
        {held ? "🎤 …" : children}
      </button>
    </span>
  );
}

// ---------- Übung ----------

// Gesprochene Anweisung passend zu den Antwortoptionen
const TAP_HINTS = {
  letter: "Tippe unten auf den richtigen Buchstaben!",
  number: "Tippe unten auf die richtige Zahl!",
  word: "Tippe unten auf das richtige Wort!",
  emoji: "Tippe unten auf das richtige Bild!",
  sentence: "Tippe auf den richtigen Satz!",
};

// Ruhiger Sprechablauf mit Pausen:
// 1. Anweisung ("Tippe unten auf ...") – 2. Ansage ("Der Buchstabe lautet: B") –
// 3. zum Schluss immer die eigentliche Frage.
function speakExercise(step, setLit) {
  const parts = [];
  if (step.readWord) {
    // Lesen: Laut für Laut (mit Hervorhebung), dann das ganze Wort
    parts.push({ text: "Wir lesen zusammen. Hör zu:" });
    parts.push({ pause: 400 });
    step.spell.forEach((ch, i) => {
      parts.push(
        hasAudio(`laut:${ch}`)
          ? { audioKey: `laut:${ch}`, onStart: () => setLit?.(i) }
          : { text: letterSoundText(ch), opts: { rate: 0.6 }, onStart: () => setLit?.(i) }
      );
      parts.push({ pause: 250 });
    });
    parts.push({ text: `${step.speakText}!`, opts: { rate: 0.7 }, onStart: () => setLit?.(-2) });
    parts.push({ pause: 500 });
    parts.push({ text: "Welches Bild passt dazu? Tippe darauf!", onStart: () => setLit?.(-1) });
    speakSeq(parts);
    return;
  }
  const hint = TAP_HINTS[step.optionStyle];
  if (hint) {
    parts.push({ text: hint });
    parts.push({ pause: 500 });
  }
  if (step.announce) {
    parts.push({ text: step.announce, opts: { rate: 0.75 } });
    parts.push({ pause: 650 });
  } else if (step.speakText && step.speakText !== step.question) {
    parts.push({ text: step.speakText, opts: { rate: 0.75 } });
    parts.push({ pause: 650 });
  }
  parts.push({ text: step.question });
  speakSeq(parts);
}

export function Exercise({ step, onSolved, onMistake, solved, guided = true }) {
  const [wrongPicks, setWrongPicks] = useState([]);
  const [hintIdx, setHintIdx] = useState(-1);
  const [encourage, setEncourage] = useState(null);
  const [locked, setLocked] = useState(false);
  const [lit, setLit] = useState(-1); // Lese-Übung: hervorgehobener Buchstabe (-2 = alle)
  const lockCancel = useRef(null);
  const encourageTimer = useRef(null);
  const lastAction = useRef(Date.now());
  const idleCount = useRef(0);
  const tourTimers = useRef([]);
  const optionsRef = useRef(null);
  const promptRef = useRef(null);

  useEffect(() => {
    setWrongPicks([]);
    setHintIdx(-1);
    setLocked(false);
    if (lockCancel.current) lockCancel.current();
    lastAction.current = Date.now();
    idleCount.current = 0;
    popIn(promptRef.current);
    if (optionsRef.current) staggerIn(optionsRef.current.children, { delay: 0.25 });
    const t = setTimeout(() => speakExercise(step, setLit), 450);
    // Hüpf-Tour nur beim allerersten Durchgang eines Kapitels – danach soll
    // das Kind selbst suchen (sonst wird nur den hüpfenden Feldern nachgetippt)
    const tour = setTimeout(() => guided && runHintTour(), 1200);
    return () => {
      clearTimeout(t);
      clearTimeout(tour);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      tourTimers.current.forEach(clearTimeout);
      tourTimers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Geführte Hinweis-Tour: Optionen nacheinander hüpfen lassen
  function runHintTour() {
    tourTimers.current.forEach(clearTimeout);
    tourTimers.current = step.options.map((_, i) =>
      setTimeout(() => setHintIdx(i), 500 + i * 450)
    );
    tourTimers.current.push(
      setTimeout(() => setHintIdx(-1), 500 + step.options.length * 450)
    );
  }

  // Inaktivität: Frage wiederholen oder motivieren + Optionen animieren
  useEffect(() => {
    if (solved) return;
    const iv = setInterval(() => {
      // Solange gesprochen wird, zählt es nicht als Inaktivität
      if (isSpeaking()) {
        lastAction.current = Date.now();
        return;
      }
      if (Date.now() - lastAction.current > 7000) {
        lastAction.current = Date.now();
        idleCount.current += 1;
        if (idleCount.current % 2 === 1) {
          speakExercise(step, setLit);
        } else {
          speak(randomOf(MOTIVATION));
        }
        if (guided || idleCount.current >= 3) runHintTour();
      }
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, solved]);

  function handlePick(index, ev) {
    lastAction.current = Date.now();
    // Während die Fehler-Erklärung läuft, sind alle Antworten gesperrt –
    // erst zuhören, dann weitermachen!
    if (solved || locked) return;
    if (index === step.correctIndex) {
      playCorrect();
      burstFromElement(ev.currentTarget, ["⭐", "✨", "🌟", "💥"]);
      const praise = randomOf(PRAISE);
      const extra = step.speakOnCorrect ? ` ${step.speakOnCorrect}` : "";
      setTimeout(() => speak(`${praise}${extra}`), 300);
      onSolved(wrongPicks.length === 0);
    } else {
      playWrong();
      setWrongPicks((w) => [...w, index]);
      // Kurze, schnelle Erklärung – Antworten sperren, bis sie fertig ist
      const explain = step.wrongSpeak
        ? step.wrongSpeak(step.options[index])
        : randomOf(TRY_AGAIN);
      setLocked(true);
      setTimeout(() => speak(explain), 120);
      if (lockCancel.current) lockCancel.current();
      lockCancel.current = whenSpeechDone(() => setLocked(false), { startDelay: 600 });
      setEncourage(explain);
      if (encourageTimer.current) clearTimeout(encourageTimer.current);
      encourageTimer.current = setTimeout(() => setEncourage(null), 3000);
      onMistake();
    }
  }

  const optionClass = (i) => {
    let cls = "option-btn";
    if (hintIdx === i && !solved) cls += " hint";
    if (solved && i === step.correctIndex) cls += " correct";
    if (wrongPicks.includes(i)) cls += solved ? " dim" : " wrong dim";
    if (solved && i !== step.correctIndex) cls += " dim";
    return cls;
  };

  const isWordStyle = step.optionStyle === "word";
  const isSentence = step.optionStyle === "sentence";
  const oneCol = isWordStyle || isSentence;
  const cols = step.options.length === 3 && !oneCol ? " cols-3" : "";

  return (
    <div className="exercise">
      <div className="exercise-question">{step.question}</div>

      <div className="exercise-prompt" ref={promptRef}>
        {step.prompt?.hero && <div className="prompt-hero wiggle">{step.prompt.hero}</div>}
        {step.prompt?.emojis && (
          <div
            className="count-emojis"
            style={
              step.prompt.emojis.length > 20
                ? { fontSize: "1.5rem", letterSpacing: 2, marginTop: 0 }
                : { marginTop: 0 }
            }
          >
            {step.prompt.emojis}
          </div>
        )}
        {step.readWord ? (
          <div className="read-word">
            <div className="read-big">
              {step.spell.map((ch, i) => (
                <span key={i} className={lit === i || lit === -2 ? "lit" : ""}>
                  {ch}
                </span>
              ))}
            </div>
            <div className="read-small">{step.prompt.lower}</div>
          </div>
        ) : (
          step.prompt?.word && <div className="prompt-word">{step.prompt.word}</div>
        )}
        {step.speakText && (
          <button
            className={`speak-big ${step.prompt?.speaker ? "pulse" : ""}`}
            aria-label="Nochmal hören"
            onClick={() => {
              lastAction.current = Date.now();
              if (step.readWord) speakExercise(step, setLit);
              else speak(step.speakText);
            }}
            style={{ marginTop: step.prompt?.speaker ? 0 : 12 }}
          >
            🔊
          </button>
        )}
      </div>

      <div
        className={`options${cols}${locked ? " locked" : ""}`}
        ref={optionsRef}
        style={oneCol ? { gridTemplateColumns: "1fr" } : undefined}
      >
        {step.options.map((opt, i) => (
          <button
            key={`${opt.label}-${i}`}
            className={optionClass(i)}
            style={
              isWordStyle
                ? { fontSize: "1.5rem", minHeight: 72 }
                : isSentence
                ? { fontSize: "1.4rem", minHeight: 80 }
                : undefined
            }
            onPointerDown={(e) => handlePick(i, e)}
          >
            <span>{opt.label}</span>
            {opt.sub && (
              <span
                className="option-sub"
                style={isSentence ? { fontSize: "1.05rem", color: "var(--text)" } : undefined}
              >
                {opt.sub}
              </span>
            )}
          </button>
        ))}
      </div>

      {encourage && !solved && (
        <div className="feedback bad">
          <div className="feedback-inner" style={{ justifyContent: "center" }}>
            <div className="feedback-text">💪 {encourage}</div>
          </div>
        </div>
      )}
    </div>
  );
}

