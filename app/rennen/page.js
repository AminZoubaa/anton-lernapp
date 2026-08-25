"use client";

// Buchstaben-Rennen – eigene, leichte Canvas-Engine (ein requestAnimationFrame,
// keine DOM-Updates pro Frame, DPR-skaliert). Lenken: Finger irgendwo auf die
// Straße legen und ziehen – das Auto folgt stufenlos der Fingerposition.
// Ziel-Buchstabe oben groß und gesprochen; auf der Straße kommen Schilder mit
// Buchstaben. Ähnliche Buchstaben (E/F, M/N, O/Q …) kommen bewusst als
// Ablenker, damit man wirklich hinschauen muss. 3 Leben, Tempo steigt.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { speak, speakSeq, stopSpeaking } from "@/lib/speech";
import { playPop, playWrong, playFanfare, unlockAudio } from "@/lib/sfx";
import { enableWakeLock, disableWakeLock } from "@/lib/wakeLock";
import { addPoints } from "@/lib/progress";
import { pickFrom, PRAISE } from "@/lib/phrases";
import { isMusicOn, startMusic, stopMusic } from "@/lib/music";
import { addScore, playableLetters, distractorFor } from "@/lib/leaderboard";
import Leaderboard from "@/components/Leaderboard";
import FullscreenButton from "@/components/FullscreenButton";

const GAME = "rennen";
const COLORS = ["#ff4b4b", "#1cb0f6", "#58cc02", "#ff9600", "#ce82ff", "#ff86d0"];

