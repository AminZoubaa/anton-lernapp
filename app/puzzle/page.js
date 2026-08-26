"use client";

// Buchstaben-Puzzle: Zeichen (Buchstabe/Zahl/Wort) in seine Striche zerlegt.
// Teile groß, dick, Magnet-Einrasten. Gleich geformte Teile (z. B. die zwei
// Balken vom Z, die Striche vom E) passen in JEDEN passenden Platz – auch
// gedreht/umgekehrt. Modi: Buchstaben, Zahlen, Wörter; 10 Runden.
import { useEffect, useRef, useState } from "react";
import { STROKES, WRITE_WORDS, WORD_EMOJI, samplePath } from "@/lib/strokes";
import { speak, speakSeq, stopSpeaking } from "@/lib/speech";
import { playPop, playCorrect, playWrong, playFanfare, unlockAudio } from "@/lib/sfx";
import { enableWakeLock, disableWakeLock } from "@/lib/wakeLock";
import { addPoints } from "@/lib/progress";
import { pickFrom, PRAISE } from "@/lib/phrases";
import { addScore } from "@/lib/leaderboard";
import { confettiRain } from "@/lib/fx";
import { GameHud, useFx } from "@/components/GameFrame";
import Leaderboard from "@/components/Leaderboard";
import { useRouter } from "next/navigation";

const GAME = "puzzle";
const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].filter((l) => (STROKES[l] || []).length >= 2);
const DIGITS = [..."0123456789"].filter((l) => (STROKES[l] || []).length >= 2 || l === "0");
const ROUNDS = 10;
const d = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

// Sind zwei Striche gleich geformt (nach Verschiebung, ggf. umgekehrt)?
function congruent(a, b) {
  const A = samplePath(a, 3), B = samplePath(b, 3);
  if (Math.abs(A.length - B.length) > 3) return false;
  const norm = (P) => P.map(([x, y]) => [x - P[0][0], y - P[0][1]]);
  const diff = (P, Q) => { const n = Math.min(P.length, Q.length); let s = 0; for (let i = 0; i < n; i++) s += Math.hypot(P[i][0] - Q[i][0], P[i][1] - Q[i][1]); return s / n; };
  const An = norm(A);
  return diff(An, norm(B)) < 4 || diff(An, norm([...B].reverse())) < 4;
}

