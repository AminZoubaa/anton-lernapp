"use client";

// Übungsblatt: ein Zeichen 9× (3 Reihen à 3) wie auf einem Blatt Papier.
// Gedacht für den Stift: mit "NUR STIFT" wird die aufliegende Hand ignoriert.
// Jede Zelle wird einzeln bewertet (Maskenvergleich, keine Reihenfolge),
// Punkte gibt es pro richtig geschriebenem Zeichen.
import { useEffect, useRef, useState } from "react";
import { STROKES, scoreGlyph } from "@/lib/strokes";
import { speak, stopSpeaking } from "@/lib/speech";
import { playCorrect, playWrong, playFanfare, playPop } from "@/lib/sfx";
import { addPoints } from "@/lib/progress";
import { confettiRain } from "@/lib/fx";

const COLS = 3, ROWS = 3, N = COLS * ROWS;

export default function WriteSheet({ glyph, onNext, onMenu }) {
  const strokes = STROKES[glyph] || [];
  const boxRef = useRef(null), canvasRef = useRef(null), raf = useRef(0);
  const cells = useRef(Array.from({ length: N }, () => [])); // Striche je Zelle (0–100 in der Zelle)
  const cur = useRef(null); // { cell, pts }
  const results = useRef(null); // Bewertung je Zelle
  const geo = useRef({ ox: 0, oy: 0, cw: 0, W: 0, H: 0 });
  const [penOnly, setPenOnly] = useState(() => { try { return localStorage.getItem("write-pen-only") === "1"; } catch { return false; } });
  const [done, setDone] = useState(null); // { ok, total }
  const penRef = useRef(penOnly);
  penRef.current = penOnly;

  useEffect(() => {
    speak(`Schreib das ${glyph} neunmal, in jedes Kästchen eins. Dann drück auf den grünen Knopf.`);
    return () => stopSpeaking();
  }, [glyph]);

  // ---------- Zeichnen ----------
  useEffect(() => {
    const canvas = canvasRef.current, box = boxRef.current, ctx = canvas.getContext("2d");
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = box.clientWidth, H = box.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cw = Math.min((W - 16) / COLS, (H - 16) / ROWS);
      geo.current = { W, H, cw, ox: (W - cw * COLS) / 2, oy: (H - cw * ROWS) / 2 };
    };
    resize(); window.addEventListener("resize", resize);
    const loop = () => {
      const { W, H, cw, ox, oy } = geo.current;
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (let i = 0; i < N; i++) {
        const cx = ox + (i % COLS) * cw, cy = oy + Math.floor(i / COLS) * cw;
        const P = ([x, y]) => [cx + (x / 100) * cw, cy + (y / 100) * cw];
        const path = (pts) => { ctx.beginPath(); pts.forEach((p, k) => { const [x, y] = P(p); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); };
        const r = results.current?.[i];
        ctx.fillStyle = r ? (r.stars ? "#eafbe0" : "#ffe9e9") : "#fffdf5";
        ctx.fillRect(cx + 2, cy + 2, cw - 4, cw - 4);
        ctx.strokeStyle = "#d9d2b8"; ctx.lineWidth = 1.5;
        ctx.strokeRect(cx + 2, cy + 2, cw - 4, cw - 4);
        [0.1, 0.5, 0.9].forEach((k) => { ctx.beginPath(); ctx.moveTo(cx + 4, cy + cw * k); ctx.lineTo(cx + cw - 4, cy + cw * k); ctx.stroke(); });
        // Schablone (in der ersten Zelle kräftiger, dann immer blasser – wie ein Schreibheft)
        ctx.strokeStyle = i === 0 ? "#cfcfcf" : i < 3 ? "#dedede" : "#ececec"; ctx.lineWidth = cw * 0.1;
        strokes.forEach((st) => { path(st); ctx.stroke(); });
        // Kinderspur
        ctx.strokeStyle = r ? (r.stars ? "#58cc02" : "#ff4b4b") : "#ff9600"; ctx.lineWidth = cw * 0.065;
        cells.current[i].forEach((st) => { if (st.length > 1) { path(st); ctx.stroke(); } });
        if (cur.current && cur.current.cell === i && cur.current.pts.length > 1) { path(cur.current.pts); ctx.stroke(); }
        if (r) {
          ctx.font = `800 ${cw * 0.14}px Andika, Arial, sans-serif`; ctx.textAlign = "right"; ctx.textBaseline = "top";
          ctx.fillStyle = r.stars ? "#3a8a00" : "#c62828";
          ctx.fillText(r.stars ? "⭐".repeat(r.stars) : "✗", cx + cw - 6, cy + 6);
        }
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener("resize", resize); };
  }, [strokes]);

  const locate = (e) => {
    const b = boxRef.current.getBoundingClientRect();
    const { cw, ox, oy } = geo.current;
    const x = e.clientX - b.left - ox, y = e.clientY - b.top - oy;
    const c = Math.floor(x / cw), r = Math.floor(y / cw);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
    return { cell: r * COLS + c, p: [((x - c * cw) / cw) * 100, ((y - r * cw) / cw) * 100] };
  };
  const allowed = (e) => !(penRef.current && e.pointerType === "touch");
  const down = (e) => {
    e.preventDefault();
    if (done || !allowed(e)) return;
    const l = locate(e); if (!l) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    cur.current = { cell: l.cell, pts: [l.p] };
  };
  const move = (e) => {
    e.preventDefault();
    if (!cur.current || !allowed(e)) return;
    const { cw, ox, oy } = geo.current, b = boxRef.current.getBoundingClientRect();
    const c = cur.current.cell, x = e.clientX - b.left - ox - (c % COLS) * cw, y = e.clientY - b.top - oy - Math.floor(c / COLS) * cw;
    cur.current.pts.push([(x / cw) * 100, (y / cw) * 100]); // bleibt der Start-Zelle zugeordnet
  };
  const up = (e) => {
    e.preventDefault();
    if (!cur.current) return;
    if (cur.current.pts.length > 1) cells.current[cur.current.cell] = [...cells.current[cur.current.cell], cur.current.pts];
    cur.current = null;
  };

  function judge() {
    if (done) return;
    const res = cells.current.map((st) => (st.length ? scoreGlyph(st, strokes) : null));
    results.current = res;
    const written = res.filter(Boolean), ok = written.filter((r) => r.stars > 0);
    const pts = written.reduce((a, r) => a + r.stars * 3, 0);
    if (pts) addPoints(pts);
    setDone({ ok: ok.length, total: written.length, pts });
    if (!written.length) { playPop(); speak("Da ist noch nichts geschrieben."); setDone(null); results.current = null; return; }
    if (ok.length === written.length && written.length >= N) { playFanfare(); confettiRain(); speak(`Alle neun richtig! ${pts} Punkte!`); }
    else if (ok.length >= written.length / 2) { playCorrect(); speak(`${ok.length} von ${written.length} richtig. ${pts} Punkte! Die roten kannst du beim nächsten Mal besser.`); }
    else { playWrong(); speak(`${ok.length} von ${written.length} richtig. Schau dir die roten Kästchen an und versuch es nochmal.`); }
  }
  function clearAll() { cells.current = Array.from({ length: N }, () => []); results.current = null; cur.current = null; setDone(null); }
  function undo() { if (done) return; for (let i = N - 1; i >= 0; i--) { if (cells.current[i].length) { cells.current[i] = cells.current[i].slice(0, -1); return; } } }
  function togglePen() { const v = !penOnly; setPenOnly(v); try { localStorage.setItem("write-pen-only", v ? "1" : "0"); } catch {} speak(v ? "Nur der Stift schreibt jetzt. Die Hand darf auf dem Bildschirm liegen." : "Finger und Stift schreiben."); }

  return (
    <div className="race-shell write-shell">
      <div className="race-hud" style={{ color: "#1f2a44" }}>
        <button className="close-btn" aria-label="Beenden" onClick={() => { stopSpeaking(); onMenu(); }}>✕</button>
        <div className="write-word"><span className="now">{glyph}</span><span style={{ fontSize: "1rem", color: "#666" }}>Übungsblatt · 9×</span></div>
        <span style={{ flex: 1 }} />
        <button className={`btn ${penOnly ? "" : "btn-blue"}`} style={{ minHeight: 0, padding: "6px 10px", fontSize: "0.85rem" }} onClick={togglePen}>{penOnly ? "🖊️ NUR STIFT: AN" : "🖐️ FINGER + STIFT"}</button>
      </div>
      <div className="race-area write-area" ref={boxRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onTouchMove={(e) => e.preventDefault()}>
        <canvas ref={canvasRef} className="game-canvas" />
        {done && <div className={`write-verdict ${done.ok >= done.total / 2 ? "good" : "bad"}`}>{done.ok} von {done.total} richtig · +{done.pts} Punkte</div>}
      </div>
      {!done ? (
        <button className="btn write-done" onClick={judge}>✅ FERTIG</button>
      ) : (
        <button className="btn write-done" onClick={() => onNext()}>NÄCHSTER BUCHSTABE ➡️</button>
      )}
      <div className="write-bar">
        <button className="btn btn-blue" onClick={undo}>↩️ STRICH ZURÜCK</button>
        <button className="btn btn-blue" onClick={clearAll}>🧽 NEUES BLATT</button>
        <button className="btn btn-blue" onClick={() => speak(`Das ist das ${glyph}!`)}>🔊 {glyph}</button>
      </div>
    </div>
  );
}
