"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getChapter } from "@/lib/content";
import { buildLesson } from "@/lib/lesson";
import { speak, speakSeq, stopSpeaking, isSpeechSupported, whenSpeechDone } from "@/lib/speech";
import { playCorrect, playWrong, playFanfare, unlockAudio } from "@/lib/sfx";
import {
  saveStars,
  addPoints,
  loadPoints,
  getWeakKeys,
  markWeak,
  easeWeak,
  touchDaily,
} from "@/lib/progress";
import { evaluateBadges } from "@/lib/badges";
import { randomOf, PRAISE, TRY_AGAIN, MOTIVATION, STREAK_PRAISE } from "@/lib/phrases";
import {
  downloadCertificatePNG,
  downloadCertificatePDF,
  loadName,
  saveName,
} from "@/lib/certificate";
import { armMusicAutostart, stopMusic, toggleMusic, isMusicOn, startMusic } from "@/lib/music";
import { GAME_COMPONENTS } from "@/components/MiniGames";
import FullscreenButton from "@/components/FullscreenButton";
import SpeakBack from "@/components/SpeakBack";
import { enableWakeLock, disableWakeLock } from "@/lib/wakeLock";
import gsap from "gsap";
import { burstFromElement, burstAt, confettiRain, dropIn, popIn, staggerIn } from "@/lib/fx";

const NUMBER_WORDS = ["NULL", "EINS", "ZWEI", "DREI", "VIER", "FÜNF", "SECHS", "SIEBEN", "ACHT", "NEUN", "ZEHN"];

// Lautierung nach der Anlautmethode (wie in der Grundschule):
// KEINE Buchstabennamen pauken ("Em-Ah" ergibt nicht "Mama"!), sondern
// den Laut über Anlaut-Wörter hörbar machen. Gedehnte Laute nur bei
// Vokalen – die kann die Sprachausgabe zuverlässig richtig sprechen.
const LETTER_SOUNDS = {
  A: "aaa", E: "eee", I: "iii", O: "ooo", U: "uuu",
};

// ---------- Weiter-Button mit Anleitung bei Inaktivität ----------
// Wartet, bis nichts mehr gesprochen wird; kommt dann keine Interaktion,
// wird der Button animiert, eine 👇-Hand gezeigt und eine Anweisung gesprochen.

function NudgeButton({ onClick, children, className = "btn", style, nudgeText }) {
  const btnRef = useRef(null);
  const quiet = useRef(0);
  const nudges = useRef(0);
  const [showHand, setShowHand] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => {
      const speaking =
        typeof window !== "undefined" && window.speechSynthesis?.speaking;
      if (speaking) {
        quiet.current = 0;
        return;
      }
      quiet.current += 0.5;
      const threshold = nudges.current === 0 ? 2 : 6;
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
      <button ref={btnRef} className={className} onClick={onClick}>
        {children}
      </button>
    </span>
  );
}

// ---------- Fun-Fact-Karte ----------

