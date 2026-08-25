"use client";

// Buchstaben-Puzzle: Ein Buchstabe ist in seine Striche zerlegt (aus den
// Schreibbahnen). Die Teile liegen verstreut – ins Ziel schieben, dann
// rastet das Teil ein. Schult die Form (B/D/P, M/N …). Kein Lesen.
import { useEffect, useMemo, useRef, useState } from "react";
import { STROKES } from "@/lib/strokes";
import { speak, speakSeq, stopSpeaking } from "@/lib/speech";
import { playPop, playCorrect, playFanfare, unlockAudio } from "@/lib/sfx";
import { enableWakeLock, disableWakeLock } from "@/lib/wakeLock";
import { addPoints } from "@/lib/progress";
import { pickFrom, PRAISE } from "@/lib/phrases";
import { addScore } from "@/lib/leaderboard";
import { confettiRain } from "@/lib/fx";
import { GameMenu, GameHud, useFx } from "@/components/GameFrame";

const GAME = "puzzle";
const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].filter((l) => (STROKES[l] || []).length >= 2);
const ROUNDS = 6;
const d = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");

export default function Puzzle() {
  const [phase, setPhase] = useState("menu");
  const [round, setRound] = useState(0);
  const [letter, setLetter] = useState("A");
  const [pieces, setPieces] = useState([]); // {i, dx, dy, placed}
  const [score, setScore] = useState(0);
  const [result, setResult] = useState(null);
  const drag = useRef(null);
  const boxRef = useRef(null);
  const t0 = useRef(0);
  const { popup, reveal, countdown, Fx } = useFx();
  useEffect(() => () => { stopSpeaking(); disableWakeLock(); }, []);

  function makeRound() {
    const L = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    setLetter(L);
    setPieces(STROKES[L].map((_, i) => ({ i, dx: -60 + Math.random() * 120, dy: 95 + Math.random() * 40, placed: false })));
    speakSeq([{ text: `Setze das ${L} zusammen! Schiebe die Teile in die graue Form.` }]);
  }
  function start() {
    unlockAudio(); enableWakeLock();
    setScore(0); setRound(0); setResult(null); setPhase("play"); t0.current = Date.now();
    countdown(makeRound);
    speakSeq([{ text: "Drei" }, { pause: 500 }, { text: "Zwei" }, { pause: 500 }, { text: "Eins" }, { pause: 400 }, { text: "Los geht's!" }]);
  }
  function finish(finalScore) {
    playFanfare(); confettiRain(); addPoints(Math.round(finalScore / 4));
    const rank = addScore(GAME, finalScore);
    setResult({ score: finalScore, rank, text: `${ROUNDS} Buchstaben gebaut ${rank ? `· Platz ${rank} 🏆` : ""}` });
    setPhase("over");
    setTimeout(() => speak(`Fertig! ${finalScore} Punkte!`), 500);
  }

  function down(p, e) {
    if (p.placed) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { i: p.i, sx: e.clientX, sy: e.clientY, ox: p.dx, oy: p.dy };
  }
  function move(e) {
    const dr = drag.current; if (!dr) return;
    const box = boxRef.current.getBoundingClientRect();
    const k = 240 / box.width; // px → SVG-Einheiten (viewBox ist 240 breit) – 1:1 unter dem Finger
    setPieces((ps) => ps.map((p) => {
      if (p.i !== dr.i) return p;
      let dx = dr.ox + (e.clientX - dr.sx) * k, dy = dr.oy + (e.clientY - dr.sy) * k;
      // leichter Magnet-Sog schon beim Ziehen
      const dist = Math.hypot(dx, dy);
      if (dist < 30) { dx *= 0.5; dy *= 0.5; }
      return { ...p, dx, dy, near: dist < 30 };
    }));
  }
  function up(e) {
    const dr = drag.current; if (!dr) return; drag.current = null;
    setPieces((ps) => {
      const p = ps.find((x) => x.i === dr.i);
      // Magnet: in der Nähe der Zielform rastet das Teil ein
      if (Math.hypot(p.dx, p.dy) < 18) {
        playPop(); popup(e.clientX, e.clientY, "+5", true);
        const next = ps.map((x) => (x.i === dr.i ? { ...x, dx: 0, dy: 0, placed: true } : x));
        setScore((sc) => sc + 5);
        if (next.every((x) => x.placed)) {
          playCorrect(); speak(`${letter}! ${pickFrom(PRAISE)}`);
          setScore((sc) => {
            const bonus = 15;
            const ns = sc + bonus;
            if (round + 1 >= ROUNDS) setTimeout(() => finish(ns), 900);
            else setTimeout(() => { setRound(round + 1); makeRound(); }, 1200);
            return ns;
          });
        }
        return next;
      }
      return ps;
    });
  }

  if (phase !== "play")
    return <GameMenu emoji="🧩" title="Buchstaben-Puzzle" game={GAME} result={result} onStart={start} help="Der Buchstabe ist in Teile zerbrochen. Schiebe jedes Teil in die graue Form, bis es einrastet. 6 Buchstaben." />;

  return (
    <div className="race-shell" style={{ background: "linear-gradient(#fff4d6, #ffd9a8)" }}>
      <GameHud score={score} streak={0} right={<span>🧩 {round + 1}/{ROUNDS}</span>} onClose={() => finish(score)} />
      <div className="race-area" style={{ display: "flex", alignItems: "center", justifyContent: "center" }} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <Fx />
        <div className="puzzle-box" ref={boxRef}>
          <svg viewBox="-70 -10 240 250" className="puzzle-svg">
            <g>
              {(STROKES[letter] || []).map((st, i) => (
                <path key={`g${i}`} d={d(st)} fill="none" stroke="#e5e5e5" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </g>
            {pieces.map((p) => (
              <g key={p.i} transform={`translate(${p.dx} ${p.dy})`} className={`puzzle-piece ${p.placed ? "placed" : ""}`} onPointerDown={(e) => down(p, e)}>
                <path d={d(STROKES[letter][p.i])} fill="none" stroke={p.placed ? "#58cc02" : ["#ff4b4b", "#1cb0f6", "#ff9600", "#ce82ff"][p.i % 4]} strokeWidth={p.near ? 15 : 12} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ))}
          </svg>
          <div className="puzzle-letter">{letter}</div>
        </div>
      </div>
    </div>
  );
}