export default function Rennen() {
  const router = useRouter();
  const canvasRef = useRef(null);
  const areaRef = useRef(null);
  const g = useRef(null);
  const raf = useRef(0);
  const [phase, setPhase] = useState("menu"); // menu | play | over
  const [hud, setHud] = useState({ score: 0, lives: 3, target: "A", combo: 0 });
  const [result, setResult] = useState(null);
  const pool = useRef(["A", "B", "C", "D", "E"]);

  useEffect(() => {
    pool.current = playableLetters();
    return () => {
      cancelAnimationFrame(raf.current);
      stopSpeaking();
      stopMusic();
      disableWakeLock();
    };
  }, []);

  function newTarget(prev) {
    const p = pool.current.filter((c) => c !== prev);
    return p[Math.floor(Math.random() * p.length)];
  }

  function start() {
    unlockAudio();
    enableWakeLock();
    if (isMusicOn()) startMusic();
    const target = newTarget(null);
    g.current = {
      x: 0.5, // Auto-Position 0..1 (Straßenbreite)
      fingerX: null,
      speed: 260,
      score: 0,
      lives: 3,
      combo: 0,
      collected: 0,
      target,
      signs: [],
      particles: [],
      spawnIn: 0.8,
      stripe: 0,
      time: 0,
      last: performance.now(),
      shake: 0,
      flash: 0,
      hitCooldown: 0,
      over: false,
    };
    setHud({ score: 0, lives: 3, target, combo: 0 });
    setResult(null);
    setPhase("play");
    speakSeq([{ text: "Los geht's!" }, { text: `Sammle alle ${target}!` }, { text: "Zieh mit dem Finger, um zu lenken!" }]);
  }

  function gameOver() {
    const s = g.current;
    if (!s || s.over) return;
    s.over = true;
    cancelAnimationFrame(raf.current);
    stopMusic();
    playFanfare();
    addPoints(Math.round(s.score / 5));
    const rank = addScore(GAME, s.score);
    setResult({ score: s.score, collected: s.collected, rank });
    setPhase("over");
    setTimeout(() => speak(rank === 1 ? `Neuer Rekord! ${s.score} Punkte!` : `${s.score} Punkte! ${pickFrom(PRAISE)}`), 400);
  }

  // ---------- Eingabe: Finger = Lenkrad ----------
  function pointer(e) {
    const s = g.current;
    if (!s || s.over) return;
    const rect = areaRef.current.getBoundingClientRect();
    s.fingerX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }

  // ---------- Schleife ----------
  useEffect(() => {
    if (phase !== "play") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let W = 0;
    let H = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = areaRef.current.clientWidth;
      H = areaRef.current.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const roadL = () => W * 0.08;
    const roadR = () => W * 0.92;
    const roadW = () => roadR() - roadL();
    const carW = () => Math.min(74, roadW() / 5);
    const signR = () => Math.min(34, roadW() / 9);

    const loop = (now) => {
      const s = g.current;
      if (!s || s.over) return;
      const dt = Math.min((now - s.last) / 1000, 0.05);
      s.last = now;
      s.time += dt;
      s.speed = Math.min(260 + s.time * 6, 520);
      s.hitCooldown = Math.max(0, s.hitCooldown - dt);

      // Lenken: sanft zur Fingerposition
      if (s.fingerX !== null) s.x += (s.fingerX - s.x) * Math.min(1, dt * 12);

      // Spawnen: 55 % Ziel, sonst (ähnlicher) Ablenker
      s.spawnIn -= dt;
      if (s.spawnIn <= 0) {
        s.spawnIn = Math.max(0.55, 1.2 - s.time * 0.01);
        const isTarget = Math.random() < 0.55;
        const letter = isTarget ? s.target : distractorFor(s.target, pool.current);
        s.signs.push({ x: 0.12 + Math.random() * 0.76, y: -60, letter, color: COLORS[Math.floor(Math.random() * COLORS.length)], hit: false });
      }

      const carX = roadL() + s.x * roadW();
      const carY = H - 90;
      for (const sg of s.signs) sg.y += s.speed * dt;
      const keep = [];
      for (const sg of s.signs) {
        const sx = roadL() + sg.x * roadW();
        const dx = Math.abs(sx - carX);
        const dy = Math.abs(sg.y - carY);
        if (!sg.hit && dx < carW() * 0.7 && dy < 46) {
          sg.hit = true;
          if (sg.letter === s.target) {
            playPop();
            s.combo += 1;
            s.collected += 1;
            s.score += 10 + Math.min(s.combo, 5) * 2;
            s.flash = 0.25;
            for (let i = 0; i < 14; i++)
              s.particles.push({ x: sx, y: sg.y, vx: (Math.random() - 0.5) * 320, vy: -Math.random() * 320, life: 0.7, c: "#ffc800" });
            if (s.collected % 5 === 0) {
              s.target = newTarget(s.target);
              speak(`Super! Jetzt sammle alle ${s.target}!`);
            } else speak(s.target);
          } else if (s.hitCooldown <= 0) {
            playWrong();
            s.combo = 0;
            s.lives -= 1;
            s.shake = 0.4;
            s.hitCooldown = 1.2;
            speak(`Das war ${sg.letter}, nicht ${s.target}!`);
            for (let i = 0; i < 10; i++)
              s.particles.push({ x: sx, y: sg.y, vx: (Math.random() - 0.5) * 240, vy: -Math.random() * 200, life: 0.6, c: "#ff4b4b" });
          }
          continue;
        }
        if (sg.y < H + 80) keep.push(sg);
      }
      s.signs = keep;
      for (const p of s.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 600 * dt;
        p.life -= dt;
      }
      s.particles = s.particles.filter((p) => p.life > 0);
      s.shake = Math.max(0, s.shake - dt);
      s.flash = Math.max(0, s.flash - dt);
      s.stripe = (s.stripe + s.speed * dt) % 80;

      // ---------- Zeichnen ----------
      ctx.save();
      if (s.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * s.shake, (Math.random() - 0.5) * 10 * s.shake);
      ctx.fillStyle = "#3f8f3a";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#4a4a55";
      ctx.fillRect(roadL(), 0, roadW(), H);
      ctx.fillStyle = "#fff";
      ctx.fillRect(roadL(), 0, 6, H);
      ctx.fillRect(roadR() - 6, 0, 6, H);
      ctx.fillStyle = "#ffe066";
      for (let y = -80 + s.stripe; y < H; y += 80) ctx.fillRect(W / 2 - 4, y, 8, 44);

      for (const sg of s.signs) {
        const sx = roadL() + sg.x * roadW();
        const r = signR();
        ctx.fillStyle = "#00000033";
        ctx.beginPath();
        ctx.ellipse(sx, sg.y + r + 6, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = sg.color;
        ctx.beginPath();
        ctx.arc(sx, sg.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = `800 ${r * 1.35}px Andika, Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(sg.letter, sx, sg.y + 2);
      }

      // Auto
      const cw = carW();
      const ch = cw * 1.5;
      const tilt = s.fingerX !== null ? (s.fingerX - s.x) * 0.8 : 0;
      ctx.save();
      ctx.translate(carX, carY);
      ctx.rotate(tilt);
      ctx.fillStyle = "#00000044";
      ctx.beginPath();
      ctx.ellipse(0, ch * 0.45, cw * 0.55, cw * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#222";
      for (const [wx, wy] of [[-0.5, -0.35], [0.5, -0.35], [-0.5, 0.35], [0.5, 0.35]]) ctx.fillRect(wx * cw - 6, wy * ch - 12, 12, 24);
      ctx.fillStyle = s.hitCooldown > 0 && Math.floor(s.time * 12) % 2 ? "#ffb3b3" : "#ff4b4b";
      ctx.beginPath();
      ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 14);
      ctx.fill();
      ctx.fillStyle = "#9ad8ff";
      ctx.beginPath();
      ctx.roundRect(-cw * 0.32, -ch * 0.28, cw * 0.64, ch * 0.22, 6);
      ctx.fill();
      ctx.fillStyle = "#ffe066";
      ctx.fillRect(-cw * 0.4, -ch / 2 + 4, cw * 0.18, 8);
      ctx.fillRect(cw * 0.22, -ch / 2 + 4, cw * 0.18, 8);
      ctx.restore();

      for (const p of s.particles) {
        ctx.globalAlpha = Math.max(0, p.life / 0.7);
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
      }
      ctx.globalAlpha = 1;
      if (s.flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${s.flash * 0.8})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();

      setHud((h) =>
        h.score === s.score && h.lives === s.lives && h.target === s.target && h.combo === s.combo
          ? h
          : { score: s.score, lives: s.lives, target: s.target, combo: s.combo }
      );
      if (s.lives <= 0) {
        gameOver();
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    g.current.last = performance.now();
    raf.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === "menu" || phase === "over")
    return (
      <main className="shell">
        <div className="complete">
          <div className="complete-emoji">🏎️</div>
          <div className="complete-title">{phase === "over" ? `${result.score} Punkte!` : "Buchstaben-Rennen"}</div>
          {phase === "over" ? (
            <div className="points-total">
              {result.collected} Buchstaben gesammelt {result.rank ? `· Platz ${result.rank} 🏆` : ""}
            </div>
          ) : (
            <div className="points-total" style={{ maxWidth: 340 }}>
              Zieh mit dem Finger über die Straße, um zu lenken. Sammle nur den Buchstaben, der oben steht – die anderen kosten ein Leben!
            </div>
          )}
          <button className="btn splash-start pulse" onClick={start}>
            {phase === "over" ? "NOCHMAL 🔁" : "🔊 LOS GEHT'S!"}
          </button>
          <div className="cert-title" style={{ marginTop: 14 }}>🏆 Bestenliste</div>
          <Leaderboard game={GAME} highlight={result?.rank} />
          <button className="btn btn-blue" style={{ marginTop: 14 }} onClick={() => router.push("/")}>
            KARTE 🗺️
          </button>
        </div>
      </main>
    );

  return (
    <div className="race-shell">
      <div className="race-hud">
        <button className="close-btn" aria-label="Beenden" onClick={gameOver}>✕</button>
        <span className="race-target">{hud.target}</span>
        <span style={{ flex: 1 }}>🪙 {hud.score} {hud.combo >= 3 && `🔥${hud.combo}`}</span>
        <span>{"❤️".repeat(hud.lives)}{"🖤".repeat(3 - hud.lives)}</span>
        <FullscreenButton />
      </div>
      <div
        className="race-area"
        ref={areaRef}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); pointer(e); }}
        onPointerMove={pointer}
        onPointerUp={() => { if (g.current) g.current.fingerX = null; }}
        onPointerCancel={() => { if (g.current) g.current.fingerX = null; }}
      >
        <canvas ref={canvasRef} className="game-canvas" />
      </div>
    </div>
  );
}