export default function Puzzle() {
  const [phase, setPhase] = useState("menu");
  const [mode, setMode] = useState("letters");
  const [round, setRound] = useState(0);
  const [glyphs, setGlyphs] = useState(["A"]); // ein oder mehrere Zeichen nebeneinander
  const [pieces, setPieces] = useState([]); // {id, g, i, dx, dy, placed, near}
  const [score, setScore] = useState(0);
  const [result, setResult] = useState(null);
  const drag = useRef(null);
  const boxRef = useRef(null);
  const { popup, countdown, Fx } = useFx();
  useEffect(() => () => { stopSpeaking(); disableWakeLock(); }, []);

  const CELL = 110; // Breite pro Zeichen im SVG
  const offX = (g) => g * CELL;

  function makeRound(m) {
    let chars;
    if (m === "digits") chars = [DIGITS[Math.floor(Math.random() * DIGITS.length)]];
    else if (m === "words") { const w = WRITE_WORDS.filter((w) => w.length <= 5)[Math.floor(Math.random() * 10)]; chars = [...w]; }
    else chars = [LETTERS[Math.floor(Math.random() * LETTERS.length)]];
    setGlyphs(chars);
    const ps = [];
    chars.forEach((c, g) => (STROKES[c] || []).forEach((_, i) => ps.push({ id: `${g}-${i}`, g, i, dx: -40 + Math.random() * 80, dy: 100 + Math.random() * 40, placed: false })));
    // Reihenfolge der Teile mischen, damit gleiche Teile wirklich vertauschbar sind
    for (let i = ps.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ps[i], ps[j]] = [ps[j], ps[i]]; }
    setPieces(ps);
    const label = chars.join("");
    speakSeq([{ text: chars.length > 1 ? `Setze das Wort ${label} zusammen!` : `Setze das ${label} zusammen! Schiebe die Teile in die graue Form.` }]);
  }
  function start(m) {
    unlockAudio(); enableWakeLock();
    setMode(m); setScore(0); setRound(0); setResult(null); setPhase("play");
    countdown(() => makeRound(m));
    speakSeq([{ text: "Drei" }, { pause: 500 }, { text: "Zwei" }, { pause: 500 }, { text: "Eins" }, { pause: 400 }, { text: "Los geht's!" }]);
  }
  function finish(finalScore) {
    playFanfare(); confettiRain(); addPoints(Math.round(finalScore / 4));
    const rank = addScore(GAME, finalScore);
    setResult({ score: finalScore, rank, text: `${ROUNDS} Runden gepuzzelt ${rank ? `· Platz ${rank} 🏆` : ""}` });
    setPhase("over");
    setTimeout(() => speak(`Fertig! ${finalScore} Punkte!`), 500);
  }

  function down(p, e) {
    if (p.placed || drag.current) return; // nur ein Teil gleichzeitig (zweiter Finger ignoriert)
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.stopPropagation();
    drag.current = { id: p.id, ptr: e.pointerId, sx: e.clientX, sy: e.clientY, ox: p.dx, oy: p.dy };
  }
  // Ziel-Slots: alle noch freien Striche mit gleicher Form
  function slotsFor(p) {
    const own = STROKES[glyphs[p.g]][p.i];
    const out = [];
    glyphs.forEach((c, g) => (STROKES[c] || []).forEach((st, i) => {
      if (pieces.some((q) => q.placed && q.slot === `${g}-${i}`)) return;
      if ((g === p.g && i === p.i) || congruent(own, st)) out.push({ slot: `${g}-${i}`, dx: offX(g) + st[0][0] - (offX(p.g) + own[0][0]), dy: st[0][1] - own[0][1], rev: !(g === p.g && i === p.i) && !congruentSame(own, st) });
    }));
    return out;
  }
  function congruentSame(a, b) {
    const A = samplePath(a, 3), B = samplePath(b, 3);
    const n = Math.min(A.length, B.length); let s = 0;
    for (let i = 0; i < n; i++) s += Math.hypot(A[i][0] - A[0][0] - (B[i][0] - B[0][0]), A[i][1] - A[0][1] - (B[i][1] - B[0][1]));
    return s / n < 4;
  }
  function move(e) {
    const dr = drag.current; if (!dr || e.pointerId !== dr.ptr) return;
    const box = boxRef.current.getBoundingClientRect();
    const vbW = glyphs.length * CELL + 40;
    const k = vbW / box.width; // px → SVG-Einheiten, 1:1 unter dem Finger
    setPieces((ps) => ps.map((p) => {
      if (p.id !== dr.id) return p;
      let dx = dr.ox + (e.clientX - dr.sx) * k, dy = dr.oy + (e.clientY - dr.sy) * k;
      const slots = slotsFor(p);
      let near = null;
      for (const sl of slots) {
        const dist = Math.hypot(dx - sl.dx, dy - sl.dy);
        if (dist < 26 && (!near || dist < near.dist)) near = { ...sl, dist };
      }
      if (near) { dx += (near.dx - dx) * 0.45; dy += (near.dy - dy) * 0.45; }
      return { ...p, dx, dy, near: near ? near.slot : null };
    }));
  }
  function up(e) {
    const dr = drag.current; if (!dr || e.pointerId !== dr.ptr) return; drag.current = null;
    setPieces((ps) => {
      const p = ps.find((x) => x.id === dr.id);
      const slots = slotsFor(p);
      const hit = slots.map((sl) => ({ ...sl, dist: Math.hypot(p.dx - sl.dx, p.dy - sl.dy) })).filter((sl) => sl.dist < 20).sort((a, b) => a.dist - b.dist)[0];
      if (!hit) return ps;
      playPop(); popup(e.clientX, e.clientY, "+5", true);
      const next = ps.map((x) => (x.id === dr.id ? { ...x, dx: hit.dx, dy: hit.dy, placed: true, slot: hit.slot, near: null } : x));
      setScore((sc) => sc + 5);
      if (next.every((x) => x.placed)) {
        playCorrect(); speak(`${glyphs.join("")}! ${pickFrom(PRAISE)}`);
        setScore((sc) => {
          const ns = sc + 15 * glyphs.length;
          if (round + 1 >= ROUNDS) setTimeout(() => finish(ns), 900);
          else setTimeout(() => { setRound(round + 1); makeRound(mode); }, 1300);
          return ns;
        });
      }
      return next;
    });
  }

  if (phase !== "play")
    return (
      <main className="shell">
        <div className="complete">
          <div className="complete-emoji">🧩</div>
          <div className="complete-title">{result ? `${result.score} Punkte!` : "Buchstaben-Puzzle"}</div>
          <div className="points-total" style={{ maxWidth: 360 }}>{result ? result.text : "Zeichen sind in Teile zerbrochen. Schiebe jedes Teil in die graue Form – gleiche Teile passen überall, wo sie passen."}</div>
          <div className="trainer-modes">
            <button className="btn splash-start pulse" onClick={() => start("letters")}>🔤 BUCHSTABEN</button>
            <button className="btn splash-start" style={{ background: "#ff9600" }} onClick={() => start("digits")}>🔢 ZAHLEN</button>
            <button className="btn splash-start" style={{ background: "#ce82ff" }} onClick={() => start("words")}>📝 WÖRTER</button>
          </div>
          <GameMenuTail game={GAME} rank={result?.rank} />
        </div>
      </main>
    );

  const vbW = glyphs.length * CELL + 40;
  return (
    <div className="race-shell" style={{ background: "linear-gradient(#fff4d6, #ffd9a8)" }}>
      <GameHud score={score} streak={0} right={<span>🧩 {round + 1}/{ROUNDS} {glyphs.length > 1 && (WORD_EMOJI[glyphs.join("")] || "")}</span>} onClose={() => finish(score)} />
      <div className="race-area puzzle-area" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <Fx />
        <div className="puzzle-box" ref={boxRef} style={{ width: `min(96vw, ${glyphs.length > 1 ? 96 : 80}vh * ${vbW / 200})` }}>
          <svg viewBox={`-20 -10 ${vbW} 200`} className="puzzle-svg">
            {glyphs.map((c, g) => (STROKES[c] || []).map((st, i) => (
              <path key={`g${g}${i}`} d={d(st.map(([x, y]) => [x + offX(g), y]))} fill="none" stroke={pieces.some((p) => p.near === `${g}-${i}`) ? "#c8e6ff" : "#e5e5e5"} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
            )))}
            {pieces.map((p, k) => (
              <g key={p.id} transform={`translate(${p.dx} ${p.dy})`} className={`puzzle-piece ${p.placed ? "placed" : ""}`} onPointerDown={(e) => down(p, e)}>
                <path d={d(STROKES[glyphs[p.g]][p.i].map(([x, y]) => [x + offX(p.g), y]))} fill="none" stroke="transparent" strokeWidth="34" />
                <path d={d(STROKES[glyphs[p.g]][p.i].map(([x, y]) => [x + offX(p.g), y]))} fill="none" stroke={p.placed ? "#58cc02" : ["#ff4b4b", "#1cb0f6", "#ff9600", "#ce82ff", "#ff86d0"][k % 5]} strokeWidth={p.near ? 18 : 15} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ))}
          </svg>
          <div className="puzzle-letter">{glyphs.join("")}</div>
        </div>
      </div>
    </div>
  );
}

function GameMenuTail({ game, rank }) {
  const router = useRouter();
  return (
    <>
      <div className="cert-title" style={{ marginTop: 14 }}>🏆 Bestenliste</div>
      <Leaderboard game={game} highlight={rank} />
      <button className="btn btn-blue" style={{ marginTop: 14 }} onClick={() => router.push("/")}>KARTE 🗺️</button>
    </>
  );
}
