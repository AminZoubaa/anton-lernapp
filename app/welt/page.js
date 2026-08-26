"use client";

// 🌍 Welt-Entdecker – Geografie mit echter Karte (world-atlas → public/geo/*.json).
//
// Karte: zoombar (Zwei-Finger-Pinch, Knöpfe) und verschiebbar (Ziehen), Tippen
// wird vom Ziehen unterschieden. Jede Aufgabe fährt die Karte automatisch an
// die passende Stelle (Lernen/Flagge/Puzzle: auf das Land; Finden: auf eine
// Region, in der das Land irgendwo liegt – damit die Zoomfahrt nichts verrät).
//
// Spielarten
//   📖 LERNEN  – Land für Land: Karte fährt hin, Steckbrief (Flagge, Hauptstadt,
//                Sprache, Einwohner, Größe im Vergleich), alles wird vorgelesen
//   🔍 FINDEN  – "Finde Italien!" → auf das Land tippen; nach 2 Fehlern blinkt es
//   🏳️ FLAGGE  – Quiz wie in Führerschein-Apps: 3 Flaggen zur Auswahl, falsche
//                Fragen kommen später nochmal, bis sie sitzen
//   🧩 PUZZLE  – das Land ist ausgeschnitten und wird magnetisch eingesetzt
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { speak, speakSeq, stopSpeaking } from "@/lib/speech";
import { playPop, playCorrect, playWrong, playFanfare, unlockAudio } from "@/lib/sfx";
import { enableWakeLock, disableWakeLock } from "@/lib/wakeLock";
import { addPoints } from "@/lib/progress";
import { pickFrom, PRAISE } from "@/lib/phrases";
import { addScore } from "@/lib/leaderboard";
import { confettiRain } from "@/lib/fx";
import { INFO, WORLD_AREA, popText } from "@/lib/countries";
import Leaderboard from "@/components/Leaderboard";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const GAME = "welt";
const ROUNDS = 8;
const MAPS = { europa: { label: "🇪🇺 EUROPA", file: "europa.json" }, welt: { label: "🌍 WELT", file: "welt.json" } };
const MODES = { learn: "📖 LERNEN", find: "🔍 FINDEN", flag: "🏳️ FLAGGE", puzzle: "🧩 PUZZLE" };
const PASTEL = ["#ffd166", "#f4a3a8", "#a0e7a0", "#a9d6ff", "#e6b8ff", "#ffc9a0", "#c8f0c0", "#ffe3a0"];
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);

// ---------- zoombare Karte ----------
function useViewBox(data) {
  const [vb, setVb] = useState(null);
  const anim = useRef(0);
  const vbRef = useRef(null);
  vbRef.current = vb;
  useEffect(() => { if (data) setVb({ x: 0, y: 0, w: data.w, h: data.h }); }, [data]);
  const clamp = useCallback((v) => {
    if (!data) return v;
    const minW = data.w / 12, w = Math.min(data.w, Math.max(minW, v.w));
    const h = w * (data.h / data.w);
    return { x: Math.min(Math.max(0, v.x), data.w - w), y: Math.min(Math.max(0, v.y), data.h - h), w, h };
  }, [data]);
  // sanft zu einem Kasten fahren (Karten-Koordinaten), pad = Faktor um den Kasten
  const flyTo = useCallback((b, pad = 2.2, minFrac = 0.22) => {
    if (!data) return;
    const w = Math.max(b.w * pad, b.h * pad * (data.w / data.h), data.w * minFrac);
    const h = w * data.h / data.w;
    const target = clamp({ x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h });
    cancelAnimationFrame(anim.current);
    const f = vbRef.current || { x: 0, y: 0, w: data.w, h: data.h };
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 700), e = 1 - Math.pow(1 - k, 3);
      setVb({ x: f.x + (target.x - f.x) * e, y: f.y + (target.y - f.y) * e, w: f.w + (target.w - f.w) * e, h: f.h + (target.h - f.h) * e });
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }, [data, clamp]);
  const zoomBy = useCallback((f, cx, cy) => { cancelAnimationFrame(anim.current); setVb((v) => {
    if (!v) return v;
    const w = v.w / f, h = v.h / f;
    const px = cx == null ? v.x + v.w / 2 : cx, py = cy == null ? v.y + v.h / 2 : cy;
    return clamp({ x: px - (px - v.x) / f, y: py - (py - v.y) / f, w, h });
  }); }, [clamp]);
  const panBy = useCallback((dx, dy) => { cancelAnimationFrame(anim.current); setVb((v) => (v ? clamp({ ...v, x: v.x - dx, y: v.y - dy }) : v)); }, [clamp]);
  return { vb, vbRef, setVb, flyTo, zoomBy, panBy };
}

