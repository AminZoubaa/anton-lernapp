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
import { playPop, playWrong, playCorrect, playFanfare, unlockAudio } from "@/lib/sfx";
import { enableWakeLock, disableWakeLock } from "@/lib/wakeLock";
import { addPoints } from "@/lib/progress";
import { pickFrom, PRAISE } from "@/lib/phrases";
import { isMusicOn, startMusic, stopMusic } from "@/lib/music";
import { addScore, playableLetters, distractorFor } from "@/lib/leaderboard";
import { NUMBER_WORDS } from "@/lib/games";
const say = (c) => (/\d/.test(c) ? NUMBER_WORDS[+c] : c);
import Leaderboard from "@/components/Leaderboard";
import FullscreenButton from "@/components/FullscreenButton";

const GAME = "rennen";
const COLORS = ["#ff4b4b", "#1cb0f6", "#58cc02", "#ff9600", "#ce82ff", "#ff86d0"];

// Fahrzeug-Klassen: steigen mit der Punktzahl
const VEHICLES = [
  { at: 0, emoji: "🚗", name: "Stadtauto" },
  { at: 120, emoji: "🚕", name: "Taxi" },
  { at: 280, emoji: "🚙", name: "Jeep" },
  { at: 480, emoji: "🚌", name: "Bus" },
  { at: 720, emoji: "🚚", name: "Truck" },
  { at: 1000, emoji: "🚜", name: "Bagger-Traktor" },
  { at: 1350, emoji: "🚒", name: "Feuerwehr" },
  { at: 1750, emoji: "🏎️", name: "Rennwagen" },
  { at: 2200, emoji: "🚀", name: "Rakete" },
];
const vehicleFor = (score) => VEHICLES.filter((v) => score >= v.at).pop();
// Gegenstände auf der Strecke
const ITEMS = [
  { kind: "gift", emoji: "🎁", w: 5 },
  { kind: "star", emoji: "⭐", w: 3 },
  { kind: "heart", emoji: "❤️", w: 3 },
  { kind: "armor", emoji: "🛡️", w: 0.5 }, // selten – sonst sammelt man alles ohne hinzuschauen
  { kind: "banana", emoji: "🍌", w: 4 },
  { kind: "bomb", emoji: "💣", w: 3 },
];
const pickItem = () => {
  const total = ITEMS.reduce((a, i) => a + i.w, 0);
  let r = Math.random() * total;
  for (const it of ITEMS) if ((r -= it.w) <= 0) return it;
  return ITEMS[0];
};
const MAX_HEARTS = 9;

