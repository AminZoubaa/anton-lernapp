"use client";

// Schreiben lernen – Vollbild, Finger/Stift/Maus.
// • Tutorial: alle Striche des Zeichens werden EINMAL nacheinander animiert
//   (nummerierte Startpunkte, Pfeil = Richtung). Sobald das Kind zu schreiben
//   beginnt, verschwindet die Animation. Danach kommt sie nur noch auf Knopf.
// • Freies Schreiben: beliebig viele Striche, auch alles in einem Zug.
//   Bewertet wird nach kurzer Pause oder auf ✓: Bahn-Abdeckung, Genauigkeit,
//   Startpunkt und REIHENFOLGE entlang der Bahn.
// • Wörter: Buchstabe für Buchstabe (mit Bild), am Ende Replay des ganzen
//   Wortes als Animation + Speichern als Bild.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STROKES, WRITE_WORDS, WORD_EMOJI, samplePath, scoreGlyph } from "@/lib/strokes";
import { speak, speakSeq, stopSpeaking } from "@/lib/speech";
import { playPop, playCorrect, playWrong, playFanfare, unlockAudio } from "@/lib/sfx";
import { enableWakeLock, disableWakeLock } from "@/lib/wakeLock";
import { loadName } from "@/lib/certificate";
import { addPoints } from "@/lib/progress";
import { confettiRain } from "@/lib/fx";
import { pickFrom, PRAISE } from "@/lib/phrases";
import { GIFEncoder, quantize, applyPalette } from "gifenc";

const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const DIGITS = [..."0123456789"];
const PROGRESS_KEY = "anton-lernapp-writing-v1";
const SEEN_KEY = "anton-lernapp-writing-tutorial-v1";
const IDLE_JUDGE_MS = 1300;

const loadJson = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); } catch { return d; } };

