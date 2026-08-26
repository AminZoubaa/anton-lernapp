"use client";

// 🎨 Malen: freies Zeichnen auf dem ganzen Bildschirm, 60 Sekunden.
// Stifte: Stift / Marker (breit, halbtransparent) / Radierer, 10 Farben, 3 Dicken.
// Am Ende wird NUR das Gemalte als Bild oder animiertes GIF gespeichert:
// Zuschnitt auf die Bounding-Box aller Striche (+ Strichdicke) plus 8 px Rand.
// So ist jedes Bild nur so groß wie nötig – kein weißer Riesen-Canvas.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { speak, stopSpeaking } from "@/lib/speech";
import { playPop, playFanfare, unlockAudio } from "@/lib/sfx";
import { enableWakeLock, disableWakeLock } from "@/lib/wakeLock";
import { confettiRain } from "@/lib/fx";
import { GIFEncoder, quantize, applyPalette } from "gifenc";

const COLORS = ["#1f2a44", "#ff4b4b", "#ff9600", "#ffdd57", "#58cc02", "#1cb0f6", "#4a6cf7", "#ce82ff", "#ff7fbf", "#8d5524"];
const SIZES = [4, 10, 22];
const TOOLS = { pen: "✏️ STIFT", marker: "🖍️ MARKER", eraser: "🧽 RADIERER" };
const SECONDS = 60;
const PAD = 8;

