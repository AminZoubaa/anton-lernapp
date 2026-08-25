"use client";

// Zähl-Teich: Tiere erscheinen im Teich. Erst jedes Tier antippen (zählt laut
// mit), dann die passende Zahl auf einem Seerosenblatt tippen. Kein Rechnen,
// kein Lesen – nur Zählen und Ziffern erkennen. 10 Runden, Punkte für
// Tempo und Fehlerfreiheit, Bestenliste. Schwierigkeit wächst (1–3 → 1–9).
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { speak, speakSeq, stopSpeaking } from "@/lib/speech";
import { playPop, playWrong, playCorrect, playFanfare, unlockAudio } from "@/lib/sfx";
import { enableWakeLock, disableWakeLock } from "@/lib/wakeLock";
import { addPoints } from "@/lib/progress";
import { pickFrom, PRAISE } from "@/lib/phrases";
import { addScore } from "@/lib/leaderboard";
import { NUMBER_WORDS } from "@/lib/games";
import { burstFromElement, confettiRain } from "@/lib/fx";
import Leaderboard from "@/components/Leaderboard";
import FullscreenButton from "@/components/FullscreenButton";

const GAME = "zaehlen";
const ROUNDS = 10;
const ANIMALS = ["🐸", "🦆", "🐟", "🐢", "🦢", "🐝", "🦋", "🐌"];
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

export default function Zaehlen() {
  const router = useRouter();
  const [phase, setPhase] = useState("menu");
  const [round, setRound] = useState(0);
  const [q, setQ] = useState(null); // {n, animal, positions, options}
  const [tapped, setTapped] = useState([]);
  const [score, setScore] = useState(0);
  const [wrongOpt, setWrongOpt] = useState(null);
  const [result, setResult] = useState(null);
  const mistakes = useRef(0);
  const startedAt = useRef(0);
  const roundStart = useRef(0);

  useEffect(() => () => { stopSpeaking(); disableWakeLock(); }, []);

  function makeRound(r) {
    const max = r < 3 ? 3 : r < 6 ? 5 : 9;
    const n = 1 + Math.floor(Math.random() * max);
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const positions = Array.from({ length: n }, (_, i) => ({
      left: 8 + ((i * 37) % 70) + Math.random() * 12,
      top: 10 + ((i * 53) % 60) + Math.random() * 15,
      delay: i * 0.12,
    }));
    const opts = new Set([n]);
    while (opts.size < 3) opts.add(1 + Math.floor(Math.random() * max));
    return { n, animal, positions, options: shuffle([...opts]) };
  }

  function start() {
    unlockAudio();
    enableWakeLock();
    setScore(0);
    mistakes.current = 0;
    startedAt.current = Date.now();
    goRound(0);
    setPhase("play");
    speak("Zähl-Teich! Tippe jedes Tier an und zähle mit. Dann tippe auf die richtige Zahl!");
  }

  function goRound(r) {
    setRound(r);
    setQ(makeRound(r));
    setTapped([]);
    setWrongOpt(null);
    roundStart.current = Date.now();
  }

  function tapAnimal(i, ev) {
    if (tapped.includes(i)) return;
    playPop();
    burstFromElement(ev.currentTarget, ["✨"], 5);
    const t = [...tapped, i];
    setTapped(t);
    speak(NUMBER_WORDS[t.length] || String(t.length), { rate: 0.8 });
  }

  function pick(v, ev) {
    if (v === q.n) {
      playCorrect();
      burstFromElement(ev.currentTarget, ["⭐", "✨", "🌟"], 12);
      const secs = (Date.now() - roundStart.current) / 1000;
      const gain = 10 + Math.max(0, 10 - Math.floor(secs)) + (tapped.length === q.n ? 5 : 0);
      const ns = score + gain;
      setScore(ns);
      speakSeq([{ text: `${NUMBER_WORDS[q.n]}! ${pickFrom(PRAISE)}` }]);
      if (round + 1 >= ROUNDS) {
        setTimeout(() => finish(ns), 900);
      } else setTimeout(() => goRound(round + 1), 1300);
    } else {
      playWrong();
      mistakes.current += 1;
      setWrongOpt(v);
      setTimeout(() => setWrongOpt(null), 500);
      speak(`Nicht ${NUMBER_WORDS[v]}. Zähle nochmal – tippe jedes Tier an!`);
      setTapped([]);
    }
  }

  function finish(finalScore) {
    playFanfare();
    confettiRain();
    addPoints(Math.round(finalScore / 4));
    const rank = addScore(GAME, finalScore);
    setResult({ score: finalScore, rank, mistakes: mistakes.current });
    setPhase("over");
    setTimeout(() => speak(rank === 1 ? `Neuer Rekord! ${finalScore} Punkte!` : `Fertig! ${finalScore} Punkte!`), 500);
  }

  if (phase !== "play")
    return (
      <main className="shell">
        <div className="complete">
          <div className="complete-emoji">🐸</div>
          <div className="complete-title">{phase === "over" ? `${result.score} Punkte!` : "Zähl-Teich"}</div>
          <div className="points-total" style={{ maxWidth: 340 }}>
            {phase === "over"
              ? `${result.mistakes === 0 ? "Ohne Fehler! " : `${result.mistakes} Fehler · `}${result.rank ? `Platz ${result.rank} 🏆` : ""}`
              : "Tippe jedes Tier an und zähle laut mit – dann tippe die richtige Zahl. 10 Runden, schnell gibt Extra-Punkte!"}
          </div>
          <button className="btn splash-start pulse" onClick={start}>{phase === "over" ? "NOCHMAL 🔁" : "🔊 LOS GEHT'S!"}</button>
          <div className="cert-title" style={{ marginTop: 14 }}>🏆 Bestenliste</div>
          <Leaderboard game={GAME} highlight={result?.rank} />
          <button className="btn btn-blue" style={{ marginTop: 14 }} onClick={() => router.push("/")}>KARTE 🗺️</button>
        </div>
      </main>
    );

  return (
    <div className="race-shell" style={{ background: "linear-gradient(#bfe9ff, #7cc7ff)" }}>
      <div className="race-hud" style={{ color: "#1f2a44" }}>
        <button className="close-btn" aria-label="Beenden" onClick={() => finish(score)}>✕</button>
        <span className="race-target" style={{ fontSize: "1.2rem" }}>Runde {round + 1}/{ROUNDS}</span>
        <span style={{ flex: 1 }}>🪙 {score}</span>
        <button className="music-btn" onClick={() => speak("Wie viele siehst du? Tippe jedes Tier an und zähle!")}>🔊</button>
        <FullscreenButton />
      </div>
      <div className="race-area pond" key={round}>
        {q.positions.map((p, i) => (
          <button
            key={i}
            className={`pond-animal ${tapped.includes(i) ? "counted" : ""}`}
            style={{ left: `${p.left}%`, top: `${p.top}%`, animationDelay: `${p.delay}s` }}
            onPointerDown={(e) => tapAnimal(i, e)}
          >
            {q.animal}
            {tapped.includes(i) && <span className="counttap-num">{tapped.indexOf(i) + 1}</span>}
          </button>
        ))}
        <div className="pond-pads">
          {q.options.map((v) => (
            <button key={v} className={`pond-pad ${wrongOpt === v ? "bubble-wrong" : ""}`} onPointerDown={(e) => pick(v, e)}>
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
