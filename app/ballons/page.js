"use client";

// Ballon-Jagd: Ballons mit Buchstaben steigen auf. Der gesuchte Buchstabe
// wird GESPROCHEN und oben gezeigt (Hören + Erkennen, kein Lesen).
// Richtigen Ballon tippen = platzt (+Punkte), falscher = wackelt (−Punkte).
// Ähnliche Buchstaben als Ablenker. 60 Sekunden, Bestenliste.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { speak, speakSeq, stopSpeaking } from "@/lib/speech";
import { playPop, playWrong, playFanfare, unlockAudio } from "@/lib/sfx";
import { enableWakeLock, disableWakeLock } from "@/lib/wakeLock";
import { addPoints } from "@/lib/progress";
import { pickFrom, PRAISE } from "@/lib/phrases";
import { addScore, playableLetters, distractorFor } from "@/lib/leaderboard";
import { NUMBER_WORDS } from "@/lib/games";
const say = (c) => (/\d/.test(c) ? NUMBER_WORDS[+c] : c);
import { burstAt } from "@/lib/fx";
import Leaderboard from "@/components/Leaderboard";
import FullscreenButton from "@/components/FullscreenButton";

const GAME = "ballons";
const ROUND = 60;
const COLORS = ["#ff4b4b", "#1cb0f6", "#58cc02", "#ff9600", "#ce82ff", "#ff86d0", "#ffc800"];