export default function Malen() {
  const router = useRouter();
  const [phase, setPhase] = useState("draw"); // draw | done
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(1);
  const [tool, setTool] = useState("pen");
  const [left, setLeft] = useState(SECONDS);
  const [preview, setPreview] = useState(null); // dataURL des Zuschnitts
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null), canvasRef = useRef(null), raf = useRef(0);
  const strokes = useRef([]); // { color, width, alpha, pts:[[x,y]] } in CSS-Pixeln
  const cur = useRef(null);
  const activePtr = useRef(null);
  const timer = useRef(null);
  const started = useRef(false);
  const dpr = useRef(1);

  useEffect(() => {
    unlockAudio(); enableWakeLock();
    speak("Mal, was du willst! Du hast eine Minute. Dann drück auf Fertig.");
    return () => { stopSpeaking(); disableWakeLock(); clearInterval(timer.current); cancelAnimationFrame(raf.current); };
  }, []);

  // Countdown startet mit dem ersten Strich
  function startTimer() {
    if (started.current) return; started.current = true;
    timer.current = setInterval(() => setLeft((l) => {
      if (l === 11) speak("Noch zehn Sekunden!");
      if (l <= 1) { clearInterval(timer.current); setTimeout(finish, 0); return 0; }
      return l - 1;
    }), 1000);
  }

  // ---------- Zeichnen ----------
  const drawStroke = (ctx, st) => {
    if (st.pts.length < 1) return;
    ctx.globalAlpha = st.alpha; ctx.strokeStyle = st.color; ctx.lineWidth = st.width;
    ctx.globalCompositeOperation = st.eraser ? "destination-out" : "source-over";
    ctx.beginPath(); ctx.moveTo(st.pts[0][0], st.pts[0][1]);
    if (st.pts.length === 1) ctx.lineTo(st.pts[0][0] + 0.1, st.pts[0][1]);
    for (let i = 1; i < st.pts.length; i++) ctx.lineTo(st.pts[i][0], st.pts[i][1]);
    ctx.stroke();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  };
  useEffect(() => {
    if (phase !== "draw") return;
    const canvas = canvasRef.current, box = boxRef.current, ctx = canvas.getContext("2d");
    const resize = () => {
      dpr.current = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = box.clientWidth * dpr.current; canvas.height = box.clientHeight * dpr.current;
    };
    resize(); window.addEventListener("resize", resize);
    const loop = () => {
      ctx.setTransform(dpr.current, 0, 0, dpr.current, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      strokes.current.forEach((st) => drawStroke(ctx, st));
      if (cur.current) drawStroke(ctx, cur.current);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener("resize", resize); };
  }, [phase]);

  const pos = (e) => { const b = boxRef.current.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  const down = (e) => {
    e.preventDefault(); if (phase !== "draw" || !e.isPrimary) return;
    if (cur.current && activePtr.current !== null && activePtr.current !== e.pointerId) finishStroke(); // hängender Strich
    activePtr.current = e.pointerId;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    startTimer();
    const w = tool === "marker" ? SIZES[size] * 2 : tool === "eraser" ? SIZES[size] * 2.5 : SIZES[size];
    cur.current = { color, width: w, alpha: tool === "marker" ? 0.45 : 1, eraser: tool === "eraser", pts: [pos(e)] };
  };
  const move = (e) => {
    e.preventDefault(); if (!cur.current || e.pointerId !== activePtr.current) return;
    const evs = e.nativeEvent?.getCoalescedEvents?.() || [];
    (evs.length ? evs : [e]).forEach((ev) => cur.current.pts.push(pos(ev)));
  };
  const finishStroke = () => { activePtr.current = null; if (!cur.current) return; strokes.current = [...strokes.current, cur.current]; cur.current = null; };
  const up = (e) => { e.preventDefault(); if (e.pointerId !== activePtr.current) return; finishStroke(); };
  const undo = () => { strokes.current = strokes.current.slice(0, -1); };
  const clear = () => { strokes.current = []; };

  // ---------- Zuschnitt: nur das Gemalte + 8 px Rand ----------
  function bbox() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    strokes.current.filter((s) => !s.eraser).forEach((s) => s.pts.forEach(([x, y]) => {
      const r = s.width / 2;
      x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r);
    }));
    if (!isFinite(x0)) return null;
    const box = boxRef.current.getBoundingClientRect();
    // nicht über den sichtbaren Bereich hinaus, aber mit Rand
    x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD); x1 = Math.min(box.width, x1 + PAD); y1 = Math.min(box.height, y1 + PAD);
    return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
  }
  // Rendert das Bild (oder die ersten n Striche davon) zugeschnitten auf ein Canvas
  function render(b, scale, upto = Infinity, ctx = null) {
    const c = ctx ? ctx.canvas : document.createElement("canvas");
    if (!ctx) { c.width = Math.round(b.w * scale); c.height = Math.round(b.h * scale); ctx = c.getContext("2d"); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.setTransform(scale, 0, 0, scale, -b.x * scale, -b.y * scale);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    strokes.current.slice(0, upto).forEach((st) => drawStroke(ctx, st));
    return c;
  }

  function finish() {
    clearInterval(timer.current);
    if (cur.current) { strokes.current = [...strokes.current, cur.current]; cur.current = null; }
    const b = bbox();
    if (!b) { speak("Da ist noch nichts gemalt!"); playPop(); return; }
    const c = render(b, 2);
    setPreview({ url: c.toDataURL("image/png"), w: c.width, h: c.height, box: b });
    setPhase("done");
    playFanfare(); confettiRain();
    speak("Fertig! Schau dir dein Bild an. Du kannst es als Bild oder als Film verschicken.");
  }

  async function share(blob, name) {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: "Mein Bild" }); } catch {} return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  }
  async function savePng() {
    const c = render(preview.box, 2);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    share(blob, "bild.png");
  }
  async function saveGif() {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 50));
    try {
      const b = preview.box;
      const scale = Math.min(1, 480 / Math.max(b.w, b.h)); // GIF höchstens 480 px
      const c = document.createElement("canvas"); c.width = Math.round(b.w * scale); c.height = Math.round(b.h * scale);
      const ctx = c.getContext("2d");
      const gif = GIFEncoder();
      const frame = (delay) => { const { data } = ctx.getImageData(0, 0, c.width, c.height); const palette = quantize(data, 32); gif.writeFrame(applyPalette(data, palette), c.width, c.height, { palette, delay }); };
      // Striche nacheinander wachsen lassen: ein Frame je ~8 Punkte, max. ~150 Frames insgesamt
      const total = strokes.current.reduce((a, s) => a + s.pts.length, 0);
      const stepPts = Math.max(8, Math.ceil(total / 150));
      render(b, scale, 0, ctx); frame(200);
      for (let si = 0; si < strokes.current.length; si++) {
        const st = strokes.current[si];
        for (let n = stepPts; n < st.pts.length; n += stepPts) {
          render(b, scale, si, ctx);
          ctx.setTransform(scale, 0, 0, scale, -b.x * scale, -b.y * scale);
          drawStroke(ctx, { ...st, pts: st.pts.slice(0, n) });
          frame(25);
        }
        render(b, scale, si + 1, ctx); frame(60);
      }
      frame(1200);
      gif.finish();
      share(new Blob([gif.bytes()], { type: "image/gif" }), "bild.gif");
    } finally { setBusy(false); }
  }
  function again() { strokes.current = []; cur.current = null; started.current = false; setLeft(SECONDS); setPreview(null); setPhase("draw"); speak("Neues Blatt! Mal los!"); }

  if (phase === "done")
    return (
      <div className="race-shell write-shell">
        <div className="write-replay">
          <div className="memory-won-title">🎨 Dein Bild</div>
          <img src={preview.url} alt="Dein Bild" className="malen-preview" />
          <div style={{ color: "#666", fontWeight: 700 }}>{preview.w} × {preview.h} Pixel – nur das Gemalte, ohne leeren Rand</div>
          <div className="write-bar">
            <button className="btn btn-blue" onClick={savePng}>🖼️ ALS BILD</button>
            <button className="btn btn-blue" onClick={saveGif} disabled={busy}>{busy ? "⏳ …" : "🎬 ALS GIF (ANIMIERT)"}</button>
            <button className="btn" onClick={again}>NEUES BILD 🔁</button>
            <button className="btn btn-blue" onClick={() => router.push("/")}>KARTE 🗺️</button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="race-shell write-shell">
      <div className="race-hud malen-hud" style={{ color: "#1f2a44" }}>
        <button className="close-btn" aria-label="Beenden" onClick={() => { stopSpeaking(); router.push("/"); }}>✕</button>
        <span className={`malen-timer ${left <= 10 ? "warn" : ""}`}>⏱️ {left}</span>
        <div className="malen-colors">{COLORS.map((c) => <button key={c} className={`malen-color ${color === c && tool !== "eraser" ? "on" : ""}`} style={{ background: c }} onClick={() => { setColor(c); if (tool === "eraser") setTool("pen"); }} aria-label="Farbe" />)}</div>
        <div className="malen-sizes">{SIZES.map((s, i) => <button key={s} className={`malen-size ${size === i ? "on" : ""}`} onClick={() => setSize(i)}><span style={{ width: 6 + i * 7, height: 6 + i * 7 }} /></button>)}</div>
      </div>
      <div className="race-area write-area malen-area" ref={boxRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <canvas ref={canvasRef} className="game-canvas" />
      </div>
      <button className="btn write-done" onClick={finish}>✅ FERTIG</button>
      <div className="write-bar">
        {Object.entries(TOOLS).map(([k, l]) => <button key={k} className={`btn ${tool === k ? "" : "btn-blue"}`} onClick={() => setTool(k)}>{l}</button>)}
        <button className="btn btn-blue" onClick={undo}>↩️ ZURÜCK</button>
        <button className="btn btn-blue" onClick={clear}>🗑️ ALLES WEG</button>
      </div>
    </div>
  );
}
