"use client";

// Großes Memory: 4 Spielarten × 3 Größen. Punkte aus Paaren, Zeit und Fehlern,
// Bestwert pro Spielart+Größe im localStorage.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CHAPTERS } from "@/lib/content";
import { speak, speakSeq, stopSpeaking } from "@/lib/speech";
import { playPop, playWrong, playCorrect, playFanfare, unlockAudio } from "@/lib/sfx";
import { burstFromElement, confettiRain } from "@/lib/fx";
import { randomOf, PRAISE } from "@/lib/phrases";
import { addPoints } from "@/lib/progress";
import { enableWakeLock, disableWakeLock } from "@/lib/wakeLock";
import FullscreenButton from "@/components/FullscreenButton";

const MODES = [
  { id: "bild", emoji: "🍎", title: "Buchstabe + Bild", intro: "Finde zum Buchstaben das Bild, das damit anfängt!" },
  { id: "klein", emoji: "Aa", title: "Groß + klein", intro: "Finde zum großen Buchstaben den kleinen!" },
  { id: "zahl", emoji: "🔢", title: "Zahl + Menge", intro: "Finde zur Zahl die richtige Menge!" },
  { id: "wort", emoji: "🐶", title: "Wort + Bild", intro: "Finde zum Wort das passende Bild!" },
];
const SIZES = [
  { id: "s", label: "Leicht", pairs: 4, cols: 4, mult: 1 },
  { id: "m", label: "Mittel", pairs: 6, cols: 4, mult: 1.5 },
  { id: "l", label: "Schwer", pairs: 8, cols: 4, mult: 2 },
  { id: "xl", label: "Profi", pairs: 10, cols: 5, mult: 3 },
];

const shuffle = (a) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

const letters = CHAPTERS.filter((c) => c.id.startsWith("abc")).flatMap((c) => c.items);
const numbers = CHAPTERS.filter((c) => c.id.startsWith("zahlen")).flatMap((c) => c.items).filter((n) => n.value >= 1 && n.value <= 9);
const vocab = CHAPTERS.filter((c) => c.id.startsWith("vokabeln")).flatMap((c) => c.items);

function buildPairs(mode, count) {
  if (mode === "bild") {
    const pool = shuffle(letters.filter((l) => !l.inWord)).slice(0, count);
    return pool.map((l) => {
      const w = randomOf(l.words);
      return { a: l.char, b: w.emojis[0], speak: `${l.char} wie ${w.word}!`, bSmall: false };
    });
  }
  if (mode === "klein")
    return shuffle(letters).slice(0, count).map((l) => ({ a: l.char, b: l.char.toLowerCase(), speak: `Großes ${l.char} und kleines ${l.char}!` }));
  if (mode === "zahl")
    return shuffle(numbers).slice(0, count).map((n) => ({ a: String(n.value), b: n.emoji.repeat(n.value), speak: n.word, bSmall: true }));
  return shuffle(vocab).slice(0, count).map((v) => ({ a: v.word, b: v.emojis[0], speak: v.word, aSmall: true }));
}

const scoreKey = (mode, size) => `anton-lernapp-memory-${mode}-${size}`;
const loadBest = (mode, size) => (typeof window === "undefined" ? 0 : parseInt(localStorage.getItem(scoreKey(mode, size)) || "0", 10) || 0);

