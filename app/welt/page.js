"use client";

// 🌍 Welt: Geografie-Spiel mit echter Karte (world-atlas, per scripts/gen-geo.mjs
// nach public/geo/*.json gerendert). Drei Spielarten:
//   • FINDEN  – "Finde Deutschland!" → das Land antippen
//   • FLAGGE  – die Flagge wird gezeigt → das passende Land antippen
//   • PUZZLE  – das Land ist aus der Karte ausgeschnitten und wird als
//               magnetisches Teil an seinen Platz gezogen
// Karten: Europa (28 Länder) und Welt (29 Länder). 10 Runden, Bestenliste.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { speak, speakSeq, stopSpeaking } from "@/lib/speech";
import { playPop, playCorrect, playWrong, playFanfare, unlockAudio } from "@/lib/sfx";
import { enableWakeLock, disableWakeLock } from "@/lib/wakeLock";
import { addPoints } from "@/lib/progress";
import { pickFrom, PRAISE } from "@/lib/phrases";
import { addScore } from "@/lib/leaderboard";
import { confettiRain } from "@/lib/fx";
import Leaderboard from "@/components/Leaderboard";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const GAME = "welt";
const ROUNDS = 10;
const MAPS = { europa: { label: "🇪🇺 EUROPA", file: "europa.json" }, welt: { label: "🌍 WELT", file: "welt.json" } };
const MODES = { find: "🔍 FINDEN", flag: "🏳️ FLAGGE", puzzle: "🧩 PUZZLE" };