export default function Welt() {
  const router = useRouter();
  const [phase, setPhase] = useState("menu");
  const [mapId, setMapId] = useState("europa");
  const [mode, setMode] = useState("learn");
  const [data, setData] = useState(null);
  const [learned, setLearned] = useState({});
  const [result, setResult] = useState(null);
  const { vb, vbRef, flyTo, zoomBy, panBy } = useViewBox(data);
  // Spielzustand
  const [queue, setQueue] = useState([]); // Länder-IDs der Aufgaben
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [tries, setTries] = useState(0);
  const [flash, setFlash] = useState(null);
  const [hint, setHint] = useState(false);
  const [options, setOptions] = useState([]); // Flaggen-Quiz
  const [answered, setAnswered] = useState(null); // { id, ok }
  const [piece, setPiece] = useState({ x: 0, y: 0 });
  const [placed, setPlaced] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: ROUNDS });
  const svgRef = useRef(null);
  const ptrs = useRef(new Map());
  const gesture = useRef(null);
  const drag = useRef(null);
  const pieceRef = useRef(piece); pieceRef.current = piece;
  const lock = useRef(false);

  useEffect(() => {
    try { setLearned(JSON.parse(localStorage.getItem("welt-learned") || "{}")); } catch {}
    return () => { stopSpeaking(); disableWakeLock(); };
  }, []);
  useEffect(() => {
    setData(null);
    fetch(`${BASE}/geo/${MAPS[mapId].file}`, { cache: "force-cache" }).then((r) => r.json()).then(setData).catch(() => {});
  }, [mapId]);

  const byId = (id) => data?.countries.find((c) => c.id === id);
  const target = data && queue.length ? byId(queue[qi]) : null;
  const colorOf = (c) => PASTEL[data.countries.indexOf(c) % PASTEL.length];
  const markLearned = (id) => { const l = { ...learned, [id]: (learned[id] || 0) + 1 }; setLearned(l); try { localStorage.setItem("welt-learned", JSON.stringify(l)); } catch {} };
  const box = (c) => ({ x: c.bx, y: c.by, w: c.bw, h: c.bh });

  // ---------- Start ----------
  function start() {
    if (!data) return;
    unlockAudio(); enableWakeLock();
    lock.current = false;
    const all = data.countries.map((c) => c.id);
    const ids = mode === "learn" ? all : shuffle(all).slice(0, ROUNDS);
    setQueue(ids); setQi(0); setScore(0); setTries(0); setFlash(null); setHint(false); setAnswered(null); setPlaced(false); setResult(null);
    setProgress({ done: 0, total: ids.length });
    setPhase("play");
    setTimeout(() => setup(byId(ids[0]), true), 250);
  }

  // Aufgabe einrichten: Karte hinfahren, Ansage, ggf. Optionen/Teil
  function setup(c, intro = false) {
    if (!c) return;
    setTries(0); setHint(false); setFlash(null); setAnswered(null); lock.current = false;
    const introText = { learn: "Wir lernen Länder kennen! Ich zeige dir jedes Land und erzähle dir etwas darüber.", find: "Wir suchen Länder auf der Karte! Tipp auf das richtige Land.", flag: "Flaggen-Quiz! Welche Flagge gehört zu dem Land? Tipp auf die richtige Flagge.", puzzle: "Länder-Puzzle! Zieh das Land an seinen Platz." }[mode];
    const pre = intro ? [{ text: introText }, { pause: 300 }] : [];
    if (mode === "learn") {
      flyTo(box(c), 2.6, 0.2);
      const i = INFO[c.id] || {};
      const parts = [{ text: `Das ist ${c.name}.` }, { pause: 200 }];
      if (i.cap) parts.push({ text: `Die Hauptstadt heißt ${i.cap}.` });
      if (i.lang) parts.push({ text: `Dort spricht man ${i.lang}.` });
      if (i.pop != null) parts.push({ text: `Es leben ${popText(i.pop)} Menschen dort.` });
      if (i.area) parts.push({ text: sizeText(c) });
      if (i.fact) parts.push({ pause: 200 }, { text: i.fact });
      speakSeq([...pre, ...parts]);
      markLearned(c.id);
    } else if (mode === "find") {
      // Region zeigen, in der das Land irgendwo liegt (nicht mittig – verrät sonst die Lage)
      const frac = c.size < data.w * 0.08 ? 0.35 : 1;
      if (frac < 1) {
        const w = data.w * frac, h = data.h * frac;
        const x = c.cx + (Math.random() - 0.5) * w * 0.7 - w / 2, y = c.cy + (Math.random() - 0.5) * h * 0.7 - h / 2;
        flyTo({ x, y, w, h }, 1, frac);
      } else flyTo({ x: 0, y: 0, w: data.w, h: data.h }, 1, 1);
      speakSeq([...pre, { text: `Finde ${c.name}!` }]);
    } else if (mode === "flag") {
      flyTo(box(c), 3, 0.3);
      const others = shuffle(data.countries.filter((x) => x.id !== c.id)).slice(0, 2);
      setOptions(shuffle([c, ...others]));
      speakSeq([...pre, { text: `Welche Flagge hat ${c.name}?` }]);
    } else {
      flyTo(box(c), 4, 0.4);
      setPlaced(false);
      // Teil unten im (angefahrenen) Ausschnitt ablegen
      setTimeout(() => { const v = vbRef.current; if (v) setPiece({ x: v.x + v.w * 0.5 - c.cx, y: v.y + v.h * 0.8 - c.cy }); }, 750);
      speakSeq([...pre, { text: `Wo gehört ${c.name} hin?` }]);
    }
  }
  function sizeText(c) {
    const i = INFO[c.id]; if (!i?.area) return "";
    const rank = [...data.countries].filter((x) => INFO[x.id]?.area).sort((a, b) => INFO[b.id].area - INFO[a.id].area).findIndex((x) => x.id === c.id) + 1;
    const de = INFO["276"].area, ratio = i.area / de;
    const cmp = c.id === "276" ? "" : ratio >= 1.5 ? `Es ist ${Math.round(ratio)}-mal so groß wie Deutschland.` : ratio > 0.8 ? "Es ist ungefähr so groß wie Deutschland." : `Deutschland ist ${Math.round(1 / ratio)}-mal so groß.`;
    return `Von der Größe her ist es Nummer ${rank} von ${data.countries.length} Ländern hier. ${cmp}`;
  }

  function advance(bonus) {
    const s = score + bonus; setScore(s);
    const done = progress.done + 1;
    setProgress((p) => ({ ...p, done }));
    if (qi + 1 >= queue.length) {
      setTimeout(() => {
        if (mode === "learn") { speak("Du kennst jetzt alle Länder auf dieser Karte!"); setPhase("menu"); return; }
        playFanfare(); confettiRain();
        const rank = addScore(GAME, s, { map: mapId, mode });
        addPoints(Math.round(s / 2));
        setResult({ score: s, rank, text: `${s} Punkte! ${rank === 1 ? "Neuer Rekord!" : ""}` });
        speak(`Fertig! ${s} Punkte! ${pickFrom(PRAISE)}`);
        setPhase("menu");
      }, 900);
      return;
    }
    setTimeout(() => { const n = qi + 1; setQi(n); setup(byId(queue[n])); }, mode === "learn" ? 0 : 1100);
  }
  function back() { if (qi === 0) return; const n = qi - 1; setQi(n); setup(byId(queue[n])); }

  // ---------- Finden: Tippen ----------
  function tapCountry(c) {
    if (mode !== "find" || lock.current || !target) return;
    if (c && c.id === target.id) {
      lock.current = true; playCorrect(); setFlash({ id: c.id, ok: true }); markLearned(c.id);
      flyTo(box(c), 3, 0.3);
      speak(`${pickFrom(PRAISE)} Das ist ${c.name}.`);
      advance(tries === 0 ? 10 : tries === 1 ? 6 : 3);
    } else {
      playWrong(); setTries((t) => t + 1);
      if (c) { setFlash({ id: c.id, ok: false }); speak(`Nein, das ist ${c.name}. Such weiter nach ${target.name}.`); }
      else speak(`Da ist ${target.name} nicht.`);
      if (tries + 1 >= 2) { setHint(true); speak(`Schau, ${target.name} blinkt jetzt.`); }
      setTimeout(() => setFlash(null), 800);
    }
  }
  // ---------- Flagge: Quiz ----------
  function pickFlag(c) {
    if (lock.current || !target || answered) return;
    if (c.id === target.id) {
      lock.current = true; playCorrect(); setAnswered({ id: c.id, ok: true }); markLearned(c.id);
      speak(`${pickFrom(PRAISE)} Das ist die Flagge von ${c.name}.`);
      advance(tries === 0 ? 10 : 5);
    } else {
      playWrong(); setAnswered({ id: c.id, ok: false }); setTries((t) => t + 1);
      speak(`Nein, das ist die Flagge von ${c.name}. Welche Flagge hat ${target.name}?`);
      // wie in Führerschein-Apps: die Frage kommt später nochmal dran
      if (!queue.slice(qi + 1).includes(target.id)) {
        setQueue((q) => [...q.slice(0, qi + 3), target.id, ...q.slice(qi + 3)]);
        setProgress((p) => ({ ...p, total: p.total + 1 }));
      }
      setTimeout(() => setAnswered(null), 900);
    }
  }

  // ---------- Gesten: Ziehen, Pinch, Tippen ----------
  const toMap = (e) => { const v = vbRef.current, r = svgRef.current.getBoundingClientRect(); return [v.x + ((e.clientX - r.left) / r.width) * v.w, v.y + ((e.clientY - r.top) / r.height) * v.h]; };
  const unitsPerPx = () => vbRef.current.w / svgRef.current.getBoundingClientRect().width;
  const onDown = (e) => {
    if (!vbRef.current) return;
    e.preventDefault();
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (drag.current) return;
    if (ptrs.current.size === 1) gesture.current = { kind: "maybe-tap", x: e.clientX, y: e.clientY, target: e.target };
    else if (ptrs.current.size === 2) { const [a, b] = [...ptrs.current.values()]; gesture.current = { kind: "pinch", d: Math.hypot(a.x - b.x, a.y - b.y) }; }
  };
  const onMove = (e) => {
    if (!vbRef.current || !ptrs.current.has(e.pointerId)) return;
    e.preventDefault();
    if (drag.current) { // Puzzleteil ziehen
      const [x, y] = toMap(e); setPiece({ x: drag.current.px + x - drag.current.x0, y: drag.current.py + y - drag.current.y0 });
      ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); return;
    }
    const prev = ptrs.current.get(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current; if (!g) return;
    if (g.kind === "pinch" && ptrs.current.size >= 2) {
      const [a, b] = [...ptrs.current.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      const v = vbRef.current, r = svgRef.current.getBoundingClientRect();
      const cx = v.x + (((a.x + b.x) / 2 - r.left) / r.width) * v.w, cy = v.y + (((a.y + b.y) / 2 - r.top) / r.height) * v.h;
      if (g.d > 0) zoomBy(d / g.d, cx, cy);
      g.d = d; return;
    }
    if (g.kind === "maybe-tap" && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 8) g.kind = "pan";
    if (g.kind === "pan") { const k = unitsPerPx(); panBy((e.clientX - prev.x) * k, (e.clientY - prev.y) * k); }
  };
  const onUp = (e) => {
    if (!vbRef.current) return;
    e.preventDefault();
    ptrs.current.delete(e.pointerId);
    if (drag.current) { dropPiece(); drag.current = null; return; }
    const g = gesture.current;
    if (g?.kind === "maybe-tap") { const id = g.target?.dataset?.id; tapCountry(id ? byId(id) : null); }
    if (ptrs.current.size === 0) gesture.current = null;
    else if (ptrs.current.size === 1) { const [a] = [...ptrs.current.values()]; gesture.current = { kind: "pan", x: a.x, y: a.y }; }
  };
  // Puzzle
  const pieceDown = (e) => {
    if (placed || lock.current) return;
    e.stopPropagation(); e.preventDefault();
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const [x, y] = toMap(e); drag.current = { x0: x, y0: y, px: pieceRef.current.x, py: pieceRef.current.y };
  };
  function dropPiece() {
    const p = pieceRef.current, v = vbRef.current;
    const dist = Math.hypot(p.x, p.y), snap = Math.max(v.w * 0.03, target.size * 0.3);
    if (dist <= snap) {
      lock.current = true; setPiece({ x: 0, y: 0 }); setPlaced(true); playCorrect(); markLearned(target.id);
      speak(`${pickFrom(PRAISE)} ${target.name} passt genau!`);
      advance(tries === 0 ? 10 : 6);
    } else {
      playPop(); setTries((t) => t + 1);
      if (tries + 1 >= 2) { setHint(true); speak(`Schau, wo es blinkt. Da gehört ${target.name} hin.`); }
    }
  }

  // ---------- Menü ----------
  if (phase === "menu") {
    const total = data ? data.countries.length : 0, known = data ? data.countries.filter((c) => learned[c.id]).length : 0;
    return (
      <main className="shell">
        <div className="complete">
          <div className="complete-emoji">🌍</div>
          <div className="complete-title">{result ? `${result.score} Punkte!` : "Welt-Entdecker"}</div>
          <div className="points-total" style={{ maxWidth: 400 }}>{result ? result.text : "Erst Länder kennenlernen, dann finden, Flaggen raten und puzzeln. Die Karte kannst du mit zwei Fingern zoomen und verschieben."}</div>
          <div className="welt-pick">{Object.entries(MAPS).map(([k, m]) => <button key={k} className={`btn ${mapId === k ? "" : "btn-blue"}`} onClick={() => setMapId(k)}>{m.label}</button>)}</div>
          <div className="welt-pick">{Object.entries(MODES).map(([k, m]) => <button key={k} className={`btn ${mode === k ? "" : "btn-blue"}`} onClick={() => setMode(k)}>{m}</button>)}</div>
          {data && <div style={{ color: "#666", fontWeight: 700, marginTop: 6 }}>{known} von {total} Ländern kennst du schon</div>}
          <button className="btn splash-start pulse" style={{ marginTop: 12 }} onClick={start} disabled={!data}>{data ? (result ? "NOCHMAL 🔁" : "🔊 LOS GEHT'S!") : "⏳ Karte lädt …"}</button>
          <div className="cert-title" style={{ marginTop: 14 }}>🏆 Bestenliste</div>
          <Leaderboard game={GAME} highlight={result?.rank} />
          <button className="btn btn-blue" style={{ marginTop: 14 }} onClick={() => router.push("/")}>KARTE 🗺️</button>
        </div>
      </main>
    );
  }
  if (!vb) return <div className="race-shell welt-shell" />;

  const sw = vb.w / 1000; // Linienstärke passt sich dem Zoom an
  const info = target ? INFO[target.id] : null;
  const showTarget = mode !== "find" || flash?.ok; // beim Finden nicht hervorheben
  const maxArea = Math.max(...data.countries.map((c) => INFO[c.id]?.area || 0));
  return (
    <div className="race-shell welt-shell">
      <div className="race-hud welt-hud" style={{ color: "#1f2a44" }}>
        <button className="close-btn" aria-label="Beenden" onClick={() => { stopSpeaking(); setPhase("menu"); }}>✕</button>
        <span style={{ flex: 1, fontWeight: 800 }}>{MODES[mode]}</span>
        {mode !== "learn" && <span>🪙 {score}</span>}
        <span className="write-step">{Math.min(progress.total, progress.done + (mode === "learn" ? 1 : 0))}/{progress.total}</span>
      </div>

      {/* Aufgaben-Karte: immer prominent, Tippen wiederholt die Ansage */}
      {target && (
        <button className="welt-task" onClick={() => setup(target)}>
          {mode === "find" && <><span className="welt-task-label">FINDE</span><span className="welt-task-name">{target.name}</span>{learned[target.id] > 0 && <span className="welt-task-flag">{target.flag}</span>}</>}
          {mode === "flag" && <><span className="welt-task-label">WELCHE FLAGGE HAT</span><span className="welt-task-name">{target.name}?</span></>}
          {mode === "puzzle" && <><span className="welt-task-flag">{target.flag}</span><span className="welt-task-label">SETZE EIN</span><span className="welt-task-name">{target.name}</span></>}
          {mode === "learn" && <><span className="welt-task-flag">{target.flag}</span><span className="welt-task-name">{target.name}</span></>}
          <span className="welt-task-say">🔊</span>
        </button>
      )}

      <div className="race-area welt-area">
        <svg ref={svgRef} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="welt-svg" preserveAspectRatio="xMidYMid slice"
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <rect x="0" y="0" width={data.w} height={data.h} fill="#bfe3ff" />
          <path d={data.all} fill="#efe6cf" stroke="#9c8f6a" strokeWidth={0.9 * sw} />
          {data.countries.map((c) => {
            const isT = target && c.id === target.id;
            const hole = mode === "puzzle" && isT && !placed;
            const fill = flash?.id === c.id ? (flash.ok ? "#58cc02" : "#ff4b4b") : hole ? "#8fb8d8" : isT && showTarget ? "#ffdd57" : colorOf(c);
            return (
              <path key={c.id} data-id={c.id} d={c.d} fill={fill} stroke={isT && showTarget ? "#1f2a44" : "#6b6046"}
                strokeWidth={(isT && showTarget ? 2.2 : 1.1) * sw} strokeDasharray={hole ? `${4 * sw} ${3 * sw}` : undefined}
                className={hint && isT && !placed ? "welt-hint" : ""} style={{ cursor: mode === "find" ? "pointer" : "default" }} />
            );
          })}
          {/* Namen der schon gelernten Länder bei stärkerem Zoom */}
          {vb.w < data.w * 0.6 && data.countries.filter((c) => learned[c.id] && c.bw > vb.w * 0.04 && !(mode === "find" && target?.id === c.id && !flash?.ok)).map((c) => (
            <text key={"t" + c.id} x={c.cx} y={c.cy} fontSize={Math.max(6, vb.w * 0.022)} textAnchor="middle" fill="#1f2a44" fontWeight="800" pointerEvents="none">{c.name}</text>
          ))}
          {mode === "puzzle" && target && (
            <g transform={`translate(${piece.x} ${piece.y})`} onPointerDown={pieceDown} style={{ cursor: "grab" }}>
              <path d={target.d} fill="transparent" stroke="transparent" strokeWidth={20 * sw} />
              <path d={target.d} fill={placed ? "#58cc02" : "#ff9600"} stroke="#1f2a44" strokeWidth={1.6 * sw} className={placed ? "" : "welt-piece"} />
            </g>
          )}
        </svg>
        <div className="welt-zoom">
          <button onClick={() => zoomBy(1.6)} aria-label="Vergrößern">＋</button>
          <button onClick={() => zoomBy(1 / 1.6)} aria-label="Verkleinern">－</button>
          <button onClick={() => flyTo({ x: 0, y: 0, w: data.w, h: data.h }, 1, 1)} aria-label="Ganze Karte">⛶</button>
        </div>
      </div>

      {/* Lernen: Steckbrief */}
      {mode === "learn" && target && (
        <div className="welt-card">
          <div className="welt-card-head"><span className="welt-card-flag">{target.flag}</span><div><div className="welt-card-name">{target.name}</div>{info?.cap && <div className="welt-card-sub">🏛️ {info.cap}</div>}</div></div>
          {info && (
            <div className="welt-facts">
              <div>🗣️ {info.lang}</div>
              <div>🧑‍🤝‍🧑 {info.pop < 1 ? `${Math.round(info.pop * 1000)} Tausend` : `${info.pop} Millionen`}</div>
              <div className="welt-size"><span>📏</span><span className="welt-bar"><span style={{ width: `${Math.max(2, (info.area / maxArea) * 100)}%` }} /></span><span>{(info.area / WORLD_AREA * 100).toFixed(info.area / WORLD_AREA * 100 < 1 ? 1 : 0)} % der Welt</span></div>
              {info.fact && <div className="welt-fact">💡 {info.fact}</div>}
            </div>
          )}
          <div className="write-bar">
            <button className="btn btn-blue" onClick={back} disabled={qi === 0}>⬅️ ZURÜCK</button>
            <button className="btn" onClick={() => advance(0)}>{qi + 1 >= queue.length ? "FERTIG ✅" : "WEITER ➡️"}</button>
          </div>
        </div>
      )}

      {/* Flagge: Antwortkarten */}
      {mode === "flag" && target && (
        <div className="welt-options">
          {options.map((c) => (
            <button key={c.id} className={`welt-flag ${answered?.id === c.id ? (answered.ok ? "ok" : "bad") : ""}`} onClick={() => pickFlag(c)}>
              <span>{c.flag}</span>
              {answered?.id === c.id && <small>{c.name}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