export default function Ballons() {
  const router = useRouter();
  const areaRef = useRef(null);
  const raf = useRef(0);
  const g = useRef(null);
  const [phase, setPhase] = useState("menu");
  const [balloons, setBalloons] = useState([]);
  const [hud, setHud] = useState({ score: 0, target: "A", time: ROUND, streak: 0 });
  const [result, setResult] = useState(null);
  const [overlay, setOverlay] = useState(null); // {kind:'count', n} | {kind:'reveal', letter}
  const [popups, setPopups] = useState([]);
  const [damage, setDamage] = useState(0); // kurzer roter Blitz + Wackeln
  const popId = useRef(0);
  const pool = useRef(["A", "B", "C", "D", "E"]);

  function popup(x, y, text, good) {
    const id = popId.current++;
    setPopups((p) => [...p, { id, x, y, text, good }]);
    setTimeout(() => setPopups((p) => p.filter((q) => q.id !== id)), 1000);
  }

  // Ziel-Buchstabe groß in der Mitte zeigen, dann nach oben "wegziehen"
  function reveal(letter) {
    setOverlay({ kind: "reveal", letter });
    setTimeout(() => setOverlay(null), 1600);
  }

  useEffect(() => {
    pool.current = playableLetters();
    return () => {
      cancelAnimationFrame(raf.current);
      stopSpeaking();
      disableWakeLock();
    };
  }, []);

  const newTarget = (prev) => {
    const p = pool.current.filter((c) => c !== prev);
    return p[Math.floor(Math.random() * p.length)];
  };

  function start() {
    unlockAudio();
    enableWakeLock();
    const target = newTarget(null);
    g.current = { score: 0, target, hits: 0, streak: 0, time: ROUND, items: [], spawnIn: 0.3, last: performance.now(), id: 0, over: false, paused: 3.2 };
    setHud({ score: 0, target, time: ROUND, streak: 0 });
    setResult(null);
    setPopups([]);
    setPhase("play");
    // Countdown 3-2-1, dann Ziel-Buchstabe groß zeigen
    [3, 2, 1].forEach((n, i) => setTimeout(() => setOverlay({ kind: "count", n }), i * 700));
    setTimeout(() => setOverlay({ kind: "count", n: "LOS!" }), 2100);
    setTimeout(() => reveal(target), 2700);
    speakSeq([{ text: "Drei" }, { pause: 500 }, { text: "Zwei" }, { pause: 500 }, { text: "Eins" }, { pause: 400 }, { text: "Los geht's!" }, { pause: 200 }, { text: `Tippe auf alle Ballons mit ${say(target)}!` }]);
  }

  function end() {
    const s = g.current;
    if (!s || s.over) return;
    s.over = true;
    cancelAnimationFrame(raf.current);
    playFanfare();
    addPoints(Math.round(s.score / 5));
    const rank = addScore(GAME, s.score);
    setResult({ score: s.score, hits: s.hits, rank });
    setPhase("over");
    setTimeout(() => speak(rank === 1 ? `Neuer Rekord! ${s.score} Punkte!` : `${s.score} Punkte! ${pickFrom(PRAISE)}`), 400);
  }

  useEffect(() => {
    if (phase !== "play") return;
    const loop = (now) => {
      const s = g.current;
      if (!s || s.over) return;
      const dt = Math.min((now - s.last) / 1000, 0.05);
      s.last = now;
      if (s.paused > 0) {
        s.paused -= dt;
        raf.current = requestAnimationFrame(loop);
        return;
      }
      s.time -= dt;
      const H = areaRef.current?.clientHeight || 600;
      s.spawnIn -= dt;
      if (s.spawnIn <= 0 && s.items.length < 7) {
        s.spawnIn = 0.9;
        const isTarget = Math.random() < 0.45 || !s.items.some((b) => b.letter === s.target);
        s.items.push({
          id: s.id++,
          letter: isTarget ? s.target : distractorFor(s.target, pool.current),
          x: 8 + Math.random() * 76,
          y: H + 60,
          vy: 45 + Math.random() * 35,
          wob: Math.random() * Math.PI * 2,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          state: "up",
        });
      }
      for (const b of s.items) {
        b.y -= b.vy * dt;
        b.wob += dt * 2;
      }
      s.items = s.items.filter((b) => b.y > -120 && b.state !== "gone");
      setBalloons(s.items.map((b) => ({ ...b })));
      setHud((h) => {
        const t = Math.ceil(s.time);
        return h.score === s.score && h.target === s.target && h.time === t && h.streak === s.streak ? h : { score: s.score, target: s.target, time: t, streak: s.streak };
      });
      if (s.time <= 0) {
        end();
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    g.current.last = performance.now();
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function tap(b, ev) {
    const s = g.current;
    if (!s || s.over) return;
    const it = s.items.find((x) => x.id === b.id);
    if (!it || it.state !== "up") return;
    if (it.letter === s.target) {
      playPop();
      it.state = "gone";
      s.streak += 1;
      s.hits += 1;
      const gain = 10 + Math.min(s.streak, 5) * 2;
      s.score += gain;
      burstAt(ev.clientX, ev.clientY, ["🎆", "⭐", "✨", "🎇"], 14);
      popup(ev.clientX, ev.clientY, `+${gain}`, true);
      if (s.hits % 5 === 0) {
        s.target = newTarget(s.target);
        reveal(s.target);
        s.paused = 2.2;
        s.items = [];
        speakSeq([{ text: "Hey! Neuer Buchstabe!" }, { pause: 150 }, { text: `Tippe alle ${say(s.target)}!` }]);
      } else speak(`${say(s.target)}!`);
    } else {
      playWrong();
      it.state = "wrong";
      setTimeout(() => (it.state = "up"), 600);
      s.streak = 0;
      s.score = Math.max(0, s.score - 5);
      burstAt(ev.clientX, ev.clientY, ["💥", "🔥"], 8);
      popup(ev.clientX, ev.clientY, "−5", false);
      setDamage((d) => d + 1);
      setTimeout(() => setDamage((d) => Math.max(0, d - 1)), 500);
      speak(`Das ist ${say(it.letter)}. Suche ${say(s.target)}!`);
    }
  }

  if (phase !== "play")
    return (
      <main className="shell">
        <div className="complete">
          <div className="complete-emoji">🎈</div>
          <div className="complete-title">{phase === "over" ? `${result.score} Punkte!` : "Ballon-Jagd"}</div>
          <div className="points-total" style={{ maxWidth: 340 }}>
            {phase === "over"
              ? `${result.hits} Ballons erwischt ${result.rank ? `· Platz ${result.rank} 🏆` : ""}`
              : "Hör gut zu: Tippe nur die Ballons mit dem gesuchten Buchstaben – 60 Sekunden lang!"}
          </div>
          <button className="btn splash-start pulse" onClick={start}>{phase === "over" ? "NOCHMAL 🔁" : "🔊 LOS GEHT'S!"}</button>
          <div className="cert-title" style={{ marginTop: 14 }}>🏆 Bestenliste</div>
          <Leaderboard game={GAME} highlight={result?.rank} />
          <button className="btn btn-blue" style={{ marginTop: 14 }} onClick={() => router.push("/")}>KARTE 🗺️</button>
        </div>
      </main>
    );

  return (
    <div className="race-shell" style={{ background: "linear-gradient(#7fd3ff, #d9f3ff)" }}>
      <div className="race-hud" style={{ color: "#1f2a44" }}>
        <button className="close-btn" aria-label="Beenden" onClick={end}>✕</button>
        <button className="race-target" onClick={() => speak(`Suche ${say(g.current.target)}!`)}>🔊 {hud.target}</button>
        <span style={{ flex: 1 }}>🪙 {hud.score} {hud.streak >= 3 && `🔥${hud.streak}`}</span>
        <span>⏱️ {hud.time}</span>
        <FullscreenButton />
      </div>
      <div className={`race-area balloon-area ${damage ? "damage" : ""}`} ref={areaRef}>
        {overlay?.kind === "count" && <div className="count-overlay" key={String(overlay.n)}>{overlay.n}</div>}
        {overlay?.kind === "reveal" && (
          <div className="reveal-overlay" key={overlay.letter}>
            <div className="reveal-label">Tippe alle</div>
            <div className="reveal-letter">{overlay.letter}</div>
          </div>
        )}
        {popups.map((p) => (
          <span key={p.id} className={`score-popup ${p.good ? "good" : "bad"}`} style={{ left: p.x, top: p.y }}>
            {p.text}
          </span>
        ))}
        {balloons.map((b) => (
          <button
            key={b.id}
            className={`balloon ${b.state === "wrong" ? "bubble-wrong" : ""}`}
            style={{ left: `${b.x + Math.sin(b.wob) * 2}%`, top: b.y, background: b.color, "--string": b.color }}
            onPointerDown={(e) => tap(b, e)}
          >
            {b.letter}
          </button>
        ))}
      </div>
    </div>
  );
}