export default function Welt() {
  const router = useRouter();
  const [phase, setPhase] = useState("menu");
  const [mapId, setMapId] = useState("europa");
  const [mode, setMode] = useState("find");
  const [data, setData] = useState(null);
  const [order, setOrder] = useState([]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [tries, setTries] = useState(0);
  const [flash, setFlash] = useState(null); // { id, ok }
  const [hint, setHint] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [piece, setPiece] = useState({ x: 0, y: 0 }); // Versatz des Puzzleteils
  const [result, setResult] = useState(null);
  const [learned, setLearned] = useState({});
  const svgRef = useRef(null);
  const drag = useRef(null);
  const lock = useRef(false);

  useEffect(() => {
    try { setLearned(JSON.parse(localStorage.getItem("welt-learned") || "{}")); } catch {}
    return () => { stopSpeaking(); disableWakeLock(); };
  }, []);
  useEffect(() => {
    setData(null);
    fetch(`${BASE}/geo/${MAPS[mapId].file}`, { cache: "force-cache" }).then((r) => r.json()).then(setData).catch(() => {});
  }, [mapId]);

  const target = data && order.length ? data.countries.find((c) => c.id === order[round]) : null;

  function start() {
    if (!data) return;
    unlockAudio(); enableWakeLock();
    const ids = data.countries.map((c) => c.id).sort(() => Math.random() - 0.5).slice(0, ROUNDS);
    setOrder(ids); setRound(0); setScore(0); setTries(0); setFlash(null); setHint(false); setPlaced(false); setResult(null);
    setPhase("play");
    const first = data.countries.find((c) => c.id === ids[0]);
    setTimeout(() => announce(first, true), 300);
  }

  function announce(c, intro = false) {
    if (!c) return;
    const what = mode === "flag" ? `Zu welchem Land gehört diese Flagge? Tipp auf das Land.` : mode === "puzzle" ? `Wo gehört ${c.name} hin? Zieh das Teil an seinen Platz.` : `Finde ${c.name}! Tipp auf das Land.`;
    if (mode === "puzzle") placePiece(c);
    if (intro) speakSeq([{ text: mode === "find" ? "Wir suchen Länder auf der Karte!" : mode === "flag" ? "Wir lernen Flaggen!" : "Länder-Puzzle!" }, { pause: 200 }, { text: what }]);
    else speak(what);
  }
  function placePiece(c) {
    // Teil weit weg vom Ziel ablegen (unten links oder rechts)
    const left = c.cx > data.w / 2;
    setPiece({ x: (left ? data.w * 0.15 : data.w * 0.85) - c.cx, y: data.h * 0.85 - c.cy });
    setPlaced(false);
  }

  function next(bonus) {
    const s = score + bonus;
    setScore(s);
    if (round + 1 >= ROUNDS) {
      setTimeout(() => {
        playFanfare(); confettiRain();
        const rank = addScore(GAME, s, { map: mapId, mode });
        addPoints(Math.round(s / 2));
        setResult({ score: s, rank, text: `${s} Punkte! ${rank === 1 ? "Neuer Rekord!" : ""}` });
        speak(`Fertig! ${s} Punkte! ${pickFrom(PRAISE)}`);
        setPhase("menu");
      }, 900);
      return;
    }
    setTimeout(() => {
      const r = round + 1;
      setRound(r); setTries(0); setFlash(null); setHint(false); lock.current = false;
      announce(data.countries.find((c) => c.id === order[r]));
    }, 1000);
  }

  function tap(c) {
    if (lock.current || !target || mode === "puzzle") return;
    if (c && c.id === target.id) {
      lock.current = true; playCorrect();
      setFlash({ id: c.id, ok: true });
      const bonus = tries === 0 ? 10 : tries === 1 ? 6 : 3;
      const l = { ...learned, [c.id]: (learned[c.id] || 0) + 1 }; setLearned(l); localStorage.setItem("welt-learned", JSON.stringify(l));
      speak(`${pickFrom(PRAISE)} Das ist ${c.name}.`);
      next(bonus);
    } else {
      playWrong(); setTries((t) => t + 1);
      if (c) { setFlash({ id: c.id, ok: false }); speak(`Nein, das ist ${c.name}. ${target.name} ist woanders.`); }
      else speak(`Das ist ${target.name} nicht.`);
      if (tries + 1 >= 2) { setHint(true); speak(`Schau, ${target.name} blinkt jetzt.`); }
      setTimeout(() => setFlash(null), 700);
    }
  }

  // ---------- Puzzle: Ziehen ----------
  const toSvg = (e) => {
    const svg = svgRef.current; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse()); return [p.x, p.y];
  };
  const pDown = (e) => { if (placed || lock.current) return; e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); const [x, y] = toSvg(e); drag.current = { x0: x, y0: y, px: piece.x, py: piece.y }; };
  const pMove = (e) => { if (!drag.current) return; e.preventDefault(); const [x, y] = toSvg(e); setPiece({ x: drag.current.px + x - drag.current.x0, y: drag.current.py + y - drag.current.y0 }); };
  const pUp = (e) => {
    if (!drag.current) return; e.preventDefault(); drag.current = null;
    const dist = Math.hypot(piece.x, piece.y);
    const snap = Math.max(22, target.size * 0.3);
    if (dist <= snap) {
      lock.current = true; setPiece({ x: 0, y: 0 }); setPlaced(true); playCorrect();
      const bonus = tries === 0 ? 10 : 6;
      const l = { ...learned, [target.id]: (learned[target.id] || 0) + 1 }; setLearned(l); localStorage.setItem("welt-learned", JSON.stringify(l));
      speak(`${pickFrom(PRAISE)} ${target.name} passt genau!`);
      next(bonus);
    } else {
      playPop(); setTries((t) => t + 1);
      if (tries + 1 >= 2) { setHint(true); speak(`Schau, da wo es blinkt gehört ${target.name} hin.`); }
    }
  };

  if (phase === "menu") {
    const total = data ? data.countries.length : 0, known = data ? data.countries.filter((c) => learned[c.id]).length : 0;
    return (
      <main className="shell">
        <div className="complete">
          <div className="complete-emoji">🌍</div>
          <div className="complete-title">{result ? `${result.score} Punkte!` : "Welt-Entdecker"}</div>
          <div className="points-total" style={{ maxWidth: 380 }}>{result ? result.text : "Länder finden, Flaggen lernen, Länder-Puzzle – auf einer echten Karte."}</div>
          <div className="write-bar" style={{ marginTop: 8 }}>{Object.entries(MAPS).map(([k, m]) => <button key={k} className={`btn ${mapId === k ? "" : "btn-blue"}`} onClick={() => setMapId(k)}>{m.label}</button>)}</div>
          <div className="write-bar">{Object.entries(MODES).map(([k, m]) => <button key={k} className={`btn ${mode === k ? "" : "btn-blue"}`} onClick={() => setMode(k)}>{m}</button>)}</div>
          {data && <div style={{ color: "#666", fontWeight: 700, marginTop: 6 }}>{known} von {total} Ländern schon gefunden</div>}
          <button className="btn splash-start pulse" style={{ marginTop: 12 }} onClick={start} disabled={!data}>{data ? (result ? "NOCHMAL 🔁" : "🔊 LOS GEHT'S!") : "⏳ Karte lädt …"}</button>
          <div className="cert-title" style={{ marginTop: 14 }}>🏆 Bestenliste</div>
          <Leaderboard game={GAME} highlight={result?.rank} />
          <button className="btn btn-blue" style={{ marginTop: 14 }} onClick={() => router.push("/")}>KARTE 🗺️</button>
        </div>
      </main>
    );
  }

  const sw = data.w / 1000; // Linienstärke relativ zur Kartengröße
  return (
    <div className="race-shell welt-shell">
      <div className="race-hud" style={{ color: "#1f2a44" }}>
        <button className="close-btn" aria-label="Beenden" onClick={() => { stopSpeaking(); setPhase("menu"); }}>✕</button>
        {target && (
          <button className="race-target welt-target" onClick={() => announce(target)}>
            {mode === "flag" ? <span style={{ fontSize: "2.2rem" }}>{target.flag}</span> : <>🔊 {target.name} <span>{learned[target.id] ? target.flag : ""}</span></>}
          </button>
        )}
        <span style={{ flex: 1 }}>🪙 {score}</span>
        <span className="write-step">{round + 1}/{ROUNDS}</span>
      </div>
      <div className="race-area welt-area">
        <svg ref={svgRef} viewBox={`0 0 ${data.w} ${data.h}`} className="welt-svg" preserveAspectRatio="xMidYMid meet">
          <rect width={data.w} height={data.h} fill="#bfe3ff" />
          <path d={data.all} fill="#eadfc0" stroke="#fff" strokeWidth={0.8 * sw} onPointerDown={() => tap(null)} />
          {data.countries.map((c) => {
            const isT = target && c.id === target.id;
            const hole = mode === "puzzle" && isT && !placed;
            const fill = flash?.id === c.id ? (flash.ok ? "#58cc02" : "#ff4b4b") : hole ? "#8fb8d8" : learned[c.id] ? "#b6e58f" : "#d6d0a8";
            return (
              <g key={c.id}>
                <path d={c.d} fill={fill} stroke={hole ? "#1f2a44" : "#fff"} strokeWidth={(hole ? 1.6 : 0.8) * sw} strokeDasharray={hole ? `${4 * sw} ${3 * sw}` : undefined} className={hint && isT && !placed ? "welt-hint" : ""} />
                {/* breite unsichtbare Tippfläche für kleine Länder */}
                {mode !== "puzzle" && <path d={c.d} fill="transparent" stroke="transparent" strokeWidth={10 * sw} onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); tap(c); }} style={{ cursor: "pointer" }} />}
              </g>
            );
          })}
          {mode === "puzzle" && target && (
            <g transform={`translate(${piece.x} ${piece.y})`} onPointerDown={pDown} onPointerMove={pMove} onPointerUp={pUp} onPointerCancel={pUp} style={{ cursor: "grab", touchAction: "none" }}>
              <path d={target.d} fill="transparent" stroke="transparent" strokeWidth={18 * sw} />
              <path d={target.d} fill={placed ? "#58cc02" : "#ff9600"} stroke="#1f2a44" strokeWidth={1.4 * sw} className={placed ? "" : "welt-piece"} />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