export default function Schreiben() {
  const router = useRouter();
  const [phase, setPhase] = useState("menu"); // menu | write | replay
  const [queue, setQueue] = useState([]);
  const [qi, setQi] = useState(0);
  const [tutorial, setTutorial] = useState(false); // Animation läuft
  const [verdict, setVerdict] = useState(null);
  const [best, setBest] = useState({});
  const canvasRef = useRef(null);
  const boxRef = useRef(null);
  const replayRef = useRef(null);
  const strokesDrawn = useRef([]); // fertige Striche des aktuellen Zeichens
  const cur = useRef([]); // aktueller Strich
  const wordDrawings = useRef([]); // pro Buchstabe: Striche (für Replay)
  const raf = useRef(0);
  const demoT = useRef(0);
  const drawing = useRef(false);
  const judgeTimer = useRef(null);
  const judged = useRef(false);
  const glyph = queue[qi];
  const strokes = glyph ? STROKES[glyph] || [] : [];
  const wordEmoji = queue.length > 1 && queue.length <= 8 ? WORD_EMOJI[queue.join("")] || "⭐" : null;

  useEffect(() => {
    setBest(loadJson(PROGRESS_KEY, {}));
    return () => { cancelAnimationFrame(raf.current); stopSpeaking(); disableWakeLock(); clearTimeout(judgeTimer.current); };
  }, []);

  function beginGlyph(chars, i, withTutorial) {
    strokesDrawn.current = [];
    cur.current = [];
    judged.current = false;
    setVerdict(null);
    demoT.current = 0;
    setTutorial(withTutorial);
  }

  function start(chars) {
    unlockAudio(); enableWakeLock();
    const seen = loadJson(SEEN_KEY, {});
    setQueue(chars); setQi(0);
    wordDrawings.current = [];
    setPhase("write");
    const first = chars[0];
    const tut = !seen[first];
    beginGlyph(chars, 0, tut);
    const word = chars.join("");
    speakSeq([
      { text: chars.length > 8 ? `Wir üben alle Zeichen! Zuerst das ${first}.` : chars.length > 1 ? `Wir schreiben ${word}! Zuerst das ${first}.` : `Wir schreiben das ${first}!` },
      { pause: 250 },
      { text: tut ? "Schau einmal zu, dann bist du dran." : "Schreib los! Hilfe gibt es mit dem Augen-Knopf." },
    ]);
  }

  // ---------- Canvas ----------
  useEffect(() => {
    if (phase !== "write") return;
    const canvas = canvasRef.current, box = boxRef.current, ctx = canvas.getContext("2d");
    let W = 0, H = 0, S = 0, ox = 0, oy = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = box.clientWidth; H = box.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      S = Math.min(W, H) * 0.88; ox = (W - S) / 2; oy = (H - S) / 2;
    };
    resize();
    window.addEventListener("resize", resize);
    const P = ([x, y]) => [ox + (x / 100) * S, oy + (y / 100) * S];
    const path = (pts) => { ctx.beginPath(); pts.forEach((p, i) => { const [x, y] = P(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); };
    let last = performance.now();
    // Tutorial-Zeitplan: jeder Strich 1.4 s, dazwischen 0.4 s
    const per = 1.8;
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#fffdf5"; ctx.fillRect(ox, oy, S, S);
      ctx.strokeStyle = "#e6dfc8"; ctx.lineWidth = 2;
      [0.1, 0.5, 0.9].forEach((k) => { ctx.beginPath(); ctx.moveTo(ox, oy + S * k); ctx.lineTo(ox + S, oy + S * k); ctx.stroke(); });
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      // Schablone + nummerierte Startpunkte (immer sichtbar, dezent)
      ctx.strokeStyle = "#e3e3e3"; ctx.lineWidth = S * 0.11;
      strokes.forEach((st) => { path(st); ctx.stroke(); });
      strokes.forEach((st, i) => {
        const [sx, sy] = P(st[0]);
        ctx.fillStyle = i === 0 ? "#58cc02" : "#ff9600";
        ctx.beginPath(); ctx.arc(sx, sy, S * 0.045, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = `800 ${S * 0.05}px Andika, Arial, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), sx, sy + 1);
      });
      // Tutorial-Animation: alle Striche nacheinander
      if (tutorial) {
        demoT.current += dt;
        const t = demoT.current;
        strokes.forEach((st, i) => {
          const local = t - i * per;
          if (local <= 0) return;
          const samples = samplePath(st, 1);
          const k = Math.min(1, local / (per - 0.4));
          const n = Math.max(2, Math.floor(samples.length * k));
          ctx.strokeStyle = "#1cb0f6"; ctx.lineWidth = S * 0.075;
          path(samples.slice(0, n)); ctx.stroke();
          if (k < 1) {
            const [hx, hy] = P(samples[n - 1]);
            const [px, py] = P(samples[Math.max(0, n - 6)]);
            const ang = Math.atan2(hy - py, hx - px);
            ctx.fillStyle = "#ff9600"; ctx.beginPath(); ctx.arc(hx, hy, S * 0.05, 0, Math.PI * 2); ctx.fill();
            ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang); ctx.fillStyle = "#fff";
            ctx.beginPath(); ctx.moveTo(S * 0.03, 0); ctx.lineTo(-S * 0.015, -S * 0.02); ctx.lineTo(-S * 0.015, S * 0.02); ctx.fill(); ctx.restore();
          }
        });
        if (t > strokes.length * per + 0.6) {
          setTutorial(false);
          const seen = loadJson(SEEN_KEY, {}); seen[glyph] = true; localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
          speak("Jetzt du! Starte beim grünen Punkt.");
        }
      }
      // Kinderspur
      const bad = verdict && verdict.score < 0.65;
      ctx.strokeStyle = verdict ? (bad ? "#ff4b4b" : "#58cc02") : "#ff9600";
      ctx.lineWidth = S * 0.07;
      strokesDrawn.current.forEach((st) => { if (st.length > 1) { path(st); ctx.stroke(); } });
      if (cur.current.length > 1) { path(cur.current); ctx.stroke(); }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener("resize", resize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qi, tutorial, verdict, queue]);

  function toBox(e) {
    const b = boxRef.current.getBoundingClientRect();
    const S = Math.min(b.width, b.height) * 0.88, ox = (b.width - S) / 2, oy = (b.height - S) / 2;
    return [((e.clientX - b.left - ox) / S) * 100, ((e.clientY - b.top - oy) / S) * 100];
  }
  function down(e) {
    e.preventDefault();
    if (judged.current) return;
    if (tutorial) { setTutorial(false); demoT.current = 0; stopSpeaking(); } // Platz frei machen
    clearTimeout(judgeTimer.current);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawing.current = true; cur.current = [toBox(e)];
  }
  function move(e) { e.preventDefault(); if (drawing.current) cur.current.push(toBox(e)); }
  function up(e) {
    e.preventDefault();
    if (!drawing.current) return;
    drawing.current = false;
    if (cur.current.length > 1) strokesDrawn.current = [...strokesDrawn.current, cur.current];
    cur.current = [];
    // Nach kurzer Pause automatisch bewerten – oder sofort über ✓
    clearTimeout(judgeTimer.current);
    judgeTimer.current = setTimeout(judge, IDLE_JUDGE_MS);
  }

  function judge() {
    clearTimeout(judgeTimer.current);
    if (judged.current || !strokesDrawn.current.length) return;
    const r = scoreGlyph(strokesDrawn.current, strokes);
    judged.current = true;
    if (r.pass && r.score >= 0.88 && r.minCov >= 0.85 && r.precision >= 0.8) {
      playCorrect(); setVerdict({ score: 1, text: "Perfekt! ⭐⭐⭐" });
      speak(`Perfekt! ${pickFrom(PRAISE)}`);
      setTimeout(nextGlyph, 1200);
    } else if (r.pass) {
      playPop(); setVerdict({ score: 0.7, text: "Gut gemacht! ⭐⭐" });
      speak("Gut gemacht!");
      setTimeout(nextGlyph, 1200);
    } else {
      playWrong();
      setVerdict({ score: 0, text: `Nochmal! ${r.why}` });
      speak(`Versuch es noch einmal. ${r.why} Mit dem Augen-Knopf bekommst du Hilfe.`);
      setTimeout(() => { strokesDrawn.current = []; judged.current = false; setVerdict(null); }, 1800);
    }
  }

  function nextGlyph() {
    wordDrawings.current = [...wordDrawings.current, { glyph, strokes: strokesDrawn.current }];
    const b = loadJson(PROGRESS_KEY, {}); b[glyph] = (b[glyph] || 0) + 1; localStorage.setItem(PROGRESS_KEY, JSON.stringify(b)); setBest(b);
    addPoints(10);
    if (qi + 1 < queue.length) {
      const next = queue[qi + 1];
      const seen = loadJson(SEEN_KEY, {});
      setQi(qi + 1);
      beginGlyph(queue, qi + 1, !seen[next]);
      speak(`${glyph}! Jetzt das ${next}.`);
    } else {
      playFanfare(); confettiRain();
      if (queue.length > 8) { speak("Alles geschafft! Und nochmal von vorn!"); setTimeout(() => start(queue), 1500); }
      else if (queue.length > 1) { setPhase("replay"); speak(`${queue.join("")}! Du hast ein ganzes Wort geschrieben! Schau, wie es aussieht.`); }
      else { speak(`${glyph}! Du kannst es schreiben! Weiter mit dem nächsten?`); setVerdict({ score: 1, text: `🎉 ${glyph} geschafft!` }); setPhase("next"); }
    }
  }

  function showTutorial() { strokesDrawn.current = []; cur.current = []; judged.current = false; setVerdict(null); demoT.current = 0; setTutorial(true); speak("Schau zu!"); }
  function clearAll() { clearTimeout(judgeTimer.current); strokesDrawn.current = []; cur.current = []; judged.current = false; setVerdict(null); speak("Alles weg. Nochmal!"); }
  function undoStroke() { clearTimeout(judgeTimer.current); strokesDrawn.current = strokesDrawn.current.slice(0, -1); judged.current = false; setVerdict(null); }

  // ---------- Wort-Replay: alle Buchstaben nebeneinander, nacheinander animiert ----------
  useEffect(() => {
    if (phase !== "replay") return;
    const canvas = replayRef.current; const ctx = canvas.getContext("2d");
    const n = wordDrawings.current.length;
    const cell = 300, pad = 30;
    canvas.width = n * cell + pad * 2; canvas.height = cell + pad * 2;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 22; ctx.strokeStyle = "#1f2a44";
    // alle Punkte in Reihenfolge, mit Buchstaben-Versatz
    const seq = [];
    wordDrawings.current.forEach((d, li) => d.strokes.forEach((st) => seq.push(st.map(([x, y]) => [pad + li * cell + (x / 100) * cell, pad + (y / 100) * cell]))));
    let si = 0, pi = 1;
    const step = () => {
      if (si >= seq.length) return;
      const st = seq[si];
      ctx.beginPath(); ctx.moveTo(st[pi - 1][0], st[pi - 1][1]); ctx.lineTo(st[pi][0], st[pi][1]); ctx.stroke();
      pi += 2;
      if (pi >= st.length) { si++; pi = 1; raf.current = setTimeout(step, 250); } else raf.current = requestAnimationFrame(step);
    };
    step();
    return () => { cancelAnimationFrame(raf.current); clearTimeout(raf.current); };
  }, [phase]);

  // Animiertes GIF der Wort-Animation (Strich für Strich), zum Teilen
  const [gifBusy, setGifBusy] = useState(false);
  async function saveGif() {
    if (gifBusy) return;
    setGifBusy(true);
    speak("Ich baue das Filmchen …");
    await new Promise((r) => setTimeout(r, 50));
    try {
      const n = wordDrawings.current.length;
      const cell = 160, pad = 16;
      const W = n * cell + pad * 2, H = cell + pad * 2;
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const ctx = c.getContext("2d");
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 12; ctx.strokeStyle = "#1f2a44";
      const seq = [];
      wordDrawings.current.forEach((dd, li) => dd.strokes.forEach((st) => seq.push(st.map(([x, y]) => [pad + li * cell + (x / 100) * cell, pad + (y / 100) * cell]))));
      const gif = GIFEncoder();
      const frame = (delay) => {
        const { data } = ctx.getImageData(0, 0, W, H);
        const palette = quantize(data, 16);
        const index = applyPalette(data, palette);
        gif.writeFrame(index, W, H, { palette, delay });
      };
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      frame(300);
      for (const st of seq) {
        for (let i = 1; i < st.length; i += 3) {
          ctx.beginPath(); ctx.moveTo(st[Math.max(0, i - 3)][0], st[Math.max(0, i - 3)][1]); ctx.lineTo(st[i][0], st[i][1]); ctx.stroke();
          frame(40);
        }
        ctx.beginPath(); ctx.moveTo(st[st.length - 2][0], st[st.length - 2][1]); ctx.lineTo(st[st.length - 1][0], st[st.length - 1][1]); ctx.stroke();
        frame(250);
      }
      frame(1500);
      gif.finish();
      const blob = new Blob([gif.bytes()], { type: "image/gif" });
      const file = new File([blob], `${queue.join("")}.gif`, { type: "image/gif" });
      if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: queue.join("") }); } catch {} }
      else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); }
    } finally {
      setGifBusy(false);
    }
  }

  async function saveWord() {
    const canvas = replayRef.current;
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    const file = new File([blob], `${queue.join("")}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: queue.join("") }); } catch {} return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  }

  if (phase === "menu") {
    const name = (loadName() || "").toUpperCase().replace(/[^A-Z]/g, "");
    const words = [...(name.length >= 2 ? [name] : []), ...WRITE_WORDS];
    return (
      <main className="shell write-shell-menu">
        <header className="home-header">
          <div className="home-title">✏️ Schreiben</div>
          <div className="home-sub">Tippe einen Buchstaben, eine Zahl oder ein Wort</div>
        </header>
        <section className="eltern-box"><h3>Buchstaben <button className="btn" style={{ minHeight: 0, padding: "6px 12px", fontSize: "0.9rem", marginLeft: 8 }} onClick={() => start(LETTERS)}>🔤 ALLE A–Z ÜBEN</button></h3>
          <div className="write-grid">{LETTERS.map((c) => <button key={c} className={`write-tile ${best[c] ? "done" : ""}`} onClick={() => start([c])}>{c}{best[c] > 0 && <span className="write-check">✓</span>}</button>)}</div>
        </section>
        <section className="eltern-box"><h3>Zahlen <button className="btn" style={{ minHeight: 0, padding: "6px 12px", fontSize: "0.9rem", marginLeft: 8 }} onClick={() => start(DIGITS)}>🔢 ALLE 0–9 ÜBEN</button></h3>
          <div className="write-grid">{DIGITS.map((c) => <button key={c} className={`write-tile ${best[c] ? "done" : ""}`} onClick={() => start([c])}>{c}</button>)}</div>
        </section>
        <section className="eltern-box"><h3>Wörter</h3>
          <div className="write-words">{words.map((w) => <button key={w} className="btn btn-blue" onClick={() => start([...w])}><span>{w === name ? "⭐" : WORD_EMOJI[w] || "✏️"}</span>{w}</button>)}</div>
        </section>
        <button className="btn btn-blue" style={{ margin: "10px auto 30px", display: "block" }} onClick={() => router.push("/")}>⬅️ ZURÜCK</button>
      </main>
    );
  }

  if (phase === "replay")
    return (
      <div className="race-shell write-shell">
        <div className="write-replay">
          <div className="memory-won-title">🎉 {wordEmoji} {queue.join("")}</div>
          <canvas ref={replayRef} />
          <div className="write-bar">
            <button className="btn btn-blue" onClick={() => setPhase((p) => (setTimeout(() => setPhase("replay"), 0), "replay-reset"))}>▶️ NOCHMAL ZEIGEN</button>
            <button className="btn btn-blue" onClick={saveWord}>🖼️ ALS BILD</button>
            <button className="btn btn-blue" onClick={saveGif} disabled={gifBusy}>{gifBusy ? "⏳ …" : "🎬 ALS GIF (ANIMIERT)"}</button>
            <button className="btn" onClick={() => setPhase("menu")}>WEITER ✅</button>
          </div>
        </div>
      </div>
    );
  if (phase === "replay-reset") return <div className="race-shell write-shell" />;

  if (phase === "next") {
    const list = DIGITS.includes(glyph) ? DIGITS : LETTERS;
    const nxt = list[(list.indexOf(glyph) + 1) % list.length];
    return (
      <div className="race-shell write-shell">
        <div className="write-replay">
          <div className="complete-emoji" style={{ fontSize: "5rem" }}>🎉</div>
          <div className="memory-won-title">{glyph} geschafft!</div>
          <div className="write-bar">
            <button className="btn" onClick={() => start([nxt])}>NÄCHSTER: {nxt} ➡️</button>
            <button className="btn btn-blue" onClick={() => start([glyph])}>NOCHMAL {glyph} 🔁</button>
            <button className="btn btn-blue" onClick={() => setPhase("menu")}>MENÜ</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="race-shell write-shell">
      <div className="race-hud" style={{ color: "#1f2a44" }}>
        <button className="close-btn" aria-label="Beenden" onClick={() => { stopSpeaking(); setPhase("menu"); }}>✕</button>
        {wordEmoji && <span style={{ fontSize: "2rem" }}>{wordEmoji}</span>}
        {queue.length > 8 ? (
          <div className="write-word"><span className="now">{glyph}</span><span style={{ fontSize: "1rem", color: "#666" }}>{qi + 1}/{queue.length}</span></div>
        ) : (
          <div className="write-word">{queue.map((c, i) => <span key={i} className={i < qi ? "ok" : i === qi ? "now" : ""}>{c}</span>)}</div>
        )}
        <span style={{ flex: 1 }} />
        <span className="write-step">{strokes.length} {strokes.length === 1 ? "Strich" : "Striche"}</span>
      </div>
      <div className="race-area write-area" ref={boxRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onTouchMove={(e) => e.preventDefault()}>
        <canvas ref={canvasRef} className="game-canvas" />
        {tutorial && <div className="write-hint">👀 Schau zu … (tippe, um selbst zu schreiben)</div>}
        {!tutorial && !verdict && <div className="write-hint go">✏️ Schreib das {glyph} – Start beim grünen Punkt 1</div>}
        {verdict && <div className={`write-verdict ${verdict.score >= 0.65 ? "good" : "bad"}`}>{verdict.text}</div>}
      </div>
      <div className="write-bar">
        <button className="btn btn-blue" onClick={showTutorial}>👀 HILFE</button>
        <button className="btn btn-blue" onClick={undoStroke}>↩️ STRICH ZURÜCK</button>
        <button className="btn btn-blue" onClick={clearAll}>🧽 ALLES WEG</button>
        <button className="btn" onClick={judge}>✅ FERTIG</button>
        <button className="btn btn-blue" onClick={() => speak(`Das ist das ${glyph}!`)}>🔊 {glyph}</button>
      </div>
    </div>
  );
}