export default function MemoryPage() {
  const router = useRouter();
  const [mode, setMode] = useState(null);
  const [size, setSize] = useState(null);
  const [pairs, setPairs] = useState([]);
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [misses, setMisses] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [phase, setPhase] = useState("menu"); // menu | play | done
  const [result, setResult] = useState(null);
  const [bests, setBests] = useState({});
  const busy = useRef(false);

  useEffect(() => {
    const b = {};
    for (const m of MODES) for (const s of SIZES) b[m.id + s.id] = loadBest(m.id, s.id);
    setBests(b);
    return () => {
      stopSpeaking();
      disableWakeLock();
    };
  }, []);

  useEffect(() => {
    if (phase !== "play") return;
    const iv = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  const sizeCfg = useMemo(() => SIZES.find((s) => s.id === size), [size]);
  const modeCfg = useMemo(() => MODES.find((m) => m.id === mode), [mode]);

  function start(m, s) {
    unlockAudio();
    enableWakeLock();
    const cfg = SIZES.find((x) => x.id === s);
    const p = buildPairs(m, cfg.pairs).map((pr, i) => ({ ...pr, id: i }));
    setMode(m);
    setSize(s);
    setPairs(p);
    setCards(
      shuffle(
        p.flatMap((pr) => [
          { pairId: pr.id, face: pr.a, small: pr.aSmall },
          { pairId: pr.id, face: pr.b, small: pr.bSmall },
        ])
      ).map((c, i) => ({ ...c, id: i }))
    );
    setFlipped([]);
    setMatched([]);
    setMisses(0);
    setSeconds(0);
    setResult(null);
    setPhase("play");
    setTimeout(() => speak(`Memory! ${MODES.find((x) => x.id === m).intro}`), 300);
  }

  function finish(finalMisses) {
    const base = sizeCfg.pairs * 20;
    const timeBonus = Math.max(0, sizeCfg.pairs * 12 - seconds);
    const penalty = finalMisses * 5;
    const score = Math.max(10, Math.round((base + timeBonus - penalty) * sizeCfg.mult));
    const stars = finalMisses <= sizeCfg.pairs / 2 ? 3 : finalMisses <= sizeCfg.pairs ? 2 : 1;
    const best = loadBest(mode, size);
    const record = score > best;
    if (record) localStorage.setItem(scoreKey(mode, size), String(score));
    setBests((b) => ({ ...b, [mode + size]: Math.max(best, score) }));
    addPoints(Math.round(score / 4));
    setResult({ score, stars, record, timeBonus, penalty });
    setPhase("done");
    playFanfare();
    confettiRain();
    setTimeout(
      () =>
        speakSeq([
          { text: `Alle Paare gefunden! ${score} Punkte!` },
          { pause: 300 },
          { text: record ? "Neuer Rekord! Wahnsinn!" : randomOf(PRAISE) },
        ]),
      500
    );
  }

  function tap(card, ev) {
    if (busy.current || flipped.includes(card.id) || matched.includes(card.pairId)) return;
    playPop();
    const now = [...flipped, card.id];
    setFlipped(now);
    if (now.length < 2) return;
    const [c1, c2] = now.map((id) => cards.find((c) => c.id === id));
    if (c1.pairId === c2.pairId) {
      playCorrect();
      burstFromElement(ev.currentTarget, ["⭐", "✨"], 10);
      const pr = pairs.find((p) => p.id === c1.pairId);
      speak(pr.speak);
      const nm = [...matched, c1.pairId];
      setMatched(nm);
      setFlipped([]);
      if (nm.length === pairs.length) finish(misses);
    } else {
      playWrong();
      const m = misses + 1;
      setMisses(m);
      busy.current = true;
      setTimeout(() => {
        setFlipped([]);
        busy.current = false;
      }, 900);
    }
  }

  if (phase === "menu")
    return (
      <main className="shell">
        <header className="home-header">
          <div className="home-title">🃏 MEMORY</div>
          <div className="home-sub">Wähle ein Spiel und wie schwer es sein soll</div>
        </header>
        {MODES.map((m) => (
          <section className="eltern-box" key={m.id}>
            <h3>
              <span style={{ fontSize: "1.5rem", marginRight: 8 }}>{m.emoji}</span>
              {m.title}
            </h3>
            <div className="memory-sizes">
              {SIZES.map((s) => (
                <button key={s.id} className="btn btn-blue memory-size" onClick={() => start(m.id, s.id)}>
                  {s.label}
                  <span>{s.pairs} Paare</span>
                  <span>🏆 {bests[m.id + s.id] || "–"}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
        <button className="btn btn-blue" style={{ margin: "16px auto 30px", display: "block" }} onClick={() => router.push("/")}>
          ⬅️ ZURÜCK
        </button>
      </main>
    );

  if (phase === "done")
    return (
      <main className="shell">
        <div className="complete">
          <div className="complete-emoji">🃏</div>
          <div className="complete-title">{result.record ? "Neuer Rekord!" : "Alle Paare!"}</div>
          <div className="complete-stars">
            {[1, 2, 3].map((n) => (
              <span key={n} className={n <= result.stars ? "star-on" : "star-off"}>⭐</span>
            ))}
          </div>
          <div className="points-earned">{result.score} Punkte</div>
          <div className="points-total">
            ⏱️ {seconds} s · ❌ {misses} Fehler · Zeit-Bonus +{result.timeBonus} · Fehler −{result.penalty}
          </div>
          <button className="btn" onClick={() => start(mode, size)}>NOCHMAL 🔁</button>
          <button className="btn btn-blue" onClick={() => setPhase("menu")}>ANDERES SPIEL 🃏</button>
          <button className="btn btn-blue" onClick={() => router.push("/")}>KARTE 🗺️</button>
        </div>
      </main>
    );

  return (
    <main className="shell">
      <div className="lesson-top">
        <button className="close-btn" aria-label="Beenden" onClick={() => setPhase("menu")}>✕</button>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${Math.max((matched.length / pairs.length) * 100, 4)}%` }} />
        </div>
        <div className="lesson-stats">
          <span className="points-pill">⏱️ {seconds}</span>
          <span className="points-pill">❌ {misses}</span>
        </div>
        <FullscreenButton />
      </div>
      <div className="lesson-body">
        <div className="game">
          <div className="game-title">{modeCfg.emoji} {modeCfg.title}</div>
          <div className="game-sub">Noch {pairs.length - matched.length} Paare</div>
          <div className="memory-grid big" style={{ gridTemplateColumns: `repeat(${sizeCfg.cols}, minmax(0, 1fr))` }}>
            {cards.map((card) => {
              const open = flipped.includes(card.id) || matched.includes(card.pairId);
              return (
                <button
                  key={card.id}
                  className={`memory-card ${open ? "open" : ""} ${matched.includes(card.pairId) ? "matched" : ""} ${card.small ? "small-face" : ""} ${mode === "klein" ? "lower-ok" : ""}`}
                  onClick={(e) => tap(card, e)}
                >
                  {open ? card.face : "❓"}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
