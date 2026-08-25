"use client";

// Schreiben lernen – Vollbild, Finger oder Stift.
// Ablauf pro Zeichen: 1) Vorführung (Punkt läuft die Bahn entlang, Pfeil zeigt
// Richtung, Startpunkt nummeriert) → 2) Kind zieht den Strich nach → 3) Bewertung
// (wie viel der Bahn getroffen, wie viel daneben) → Lob / Nochmal → nächster Strich.
// Wörter = Buchstabe für Buchstabe. Scrollen/Zoomen ist im Schreibbereich gesperrt.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STROKES, WRITE_WORDS, samplePath, scoreStroke } from "@/lib/strokes";
import { speak, speakSeq, stopSpeaking } from "@/lib/speech";
import { playPop, playCorrect, playWrong, playFanfare, unlockAudio } from "@/lib/sfx";
import { enableWakeLock, disableWakeLock } from "@/lib/wakeLock";
import { loadName } from "@/lib/certificate";
import { addPoints } from "@/lib/progress";
import { confettiRain } from "@/lib/fx";
import { pickFrom, PRAISE } from "@/lib/phrases";

const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const DIGITS = [..."0123456789"];
const PROGRESS_KEY = "anton-lernapp-writing-v1";

function loadWriting() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function Schreiben() {
  const router = useRouter();
  const [phase, setPhase] = useState("menu"); // menu | write
  const [queue, setQueue] = useState([]); // Zeichen nacheinander (Wort)
  const [qi, setQi] = useState(0); // Index im Wort
  const [stroke, setStroke] = useState(0); // aktueller Strich
  const [mode, setMode] = useState("demo"); // demo | draw | judge
  const [verdict, setVerdict] = useState(null); // {score, text}
  const [best, setBest] = useState({});
  const canvasRef = useRef(null);
  const boxRef = useRef(null);
  const drawn = useRef([]); // Punkte des aktuellen Strichs (0..100)
  const done = useRef([]); // fertig gezeichnete Striche (Punkte)
  const raf = useRef(0);
  const demoT = useRef(0);
  const drawing = useRef(false);
  const glyph = queue[qi];
  const strokes = glyph ? STROKES[glyph] || [] : [];

  useEffect(() => {
    setBest(loadWriting());
    return () => {
      cancelAnimationFrame(raf.current);
      stopSpeaking();
      disableWakeLock();
    };
  }, []);

  function start(chars) {
    unlockAudio();
    enableWakeLock();
    setQueue(chars);
    setQi(0);
    setStroke(0);
    done.current = [];
    setVerdict(null);
    setMode("demo");
    setPhase("write");
    const first = chars[0];
    speakSeq([
      { text: chars.length > 1 ? `Wir schreiben ${chars.join("")}! Zuerst das ${first}.` : `Wir schreiben das ${first}!` },
      { pause: 300 },
      { text: "Schau zu, wie der Stift läuft." },
    ]);
  }

  // ---------- Zeichnen (Canvas) ----------
  useEffect(() => {
    if (phase !== "write") return;
    const canvas = canvasRef.current;
    const box = boxRef.current;
    const ctx = canvas.getContext("2d");
    let W = 0;
    let H = 0;
    let S = 0; // Kastenmaß
    let ox = 0;
    let oy = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = box.clientWidth;
      H = box.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      S = Math.min(W, H) * 0.86;
      ox = (W - S) / 2;
      oy = (H - S) / 2;
    };
    resize();
    window.addEventListener("resize", resize);
    const P = ([x, y]) => [ox + (x / 100) * S, oy + (y / 100) * S];
    const path = (pts) => {
      ctx.beginPath();
      pts.forEach((p, i) => {
        const [x, y] = P(p);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
    };
    demoT.current = 0;
    let last = performance.now();

    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, W, H);
      // Kasten mit Linien
      ctx.fillStyle = "#fffdf5";
      ctx.fillRect(ox, oy, S, S);
      ctx.strokeStyle = "#e6dfc8";
      ctx.lineWidth = 2;
      [0.1, 0.5, 0.9].forEach((k) => {
        ctx.beginPath();
        ctx.moveTo(ox, oy + S * k);
        ctx.lineTo(ox + S, oy + S * k);
        ctx.stroke();
      });
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // Ganzer Buchstabe hellgrau als Schablone
      ctx.strokeStyle = "#e2e2e2";
      ctx.lineWidth = S * 0.11;
      strokes.forEach((st) => {
        path(st);
        ctx.stroke();
      });
      // bereits geschaffte Striche
      ctx.strokeStyle = "#58cc02";
      ctx.lineWidth = S * 0.075;
      done.current.forEach((st) => {
        path(st);
        ctx.stroke();
      });
      const cur = strokes[stroke];
      if (cur) {
        const samples = samplePath(cur, 1);
        if (mode === "demo") {
          // Vorführung: Linie wächst, Punkt läuft vorne mit, Pfeil zeigt Richtung
          demoT.current += dt * 0.55;
          const k = Math.min(1, demoT.current);
          const n = Math.max(2, Math.floor(samples.length * k));
          ctx.strokeStyle = "#1cb0f6";
          ctx.lineWidth = S * 0.075;
          path(samples.slice(0, n));
          ctx.stroke();
          const [hx, hy] = P(samples[n - 1]);
          const [px, py] = P(samples[Math.max(0, n - 6)]);
          const ang = Math.atan2(hy - py, hx - px);
          ctx.fillStyle = "#ff9600";
          ctx.beginPath();
          ctx.arc(hx, hy, S * 0.05, 0, Math.PI * 2);
          ctx.fill();
          ctx.save();
          ctx.translate(hx, hy);
          ctx.rotate(ang);
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.moveTo(S * 0.03, 0);
          ctx.lineTo(-S * 0.015, -S * 0.02);
          ctx.lineTo(-S * 0.015, S * 0.02);
          ctx.fill();
          ctx.restore();
          if (k >= 1 && demoT.current > 1.6) {
            setMode("draw");
            speak(`Jetzt du! Starte beim grünen Punkt.`);
          }
        }
        // Startpunkt mit Nummer
        const [sx, sy] = P(cur[0]);
        ctx.fillStyle = mode === "draw" ? "#58cc02" : "#ff9600";
        ctx.beginPath();
        ctx.arc(sx, sy, S * 0.055, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = `800 ${S * 0.06}px Andika, Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(stroke + 1), sx, sy + 1);
      }
      // aktuelle Spur des Kindes
      if (drawn.current.length > 1) {
        ctx.strokeStyle = mode === "judge" && verdict && verdict.score < 0.6 ? "#ff4b4b" : "#ff9600";
        ctx.lineWidth = S * 0.07;
        path(drawn.current);
        ctx.stroke();
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qi, stroke, mode, verdict, queue]);

  function toBox(e) {
    const box = boxRef.current.getBoundingClientRect();
    const S = Math.min(box.width, box.height) * 0.86;
    const ox = (box.width - S) / 2;
    const oy = (box.height - S) / 2;
    return [((e.clientX - box.left - ox) / S) * 100, ((e.clientY - box.top - oy) / S) * 100];
  }

  function down(e) {
    e.preventDefault();
    if (mode !== "draw") return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    drawn.current = [toBox(e)];
  }
  function move(e) {
    e.preventDefault();
    if (!drawing.current) return;
    drawn.current.push(toBox(e));
  }
  function up(e) {
    e.preventDefault();
    if (!drawing.current) return;
    drawing.current = false;
    judge();
  }

  function judge() {
    const cur = strokes[stroke];
    const r = scoreStroke(drawn.current, cur);
    setMode("judge");
    if (r.score >= 0.82) {
      playCorrect();
      setVerdict({ score: r.score, text: "Perfekt! ⭐⭐⭐" });
      speak(`Perfekt! ${pickFrom(PRAISE)}`);
      done.current = [...done.current, drawn.current];
      setTimeout(nextStroke, 1100);
    } else if (r.score >= 0.6) {
      playPop();
      setVerdict({ score: r.score, text: "Gut gemacht! ⭐⭐" });
      speak("Gut gemacht! Weiter geht's.");
      done.current = [...done.current, drawn.current];
      setTimeout(nextStroke, 1100);
    } else {
      playWrong();
      setVerdict({ score: r.score, text: r.coverage < 0.5 ? "Bleib auf der Bahn – nochmal!" : "Fast! Nochmal!" });
      speak(r.coverage < 0.5 ? "Folge der grauen Bahn. Schau nochmal zu!" : "Fast! Versuch es noch einmal!");
      setTimeout(() => {
        drawn.current = [];
        setVerdict(null);
        demoT.current = 0;
        setMode("demo");
      }, 1400);
    }
  }

  function nextStroke() {
    drawn.current = [];
    setVerdict(null);
    if (stroke + 1 < strokes.length) {
      setStroke(stroke + 1);
      demoT.current = 0;
      setMode("demo");
      speak(`Strich ${stroke + 2}!`);
    } else {
      // Zeichen fertig
      const b = loadWriting();
      b[glyph] = (b[glyph] || 0) + 1;
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(b));
      setBest(b);
      addPoints(10);
      if (qi + 1 < queue.length) {
        speak(`${glyph}! Jetzt das ${queue[qi + 1]}.`);
        done.current = [];
        setQi(qi + 1);
        setStroke(0);
        demoT.current = 0;
        setMode("demo");
      } else {
        playFanfare();
        confettiRain();
        speakSeq([{ text: queue.length > 1 ? `${queue.join("")}! Du hast ein ganzes Wort geschrieben!` : `${glyph}! Du kannst es schreiben!` }]);
        setMode("done");
      }
    }
  }

  function undo() {
    // aktuellen Strich verwerfen
    drawn.current = [];
    setVerdict(null);
    setMode("draw");
    speak("Nochmal von vorn. Starte beim grünen Punkt.");
  }
  function replay() {
    drawn.current = [];
    setVerdict(null);
    demoT.current = 0;
    setMode("demo");
    speak("Schau zu!");
  }
  function back() {
    // einen fertigen Strich zurücknehmen
    if (done.current.length && stroke > 0) {
      done.current = done.current.slice(0, -1);
      setStroke(stroke - 1);
      drawn.current = [];
      setVerdict(null);
      demoT.current = 0;
      setMode("demo");
    }
  }

  if (phase === "menu") {
    const name = (loadName() || "").toUpperCase().replace(/[^A-Z]/g, "");
    const words = [...(name.length >= 2 ? [name] : []), ...WRITE_WORDS];
    return (
      <main className="shell">
        <header className="home-header">
          <div className="home-title">✏️ Schreiben</div>
          <div className="home-sub">Tippe einen Buchstaben, eine Zahl oder ein Wort</div>
        </header>
        <section className="eltern-box">
          <h3>Buchstaben</h3>
          <div className="write-grid">
            {LETTERS.map((c) => (
              <button key={c} className={`write-tile ${best[c] ? "done" : ""}`} onClick={() => start([c])}>
                {c}
                {best[c] > 0 && <span className="write-check">✓</span>}
              </button>
            ))}
          </div>
        </section>
        <section className="eltern-box">
          <h3>Zahlen</h3>
          <div className="write-grid">
            {DIGITS.map((c) => (
              <button key={c} className={`write-tile ${best[c] ? "done" : ""}`} onClick={() => start([c])}>
                {c}
              </button>
            ))}
          </div>
        </section>
        <section className="eltern-box">
          <h3>Wörter</h3>
          <div className="write-words">
            {words.map((w) => (
              <button key={w} className="btn btn-blue" onClick={() => start([...w])}>
                {w === name ? `⭐ ${w}` : w}
              </button>
            ))}
          </div>
        </section>
        <button className="btn btn-blue" style={{ margin: "10px auto 30px", display: "block" }} onClick={() => router.push("/")}>
          ⬅️ ZURÜCK
        </button>
      </main>
    );
  }

  return (
    <div className="race-shell write-shell">
      <div className="race-hud" style={{ color: "#1f2a44" }}>
        <button className="close-btn" aria-label="Beenden" onClick={() => { stopSpeaking(); setPhase("menu"); }}>✕</button>
        <div className="write-word">
          {queue.map((c, i) => (
            <span key={i} className={i < qi ? "ok" : i === qi ? "now" : ""}>{c}</span>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <span className="write-step">Strich {Math.min(stroke + 1, strokes.length)}/{strokes.length}</span>
      </div>
      <div
        className="race-area write-area"
        ref={boxRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onTouchMove={(e) => e.preventDefault()}
      >
        <canvas ref={canvasRef} className="game-canvas" style={{ borderRadius: 0 }} />
        {mode === "demo" && <div className="write-hint">👀 Schau zu …</div>}
        {mode === "draw" && <div className="write-hint go">✏️ Jetzt du! Beim grünen Punkt starten</div>}
        {verdict && <div className={`write-verdict ${verdict.score >= 0.6 ? "good" : "bad"}`}>{verdict.text}</div>}
        {mode === "done" && (
          <div className="memory-won" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
            <div className="memory-won-title">🎉 {queue.join("")} geschafft!</div>
            <button className="btn" onClick={() => start(queue)}>NOCHMAL 🔁</button>
            <button className="btn btn-blue" onClick={() => setPhase("menu")}>ANDERES ZEICHEN</button>
          </div>
        )}
      </div>
      <div className="write-bar">
        <button className="btn btn-blue" onClick={replay}>👀 VORFÜHREN</button>
        <button className="btn btn-blue" onClick={undo} disabled={mode === "demo"}>🧽 STRICH LÖSCHEN</button>
        <button className="btn btn-blue" onClick={back} disabled={stroke === 0}>↩️ ZURÜCK</button>
        <button className="btn" onClick={() => speak(`Das ist das ${glyph}!`)}>🔊 {glyph}</button>
      </div>
    </div>
  );
}