export default function Rennen() {
  const router = useRouter();
  const canvasRef = useRef(null);
  const areaRef = useRef(null);
  const g = useRef(null);
  const raf = useRef(0);
  const [phase, setPhase] = useState("menu");
  const [hud, setHud] = useState({ score: 0, lives: 3, target: "A", combo: 0, armor: 0, vehicle: "🚗", shield: false });
  const [result, setResult] = useState(null);
  const pool = useRef(["A", "B", "C", "D", "E"]);
  const ptrId = useRef(null); // steuernder Finger (Handballen/zweiter Finger wird ignoriert)

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
      x: 0.5, y: 0.82, // Auto-Position (Anteile von Breite/Höhe)
      fingerX: null, fingerY: null,
      speed: 260, score: 0, lives: 3, armor: 0, combo: 0, collected: 0, target,
      signs: [], items: [], particles: [], popups: [],
      spawnIn: 0.8, itemIn: 4, stripe: 0, time: 0, last: performance.now(),
      shake: 0, flash: 0, redFlash: 0, hitCooldown: 0, over: false,
      countdown: 3.9, reveal: { letter: target, t: 0 },
      shield: 0, slip: 0, cracks: 0, vehicle: VEHICLES[0], vehicleFx: 0,
      heat: 0, sinceCollect: 0, nagIn: 6, splash: 0, explode: 0,
    };
    setHud({ score: 0, lives: 3, target, combo: 0, armor: 0, vehicle: "🚗", shield: false });
    setResult(null);
    ptrId.current = null;
    cancelAnimationFrame(raf.current);
    setPhase("play");
    speakSeq([{ text: "Drei" }, { pause: 650 }, { text: "Zwei" }, { pause: 650 }, { text: "Eins" }, { pause: 500 }, { text: "Los geht's!" }, { pause: 200 }, { text: `Sammle alle ${say(target)}!` }]);
  }

  function gameOver() {
    const s = g.current;
    if (!s || s.over) return;
    s.over = true;
    ptrId.current = null;
    cancelAnimationFrame(raf.current);
    stopMusic();
    playFanfare();
    addPoints(Math.round(s.score / 5));
    const rank = addScore(GAME, s.score);
    setResult({ score: s.score, collected: s.collected, rank, vehicle: s.vehicle });
    setPhase("over");
    setTimeout(() => speak(rank === 1 ? `Neuer Rekord! ${s.score} Punkte!` : `${s.score} Punkte! ${pickFrom(PRAISE)}`), 400);
  }

  // Finger = Auto: folgt in beide Richtungen, über die ganze Fläche
  function pointer(e) {
    const s = g.current;
    if (!s || s.over) return;
    // Erster/primärer Finger steuert. Ein neuer primärer Finger übernimmt sofort
    // (falls das pointerup des alten verloren ging – sonst "hängt" das Auto).
    if (e.type === "pointerdown") { if (!e.isPrimary) return; ptrId.current = e.pointerId; }
    if (e.pointerId !== ptrId.current) return;
    const rect = areaRef.current.getBoundingClientRect();
    s.fingerX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    s.fingerY = Math.max(0.15, Math.min(0.95, (e.clientY - rect.top) / rect.height));
  }

  useEffect(() => {
    if (phase !== "play") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0;
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
    const roadL = () => W * 0.03;
    const roadR = () => W * 0.97;
    const roadW = () => roadR() - roadL();
    const carW = () => Math.min(80, W / 5);
    const signR = () => Math.min(34, W / 10);
    const burst = (x, y, n, colors, v0 = 260) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = v0 * (0.4 + Math.random());
        g.current.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.8, c: colors[i % colors.length] });
      }
    };
    const loseHeart = (s, sx, sy, why) => {
      if (s.shield > 0) {
        // Schutzschild: falscher Buchstabe / Bombe zerbricht wie ein Stein
        burst(sx, sy, 26, ["#9ad8ff", "#ffffff", "#1cb0f6"], 320);
        s.popups.push({ x: sx, y: sy, text: "ABGEWEHRT!", color: "#1cb0f6", life: 1 });
        playPop();
        return;
      }
      if (s.armor > 0) {
        s.armor -= 1;
        burst(sx, sy, 18, ["#bbbbbb", "#888888"], 220);
        s.popups.push({ x: sx, y: sy, text: "Rüstung −1 🛡️", color: "#666", life: 1.1 });
        s.shake = 0.3;
        playWrong();
        return;
      }
      if (s.hitCooldown > 0) return;
      playWrong();
      s.combo = 0;
      s.lives -= 1;
      s.cracks = Math.min(3, s.cracks + 1);
      s.shake = 0.5;
      s.redFlash = 0.5;
      s.hitCooldown = 1.2;
      s.popups.push({ x: sx, y: sy, text: "−1 ❤️", color: "#ff2d2d", life: 1.2 });
      burst(sx, sy, 26, ["#ff9600", "#ff4b4b", "#333"], 300);
      if (why) speak(why);
    };

    const loop = (now) => {
      const s = g.current;
      if (!s || s.over) return;
      const dt = Math.min((now - s.last) / 1000, 0.05);
      s.last = now;
      if (s.reveal) {
        s.reveal.t += dt;
        if (s.reveal.t > 2.6) s.reveal = null;
      }
      const revealPause = s.reveal?.pauseUntil && s.reveal.t < s.reveal.pauseUntil;
      const running = s.countdown <= 0 && !revealPause;
      if (s.countdown > 0) s.countdown -= dt;
      if (running) {
        s.time += dt;
        // Motor läuft heiß – nur gesammelte Zeichen (= Wasser) kühlen ihn.
        // Ohne Treffer ist er nach ~30 s bei 100 % → Explosion.
        s.heat = Math.min(100, s.heat + dt * 3.4);
        s.sinceCollect += dt;
        s.nagIn -= dt;
        if (s.nagIn <= 0 && s.sinceCollect > 5) {
          s.nagIn = 5;
          speakSeq([{ text: "Wir brauchen Wasser, um die Maschine zu kühlen!" }, { pause: 150 }, { text: `Sammle das ${say(s.target)}!` }]);
        }
        if (s.heat >= 100 && !s.explode) {
          s.explode = 1.6;
          burst(roadL() + s.x * roadW(), s.y * H, 60, ["#ff4b4b", "#ff9600", "#333", "#ffe066"], 420);
          s.shake = 1.2;
          playWrong();
          speak("Zu heiß! Die Maschine explodiert!");
        }
      }
      if (s.explode) {
        s.explode -= dt;
        if (s.explode <= 0) { gameOver(); return; }
      }
      s.splash = Math.max(0, s.splash - dt);
      s.speed = running ? Math.min(260 + s.time * 6, 560) * (s.slip > 0 ? 0.5 : 1) : 0;
      s.hitCooldown = Math.max(0, s.hitCooldown - dt);
      s.shield = Math.max(0, s.shield - dt);
      s.slip = Math.max(0, s.slip - dt);
      s.vehicleFx = Math.max(0, s.vehicleFx - dt);

      // Auto folgt dem Finger (x und y); auf Bananenschale schlingert es
      const k = Math.min(1, dt * (s.slip > 0 ? 4 : 12));
      if (s.fingerX !== null) s.x += (s.fingerX - s.x) * k;
      if (s.fingerY !== null) s.y += (s.fingerY - s.y) * k;
      if (s.slip > 0) s.x = Math.max(0.05, Math.min(0.95, s.x + Math.sin(s.time * 25) * 0.012));

      if (running) {
        s.spawnIn -= dt;
        if (s.spawnIn <= 0) {
          s.spawnIn = Math.max(0.5, 1.15 - s.time * 0.01);
          const isTarget = Math.random() < 0.55;
          const letter = isTarget ? s.target : distractorFor(s.target, pool.current);
          s.signs.push({ x: 0.06 + Math.random() * 0.88, y: -60, letter, color: COLORS[Math.floor(Math.random() * COLORS.length)], hit: false });
        }
        s.itemIn -= dt;
        if (s.itemIn <= 0) {
          s.itemIn = 3 + Math.random() * 3;
          s.items.push({ ...pickItem(), x: 0.08 + Math.random() * 0.84, y: -60, hit: false, spin: Math.random() * 6 });
        }
      }

      const carX = roadL() + s.x * roadW();
      const carY = s.y * H;
      const cw = carW();
      for (const sg of s.signs) sg.y += s.speed * dt;
      for (const it of s.items) it.y += s.speed * dt;
      const keep = [];
      for (const sg of s.signs) {
        const sx = roadL() + sg.x * roadW();
        if (!sg.hit && Math.abs(sx - carX) < cw * 0.7 && Math.abs(sg.y - carY) < 46) {
          sg.hit = true;
          if (sg.letter === s.target) {
            playPop();
            s.combo += 1;
            s.collected += 1;
            const gain = 10 + Math.min(s.combo, 5) * 2;
            s.score += gain;
            s.flash = 0.2;
            s.popups.push({ x: sx, y: sg.y, text: `+${gain} 💧`, color: "#2fbf2f", life: 1 });
            burst(sx, sg.y, 14, ["#ffc800", "#fff"], 240);
            // Kaltes Wasser: Splash und Motor kühlt ab
            s.heat = Math.max(0, s.heat - 35);
            s.sinceCollect = 0;
            s.nagIn = 6;
            s.splash = 0.6;
            burst(sx, sg.y, 22, ["#9ad8ff", "#1cb0f6", "#ffffff"], 300);
            if (s.combo % 3 === 0) {
              s.shield = 4;
              s.popups.push({ x: carX, y: carY - 70, text: "SCHUTZSCHILD! 🛡️", color: "#1cb0f6", life: 1.3 });
              speak("Combo! Schutzschild!");
            }
            if (s.collected % 5 === 0) {
              s.target = newTarget(s.target);
              s.reveal = { letter: s.target, t: 0, pauseUntil: 2.0 };
              speakSeq([{ text: "Hey! Neuer Buchstabe!" }, { pause: 150 }, { text: `${say(s.target)}!`, opts: { rate: 0.95, pitch: 1.2 } }]);
            } else if (s.combo % 3 !== 0) speak(`${say(sg.letter)}!`, { rate: 1.05, pitch: 1.05 });
          } else {
            // Falsches Zeichen kostet IMMER Combo und Punkte – auch mit Schild/Rüstung.
            // Schutz verhindert nur das verlorene Herz, nicht das Lernen.
            s.combo = 0; s.score = Math.max(0, s.score - 3);
            if (s.shield > 0 || s.armor > 0) s.popups.push({ x: sx, y: sg.y - 40, text: `Falsch: ${sg.letter} −3`, color: "#ff2d2d", life: 1.2 });
            loseHeart(s, sx, sg.y, `Das war ${say(sg.letter)}, nicht ${say(s.target)}!`);
          }
          continue;
        }
        if (sg.y < H + 80) keep.push(sg);
      }
      s.signs = keep;
      const keepItems = [];
      for (const it of s.items) {
        const ix = roadL() + it.x * roadW();
        if (!it.hit && Math.abs(ix - carX) < cw * 0.7 && Math.abs(it.y - carY) < 46) {
          it.hit = true;
          if (it.kind === "gift") { s.score += 25; s.popups.push({ x: ix, y: it.y, text: "+25 🎁", color: "#2fbf2f", life: 1 }); burst(ix, it.y, 16, ["#ff86d0", "#ffc800"]); playPop(); speak("Geschenk!"); }
          else if (it.kind === "star") { s.shield = 5; s.popups.push({ x: ix, y: it.y, text: "SCHILD 5s ⭐", color: "#1cb0f6", life: 1.2 }); burst(ix, it.y, 16, ["#9ad8ff", "#fff"]); playPop(); speak("Schutzschild!"); }
          else if (it.kind === "heart") { if (s.lives < MAX_HEARTS) s.lives += 1; s.popups.push({ x: ix, y: it.y, text: "+1 ❤️", color: "#ff2d6b", life: 1 }); burst(ix, it.y, 12, ["#ff2d6b", "#fff"]); playCorrect(); speak("Ein Herz!"); }
          else if (it.kind === "armor") { s.armor = Math.min(1, s.armor + 1); s.popups.push({ x: ix, y: it.y, text: "RÜSTUNG +1 🛡️", color: "#666", life: 1.2 }); burst(ix, it.y, 12, ["#bbb", "#888"]); playPop(); speak("Rüstung!"); }
          else if (it.kind === "banana") { if (s.shield <= 0) { s.slip = 2; s.score = Math.max(0, s.score - 10); s.popups.push({ x: ix, y: it.y, text: "−10 🍌 Rutsch!", color: "#ff2d2d", life: 1.2 }); playWrong(); speak("Ups, Bananenschale!"); } else burst(ix, it.y, 10, ["#ffe066"]); }
          else if (it.kind === "bomb") { burst(ix, it.y, 30, ["#ff9600", "#ff4b4b", "#333"], 340); s.shake = 0.6; loseHeart(s, ix, it.y, "Bumm! Eine Bombe!"); }
          continue;
        }
        if (it.y < H + 80) keepItems.push(it);
      }
      s.items = keepItems;
      // Fahrzeug-Aufstieg
      const v = vehicleFor(s.score);
      if (v !== s.vehicle) {
        s.vehicle = v;
        s.vehicleFx = 1.5;
        burst(carX, carY, 30, ["#ffc800", "#ff86d0", "#1cb0f6", "#fff"], 320);
        playFanfare();
        speak(`Neues Fahrzeug: ${v.name}!`);
      }
      for (const p of s.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.life -= dt; }
      s.particles = s.particles.filter((p) => p.life > 0);
      s.shake = Math.max(0, s.shake - dt);
      s.flash = Math.max(0, s.flash - dt);
      s.redFlash = Math.max(0, s.redFlash - dt);
      for (const p of s.popups) { p.y -= 60 * dt; p.life -= dt; }
      s.popups = s.popups.filter((p) => p.life > 0);
      s.stripe = (s.stripe + s.speed * dt) % 80;

      // ---------- Zeichnen ----------
      ctx.save();
      if (s.shake > 0) ctx.translate((Math.random() - 0.5) * 12 * s.shake, (Math.random() - 0.5) * 12 * s.shake);
      ctx.fillStyle = "#3f8f3a";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#4a4a55";
      ctx.fillRect(roadL(), 0, roadW(), H);
      ctx.fillStyle = "#fff";
      ctx.fillRect(roadL(), 0, 5, H);
      ctx.fillRect(roadR() - 5, 0, 5, H);
      ctx.fillStyle = "#ffe066";
      for (const lx of [W / 3, (2 * W) / 3]) for (let y = -80 + s.stripe; y < H; y += 80) ctx.fillRect(lx - 3, y, 6, 40);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const sg of s.signs) {
        const sx = roadL() + sg.x * roadW();
        const r = signR();
        ctx.fillStyle = "#00000033";
        ctx.beginPath(); ctx.ellipse(sx, sg.y + r + 6, r * 0.9, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = sg.color;
        ctx.beginPath(); ctx.arc(sx, sg.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = `800 ${r * 1.35}px Andika, Arial, sans-serif`;
        ctx.fillText(sg.letter, sx, sg.y + 2);
      }
      for (const it of s.items) {
        const ix = roadL() + it.x * roadW();
        ctx.save();
        ctx.translate(ix, it.y);
        ctx.rotate(Math.sin(s.time * 3 + it.spin) * 0.25);
        ctx.font = `${signR() * 1.6}px serif`;
        ctx.fillText(it.emoji, 0, 0);
        ctx.restore();
      }
      // Fahrzeug (Emoji), Schild, Rüstung, Schaden
      const size = cw * (1.4 + Math.min(s.armor, 3) * 0.05) * (s.vehicleFx > 0 ? 1 + Math.sin(s.vehicleFx * 12) * 0.12 : 1);
      ctx.save();
      ctx.translate(carX, carY);
      ctx.rotate(s.fingerX !== null ? (s.fingerX - s.x) * 0.8 : 0);
      if (s.slip > 0) ctx.rotate(Math.sin(s.time * 20) * 0.5);
      if (s.armor > 0) {
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 3 + s.armor * 2;
        ctx.beginPath(); ctx.roundRect(-size * 0.5, -size * 0.55, size, size * 1.1, 16); ctx.stroke();
      }
      ctx.fillStyle = "#00000044";
      ctx.beginPath(); ctx.ellipse(0, size * 0.42, size * 0.45, size * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = s.hitCooldown > 0 && Math.floor(s.time * 12) % 2 ? 0.4 : 1;
      ctx.font = `${size}px serif`;
      ctx.fillText(s.vehicle.emoji, 0, 0);
      ctx.globalAlpha = 1;
      if (s.cracks > 0) {
        ctx.font = `${size * 0.35}px serif`;
        for (let i = 0; i < s.cracks; i++) ctx.fillText("💨", -size * 0.3 + i * size * 0.3, -size * 0.55 - ((s.time * 40 + i * 20) % 30));
      }
      ctx.restore();
      if (s.shield > 0) {
        const pulse = 1 + Math.sin(s.time * 8) * 0.05;
        ctx.strokeStyle = `rgba(28,176,246,${0.5 + Math.min(1, s.shield) * 0.4})`;
        ctx.lineWidth = 6;
        ctx.fillStyle = "rgba(154,216,255,0.22)";
        ctx.beginPath(); ctx.arc(carX, carY, size * 0.85 * pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      if (s.splash > 0) {
        ctx.strokeStyle = `rgba(28,176,246,${s.splash})`;
        ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(carX, carY, (0.6 - s.splash) * 220 + 40, 0, Math.PI * 2); ctx.stroke();
      }
      if (s.explode > 0) {
        ctx.fillStyle = `rgba(255,120,0,${Math.min(1, s.explode)})`;
        ctx.beginPath(); ctx.arc(carX, carY, (1.6 - s.explode) * 260 + 30, 0, Math.PI * 2); ctx.fill();
        ctx.font = `${size * 1.6}px serif`; ctx.fillText("💥", carX, carY);
      }
      // Temperaturanzeige (links), wird rot und pulsiert, je heißer
      const gx = 16, gy = H * 0.25, gh = H * 0.5, gw = 22;
      ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.roundRect(gx - 4, gy - 4, gw + 8, gh + 8, 10); ctx.fill();
      const hf = s.heat / 100;
      const grdH = ctx.createLinearGradient(0, gy + gh, 0, gy);
      grdH.addColorStop(0, "#58cc02"); grdH.addColorStop(0.5, "#ffc800"); grdH.addColorStop(1, "#ff2d2d");
      ctx.fillStyle = grdH;
      ctx.fillRect(gx, gy + gh * (1 - hf), gw * (hf > 0.8 ? 1 + Math.sin(s.time * 15) * 0.15 : 1), gh * hf);
      ctx.font = "20px serif"; ctx.fillText(hf > 0.8 ? "🔥" : "🌡️", gx + gw / 2, gy - 18);
      ctx.fillText("💧", gx + gw / 2, gy + gh + 22);
      for (const p of s.particles) {
        ctx.globalAlpha = Math.max(0, p.life / 0.8);
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
      }
      ctx.globalAlpha = 1;
      if (s.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${s.flash * 0.7})`; ctx.fillRect(0, 0, W, H); }
      if (s.redFlash > 0) {
        const grd = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
        grd.addColorStop(0, "rgba(255,0,0,0)");
        grd.addColorStop(1, `rgba(255,0,0,${s.redFlash * 0.9})`);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
      }
      for (const p of s.popups) {
        ctx.globalAlpha = Math.min(1, p.life);
        ctx.font = `900 ${p.color === "#ff2d2d" ? 34 : 30}px Andika, Arial, sans-serif`;
        ctx.lineWidth = 6; ctx.strokeStyle = "#fff"; ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
      }
      ctx.globalAlpha = 1;
      if (s.reveal) {
        const t = s.reveal.t;
        const ease = (q) => 1 - Math.pow(1 - q, 3);
        const grow = ease(Math.min(t / 0.45, 1));
        const fly = ease(Math.max(0, Math.min(1, (t - 1.7) / 0.9)));
        const base = Math.min(W, H) * 0.42;
        const sz = (base + Math.sin(t * 9) * base * 0.06) * grow * (1 - fly * 0.82);
        const x = W / 2 + Math.sin(fly * Math.PI) * W * 0.3 + (60 - W / 2) * fly;
        const y = H * 0.4 + (-30 - H * 0.4) * fly;
        ctx.globalAlpha = 1 - fly * 0.6;
        ctx.fillStyle = "rgba(255,200,0,0.25)"; ctx.beginPath(); ctx.arc(x, y, sz * 1.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffc800"; ctx.beginPath(); ctx.arc(x, y, sz * 0.85, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 10; ctx.strokeStyle = "#fff"; ctx.stroke();
        ctx.fillStyle = "#1f2a44";
        ctx.font = `900 ${sz}px Andika, Arial, sans-serif`;
        ctx.fillText(s.reveal.letter, x, y + sz * 0.05);
        if (fly < 0.2) {
          ctx.font = `800 ${28 * grow}px Andika, Arial, sans-serif`;
          ctx.fillStyle = "#fff"; ctx.strokeStyle = "#1f2a44"; ctx.lineWidth = 5;
          const label = s.reveal.pauseUntil ? "Neuer Buchstabe!" : "Sammle alle";
          ctx.strokeText(label, x, y - sz * 0.95 - 22); ctx.fillText(label, x, y - sz * 0.95 - 22);
        }
        ctx.globalAlpha = 1;
      }
      if (!running && s.countdown > 0) {
        const n = Math.ceil(s.countdown - 0.9);
        const label = n >= 1 ? String(n) : "LOS!";
        const frac = 1 - ((s.countdown - 0.9) % 1);
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = n >= 1 ? "#fff" : "#58cc02";
        ctx.font = `900 ${110 + frac * 40}px Andika, Arial, sans-serif`;
        ctx.fillText(label, W / 2, H * 0.68);
      }
      ctx.restore();

      setHud((h) =>
        h.score === s.score && h.lives === s.lives && h.target === s.target && h.combo === s.combo && h.armor === s.armor && h.vehicle === s.vehicle.emoji && h.shield === s.shield > 0
          ? h
          : { score: s.score, lives: s.lives, target: s.target, combo: s.combo, armor: s.armor, vehicle: s.vehicle.emoji, shield: s.shield > 0 }
      );
      if (s.lives <= 0) { gameOver(); return; }
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
              {result.collected} Zeichen gesammelt · Fahrzeug: {result.vehicle.emoji} {result.vehicle.name} {result.rank ? `· Platz ${result.rank} 🏆` : ""}
            </div>
          ) : (
            <div className="points-total" style={{ maxWidth: 340 }}>
              Das Auto folgt deinem Finger. Sammle das Zeichen, das oben steht – jedes ist kaltes Wasser 💧 für den heißen Motor! Wird die Anzeige links rot, explodiert die Maschine. 🎁 Punkte · ⭐ Schild · ❤️ Herz · 🛡️ Rüstung · 🍌 Rutsch · 💣 Bumm. 3 Treffer in Folge = Schutzschild, mehr Punkte = besseres Fahrzeug!
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
        <span style={{ flex: 1 }}>🪙 {hud.score} {hud.combo >= 2 && `🔥${hud.combo}`} {hud.shield && "🛡️"}</span>
        <span className="race-hearts">{hud.vehicle} {"❤️".repeat(hud.lives)}{"🛡️".repeat(hud.armor)}</span>
        <FullscreenButton />
      </div>
      <div
        className="race-area"
        ref={areaRef}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); pointer(e); }}
        onPointerMove={pointer}
        onPointerUp={(e) => { if (e.pointerId !== ptrId.current) return; ptrId.current = null; if (g.current) { g.current.fingerX = null; g.current.fingerY = null; } }}
        onPointerCancel={(e) => { if (e.pointerId !== ptrId.current) return; ptrId.current = null; if (g.current) { g.current.fingerX = null; g.current.fingerY = null; } }}
      >
        <canvas ref={canvasRef} className="game-canvas" />
      </div>
    </div>
  );
}