function FactCard({ step, onNext }) {
  const cardRef = useRef(null);

  useEffect(() => {
    popIn(cardRef.current);
    const t = setTimeout(
      () => speakSeq([{ text: "Wusstest du das?" }, { pause: 350 }, { text: step.text, opts: { rate: 0.85 } }]),
      450
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <>
      <div className="teach-card fact-card" ref={cardRef}>
        <div className="fact-label">💡 Wusstest du?</div>
        <div className="teach-hero" style={{ fontSize: "clamp(4rem, 16vw, 6.5rem)" }}>
          {step.emoji}
        </div>
        <div className="fact-text">{step.text}</div>
        <button
          className="speak-big"
          aria-label="Vorlesen"
          onClick={() => speak(step.text)}
          style={{ marginTop: 12 }}
        >
          🔊
        </button>
      </div>
      <NudgeButton onClick={onNext} style={{ marginTop: 26 }} nudgeText="Tippe auf Weiter!">
        WEITER ✅
      </NudgeButton>
    </>
  );
}

// ---------- Lernkarte ----------

function TeachCard({ item }) {
  const [activeWord, setActiveWord] = useState(-1);
  const [counting, setCounting] = useState(0);
  const heroRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    popIn(cardRef.current);
    dropIn(heroRef.current, { delay: 0.15 });
  }, [item]);

  function speakAll() {
    if (item.type === "letter") {
      const parts = [{ text: `Das ist das ${item.char}!` }];
      // Gedehnter Laut nur bei Vokalen (klingt mit TTS korrekt)
      if (LETTER_SOUNDS[item.char]) {
        parts.push({ pause: 400 });
        parts.push({ text: `Es klingt: ${LETTER_SOUNDS[item.char]}!`, opts: { rate: 0.6 } });
      }
      // Anlautmethode: den Laut am Wortanfang hörbar machen
      parts.push(
        ...item.words.flatMap((w, i) => [
          { pause: 450 },
          {
            text: item.inWord ? `${w.word}! Da ist ein ${item.char} drin!` : `${item.char} wie ${w.word}!`,
            onStart: () => setActiveWord(i),
            onEnd: () => setActiveWord(-1),
          },
        ])
      );
      parts.push({ pause: 400 });
      parts.push({
        text: item.inWord
          ? `Hörst du das ${item.char} in ${item.words[0].word}?`
          : `Hörst du das ${item.char} am Anfang? ${item.words[0].word}!`,
        opts: { rate: 0.75 },
      });
      speakSeq(parts);
    } else if (item.type === "number") {
      const parts = [{ text: `Das ist die Zahl ${item.word}!` }];
      if (item.value >= 1 && item.value <= 9) {
        parts.push({ text: "Zähle mit!" });
        for (let n = 1; n <= item.value; n++) {
          parts.push({
            text: NUMBER_WORDS[n],
            onStart: () => setCounting(n),
            opts: { rate: 0.75 },
          });
        }
      }
      speakSeq(parts);
    } else if (item.type === "grammar") {
      speakSeq([
        { text: "Merke dir diesen Satz:" },
        { pause: 350 },
        { text: `${item.correct.toLowerCase()}!`, opts: { rate: 0.8 } },
        { pause: 400 },
        { text: item.explain },
      ]);
    } else {
      speak(`${item.word}!`);
    }
  }

  useEffect(() => {
    setActiveWord(-1);
    setCounting(0);
    const t = setTimeout(speakAll, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  if (item.type === "letter") {
    return (
      <div className="teach-card" ref={cardRef}>
        <div className="teach-hero wiggle" ref={heroRef} style={{ color: "var(--blue)" }}>
          {item.char}
        </div>
        <button className="speak-big" aria-label="Vorlesen" onClick={speakAll}>
          🔊
        </button>
        <div className="teach-words">
          {item.words.map((w, i) => (
            <button
              key={w.word}
              className={`word-chip ${activeWord === i ? "speaking" : ""}`}
              onClick={() =>
                speak(item.inWord ? `${w.word}! Mit ${item.char}!` : `${item.char} wie ${w.word}!`)
              }
            >
              <span className="word-chip-emojis">{w.emojis.join(" ")}</span>
              <span className="word-chip-label">
                {(() => {
                  // Den gelernten Buchstaben im Wort hervorheben (Anlaut oder im Wort)
                  const at = item.inWord ? Math.max(w.word.indexOf(item.char), 0) : 0;
                  return (
                    <>
                      {w.word.slice(0, at)}
                      <span className="first-letter">{w.word[at]}</span>
                      {w.word.slice(at + 1)}
                    </>
                  );
                })()}
              </span>
            </button>
          ))}
        </div>
        <SpeakBack expected={item.words[0].word} spoken={item.words[0].word} />
      </div>
    );
  }

  if (item.type === "number") {
    const emojis = item.emoji.repeat(item.value);
    return (
      <div className="teach-card" ref={cardRef}>
        <div className="teach-hero number-hero wiggle" ref={heroRef} style={{ color: "var(--orange)" }}>
          {item.value}
        </div>
        <div className="prompt-word">{item.word}</div>
        <button className="speak-big" aria-label="Vorlesen" onClick={speakAll} style={{ marginTop: 14 }}>
          🔊
        </button>
        <div
          className="count-emojis"
          style={item.value > 10 ? { fontSize: "1.6rem", letterSpacing: 2 } : undefined}
        >
          {[...emojis].map((e, i) => (
            <span key={i} className={i < counting ? "counted" : ""}>
              {e}
            </span>
          ))}
        </div>
        <SpeakBack expected={item.word} spoken={item.word} />
      </div>
    );
  }

  if (item.type === "grammar") {
    return (
      <div className="teach-card" ref={cardRef}>
        <div className="teach-hero wiggle" ref={heroRef} style={{ fontSize: "clamp(3.5rem, 15vw, 6rem)" }}>
          {item.emoji}
        </div>
        <div className="grammar-sentence">✅ {item.correct}</div>
        <div className="grammar-explain">{item.explain}</div>
        <button className="speak-big" aria-label="Vorlesen" onClick={speakAll} style={{ marginTop: 14 }}>
          🔊
        </button>
      </div>
    );
  }

  return (
    <div className="teach-card" ref={cardRef}>
      <div className="teach-hero wiggle" ref={heroRef} style={{ fontSize: "clamp(4rem, 18vw, 7rem)" }}>
        {item.emojis.join(" ")}
      </div>
      <div className="prompt-word">{item.word}</div>
      <button
        className="speak-big"
        aria-label="Vorlesen"
        onClick={() => speak(item.word)}
        style={{ marginTop: 14 }}
      >
        🔊
      </button>
      <SpeakBack expected={item.word} spoken={item.word} />
    </div>
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
function speakExercise(step) {
  const parts = [];
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

function Exercise({ step, onSolved, onMistake, solved }) {
  const [wrongPicks, setWrongPicks] = useState([]);
  const [hintIdx, setHintIdx] = useState(-1);
  const [encourage, setEncourage] = useState(null);
  const [locked, setLocked] = useState(false);
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
    const t = setTimeout(() => speakExercise(step), 450);
    // Während der Anweisung einmal alle Optionen hüpfen lassen ("hier musst du tippen")
    const tour = setTimeout(() => runHintTour(), 1200);
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
      if (typeof window !== "undefined" && window.speechSynthesis?.speaking) {
        lastAction.current = Date.now();
        return;
      }
      if (Date.now() - lastAction.current > 7000) {
        lastAction.current = Date.now();
        idleCount.current += 1;
        if (idleCount.current % 2 === 1) {
          speakExercise(step);
        } else {
          speak(randomOf(MOTIVATION));
        }
        runHintTour();
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
        {step.prompt?.word && <div className="prompt-word">{step.prompt.word}</div>}
        {step.speakText && (
          <button
            className={`speak-big ${step.prompt?.speaker ? "pulse" : ""}`}
            aria-label="Nochmal hören"
            onClick={() => {
              lastAction.current = Date.now();
              speak(step.speakText);
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
            onClick={(e) => handlePick(i, e)}
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

// ---------- Kapitel-Intro (Splash-Sequenz) ----------

function Splash({ chapter, onDone }) {
  const rootRef = useRef(null);
  const [started, setStarted] = useState(false);

  // Erst nach Tipp starten: schaltet Audio frei (Autoplay-Schutz) und
  // garantiert, dass Sprachausgabe und Töne wirklich abgespielt werden dürfen.
  function handleStart() {
    unlockAudio();
    enableWakeLock(); // iPad soll während der Lektion nicht einschlafen
    if (isMusicOn()) startMusic();
    setStarted(true);
  }

  // Audio-Anweisung auf dem Start-Bildschirm (+ Wiederholung bei Inaktivität)
  useEffect(() => {
    if (started) return;
    const intro = () =>
      speak(
        `${chapter.speakTitle || chapter.title}! Tippe auf den großen Knopf, dann geht es los!`
      );
    const t = setTimeout(intro, 600);
    const iv = setInterval(() => {
      if (typeof window !== "undefined" && window.speechSynthesis?.speaking) return;
      intro();
    }, 9000);
    return () => {
      clearTimeout(t);
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const root = rootRef.current;
    if (!root) return;
    const emoji = root.querySelector(".splash-emoji");
    const title = root.querySelector(".splash-title");
    const go = root.querySelector(".splash-go");
    setTimeout(() => speak(`${chapter.speakTitle || chapter.title}! Los geht's!`), 300);

    const tl = gsap.timeline({ onComplete: onDone });
    tl.fromTo(
      emoji,
      { y: -280, scale: 0.4, rotation: -30, opacity: 0 },
      { y: 0, scale: 1, rotation: 0, opacity: 1, duration: 0.75, ease: "bounce.out" }
    )
      .fromTo(
        title,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2.5)" }
      )
      .fromTo(
        go,
        { scale: 0 },
        {
          scale: 1,
          duration: 0.6,
          ease: "elastic.out(1, 0.45)",
          onStart: () => burstFromElement(go, ["🚀", "⭐", "✨"]),
        },
        "+=0.1"
      )
      .to(root, { opacity: 0, scale: 1.12, duration: 0.35, delay: 0.7 });
    return () => tl.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  if (!started) {
    return (
      <div className="lesson-splash" ref={rootRef} style={{ background: chapter.color }}>
        <div className="splash-emoji bounce-slow">{chapter.emoji}</div>
        <div className="splash-title">{chapter.title}</div>
        <button className="btn splash-start pulse" onClick={handleStart}>
          🔊 TIPP MICH – START!
        </button>
        {!isSpeechSupported() && (
          <div className="audio-warn">
            ⚠️ Dieser Browser unterstützt keine Sprachausgabe.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="lesson-splash" ref={rootRef} style={{ background: chapter.color }}>
      <div className="splash-emoji">{chapter.emoji}</div>
      <div className="splash-title">{chapter.title}</div>
      <div className="splash-go">LOS GEHT&apos;S! 🚀</div>
    </div>
  );
}

// ---------- Abschluss ----------

function Completion({ chapter, stars, sessionPoints, onRetry, onHome, newBadges = [] }) {
  const [total, setTotal] = useState(0);
  const [childName, setChildName] = useState("");
  const rootRef = useRef(null);

  useEffect(() => {
    setChildName(loadName());
  }, []);

  function certOpts() {
    saveName(childName);
    return {
      name: childName,
      chapterTitle: chapter.title,
      chapterEmoji: chapter.emoji,
      stars,
      points: sessionPoints,
    };
  }

  useEffect(() => {
    setTotal(loadPoints());
    playFanfare();
    confettiRain();
    setTimeout(() => {
      const parts = [
        { text: `Super gemacht! Du hast ${sessionPoints} Punkte gesammelt! Du bist spitze!` },
      ];
      for (const b of newBadges) {
        parts.push({ pause: 400 });
        parts.push({ text: `Du hast ein neues Abzeichen: ${b.title}!` });
      }
      speakSeq(parts);
    }, 700);

    const root = rootRef.current;
    if (!root) return;
    const trophy = root.querySelector(".complete-emoji");
    const title = root.querySelector(".complete-title");
    const starEls = root.querySelectorAll(".complete-stars span");
    const rest = root.querySelectorAll(".points-earned, .points-total, .btn, .cert-box");

    const tl = gsap.timeline();
    tl.fromTo(
      trophy,
      { y: -300, scale: 0.4, rotation: -25, opacity: 0 },
      { y: 0, scale: 1, rotation: 0, opacity: 1, duration: 0.85, ease: "bounce.out" }
    )
      .fromTo(
        title,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2.2)" }
      )
      .fromTo(
        starEls,
        { scale: 0, rotation: -180 },
        {
          scale: 1,
          rotation: 0,
          duration: 0.5,
          stagger: {
            each: 0.28,
            onStart() {
              burstFromElement(this.targets()[0], ["⭐", "✨"], 8);
            },
          },
          ease: "back.out(2.5)",
        }
      )
      .fromTo(
        rest,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.12, duration: 0.4, ease: "power2.out" }
      );
    return () => tl.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="complete" ref={rootRef}>
      <div className="complete-emoji">🏆</div>
      <div className="complete-title">Super gemacht!</div>
      <div className="complete-stars">
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= stars ? "star-on" : "star-off"}>
            ⭐
          </span>
        ))}
      </div>
      <div className="points-earned">+{sessionPoints} Punkte 🪙</div>
      <div className="points-total">Gesamt: {total} 🪙</div>

      {newBadges.length > 0 && (
        <div className="badge-row new">
          {newBadges.map((b) => (
            <div key={b.id} className="badge-chip earned">
              <span className="badge-emoji">{b.emoji}</span>
              <span>{b.title}</span>
            </div>
          ))}
        </div>
      )}

      <div className="cert-box">
        <div className="cert-title">📜 Deine Urkunde</div>
        <input
          className="cert-name"
          type="text"
          placeholder="Dein Name"
          maxLength={20}
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
        />
        <div className="cert-actions">
          <button
            className="btn btn-blue cert-btn"
            onClick={() => downloadCertificatePNG(certOpts())}
          >
            🖼️ ALS BILD
          </button>
          <button
            className="btn btn-blue cert-btn"
            onClick={() => downloadCertificatePDF(certOpts())}
          >
            📄 ALS PDF
          </button>
        </div>
      </div>

      <NudgeButton
        onClick={onHome}
        nudgeText="Tippe auf den grünen Knopf, um zur Karte zu kommen! Oder auf den blauen, um nochmal zu spielen!"
      >
        WEITER 🗺️
      </NudgeButton>
      <button className="btn btn-blue" onClick={onRetry}>
        NOCHMAL 🔁
      </button>
    </div>
  );
}

// ---------- Lektions-Seite ----------

export default function LessonClient({ id }) {
  const router = useRouter();
  const chapter = getChapter(id);

  const [steps, setSteps] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [solved, setSolved] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [praiseDone, setPraiseDone] = useState(false);
  const [newBadges, setNewBadges] = useState([]);
  const [floater, setFloater] = useState(null);
  const [musicOn, setMusicOn] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const floaterId = useRef(0);
  const mistakeInStep = useRef(false);

  function startLesson() {
    setSteps(buildLesson(chapter, getWeakKeys(chapter.id), loadName()));
    setNewBadges([]);
    setStepIndex(0);
    setMistakes(0);
    setSolved(false);
    setDone(false);
    setSessionPoints(0);
    setStreak(0);
    setShowSplash(true);
  }

  useEffect(() => {
    if (chapter) startLesson();
    setMusicOn(isMusicOn());
    armMusicAutostart();
    return () => {
      stopSpeaking();
      stopMusic();
      disableWakeLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const step = steps ? steps[stepIndex] : null;

  // WEITER erst freigeben, wenn die Erfolgs-Ansage fertig gesprochen ist,
  // damit das Audio nicht abgeschnitten wirkt
  useEffect(() => {
    if (!solved) return;
    const cancel = whenSpeechDone(() => setPraiseDone(true), { startDelay: 900 });
    return cancel;
  }, [solved]);

  if (!chapter) {
    return (
      <main className="shell">
        <p>Kapitel nicht gefunden.</p>
        <Link href="/">Zurück</Link>
      </main>
    );
  }

  if (!steps) return <main className="shell" />;

  function givePoints(amount, label) {
    setSessionPoints((p) => Math.max(0, p + amount));
    addPoints(amount);
    floaterId.current += 1;
    setFloater({ id: floaterId.current, label });
    setTimeout(() => setFloater((f) => (f?.id === floaterId.current ? null : f)), 1100);
  }

  function handleSolved(firstTry) {
    setSolved(true);
    setPraiseDone(false);
    // Spaced Repetition: Erfolg beim ersten Versuch baut Schwächen ab
    if (step?.itemKey && firstTry) easeWeak(chapter.id, step.itemKey);
    if (firstTry) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      givePoints(10, "+10");
      if (newStreak > 0 && newStreak % 3 === 0) {
        givePoints(5, "🔥 +5");
        burstAt(window.innerWidth / 2, 130, ["🔥", "⭐", "✨"], 16);
        setTimeout(() => speak(randomOf(STREAK_PRAISE)), 1600);
      }
    } else {
      setStreak(0);
      givePoints(5, "+5");
    }
  }

  function nextStep() {
    stopSpeaking();
    mistakeInStep.current = false;
    setSolved(false);
    if (stepIndex + 1 >= steps.length) {
      const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
      saveStars(chapter.id, stars);
      touchDaily();
      setNewBadges(evaluateBadges());
      setDone(true);
    } else {
      setStepIndex(stepIndex + 1);
    }
  }

  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  const progressPct = Math.round((stepIndex / steps.length) * 100);

  if (showSplash) {
    return (
      <main className="shell">
        <Splash chapter={chapter} onDone={() => setShowSplash(false)} />
      </main>
    );
  }

  return (
    <main className="shell">
      {!done && (
        <div className="lesson-top">
          <button className="close-btn" aria-label="Beenden" onClick={() => router.push("/")}>
            ✕
          </button>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.max(progressPct, 4)}%` }} />
          </div>
          <div className="lesson-stats">
            <span className="points-pill">🪙 {sessionPoints}</span>
            {streak >= 2 && <span className="streak-pill">🔥 {streak}</span>}
          </div>
          <button
            className="music-btn"
            aria-label="Musik an/aus"
            onClick={() => setMusicOn(toggleMusic())}
          >
            {musicOn ? "🎵" : "🔇"}
          </button>
          <FullscreenButton />
        </div>
      )}

      {floater && (
        <div key={floater.id} className="point-floater">
          {floater.label} 🪙
        </div>
      )}

      <div className="lesson-body">
        {done ? (
          <Completion
            chapter={chapter}
            stars={stars}
            sessionPoints={sessionPoints}
            onRetry={startLesson}
            onHome={() => router.push("/")}
            newBadges={newBadges}
          />
        ) : step.kind === "fact" ? (
          <FactCard key={`fact-${stepIndex}`} step={step} onNext={nextStep} />
        ) : step.kind === "teach" ? (
          <>
            <TeachCard item={step.item} />
            <NudgeButton
              key={`teach-${stepIndex}`}
              onClick={nextStep}
              style={{ marginTop: 26 }}
              nudgeText="Tippe auf den grünen Knopf mit dem Haken! Dann geht es weiter!"
            >
              WEITER ✅
            </NudgeButton>
          </>
        ) : step.kind === "game" ? (
          (() => {
            const Game = GAME_COMPONENTS[step.game] || GAME_COMPONENTS.pop;
            return (
              <Game
                key={`game-${stepIndex}`}
                step={step}
                onDone={nextStep}
                onPoints={givePoints}
                onMistake={() => {
                  // Falsch getippt im Minispiel zählt wie ein Fehler in einer
                  // Übung → kostet am Ende Sterne (einmal pro Spiel)
                  if (!mistakeInStep.current) {
                    mistakeInStep.current = true;
                    setMistakes((m) => m + 1);
                  }
                }}
              />
            );
          })()
        ) : (
          <Exercise
            step={step}
            solved={solved}
            onSolved={handleSolved}
            onMistake={() => {
              if (!mistakeInStep.current) {
                mistakeInStep.current = true;
                setMistakes((m) => m + 1);
                // Schwaches Item merken → wird künftig bevorzugt wiederholt
                if (step?.itemKey) markWeak(chapter.id, step.itemKey);
              }
            }}
          />
        )}
      </div>

      {!done && step.kind === "exercise" && solved && (
        <div className="feedback good">
          <div className="feedback-inner">
            <div className="feedback-text">Richtig! 🎉</div>
            {praiseDone ? (
              <NudgeButton
                key={`solved-${stepIndex}`}
                onClick={nextStep}
                nudgeText="Tippe auf Weiter! Dann kommt die nächste Aufgabe!"
              >
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
