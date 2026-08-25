"use client";

// Buchstaben-Angeln: Fische mit Zeichen schwimmen vorbei. Gesuchtes Zeichen
// wird gesagt. Angel (Finger) auf den Fisch → Haken fällt, Fisch wird
// hochgezogen. Falscher Fisch zappelt weg (−Punkte). 60 s, Bestenliste.
import { useEffect, useRef, useState } from "react";
import { speak, speakSeq, stopSpeaking } from "@/lib/speech";
import { playPop, playWrong, playFanfare, unlockAudio } from "@/lib/sfx";
import { enableWakeLock, disableWakeLock } from "@/lib/wakeLock";
import { addPoints } from "@/lib/progress";
import { pickFrom, PRAISE } from "@/lib/phrases";
import { addScore, playableLetters, distractorFor } from "@/lib/leaderboard";
import { burstAt } from "@/lib/fx";
import { GameMenu, GameHud, useFx, say } from "@/components/GameFrame";

const GAME = "angeln";
const ROUND = 60;
const FISH = ["🐟", "🐠", "🐡", "🐬", "🦈", "🐳"];

export default function Angeln() {
  const [phase, setPhase] = useState("menu");
  const [fish, setFish] = useState([]);
  const [hud, setHud] = useState({ score: 0, target: "A", time: ROUND, streak: 0 });
  const [result, setResult] = useState(null);
  const [hook, setHook] = useState(null); // {x, y, fishId}
  const g = useRef(null);
  const raf = useRef(0);
  const areaRef = useRef(null);
  const pool = useRef(playableLetters());
  const { popup, reveal, countdown, hurt, damage, Fx } = useFx();

  useEffect(() => () => { cancelAnimationFrame(raf.current); stopSpeaking(); disableWakeLock(); }, []);
  const newTarget = (prev) => { const p = pool.current.filter((c) => c !== prev); return p[Math.floor(Math.random() * p.length)]; };

  function start() {
    unlockAudio(); enableWakeLock();
    const target = newTarget(null);
    g.current = { score: 0, target, hits: 0, streak: 0, time: ROUND, items: [], spawnIn: 0.2, last: performance.now(), id: 0, over: false, paused: 3.2 };
    setHud({ score: 0, target, time: ROUND, streak: 0 });
    setResult(null); setHook(null);
    setPhase("play");
    countdown(() => reveal(target, "Angle alle"));
    speakSeq([{ text: "Drei" }, { pause: 500 }, { text: "Zwei" }, { pause: 500 }, { text: "Eins" }, { pause: 400 }, { text: "Los geht's!" }, { pause: 200 }, { text: `Angle alle Fische mit ${say(target)}!` }]);
  }
  function end() {
    const s = g.current; if (!s || s.over) return; s.over = true;
    cancelAnimationFrame(raf.current); playFanfare(); addPoints(Math.round(s.score / 5));
    const rank = addScore(GAME, s.score);
    setResult({ score: s.score, rank, text: `${s.hits} Fische geangelt ${rank ? `· Platz ${rank} 🏆` : ""}` });
    setPhase("over");
    setTimeout(() => speak(rank === 1 ? `Neuer Rekord! ${s.score} Punkte!` : `${s.score} Punkte! ${pickFrom(PRAISE)}`), 400);
  }

  useEffect(() => {
    if (phase !== "play") return;
    const loop = (now) => {
      const s = g.current; if (!s || s.over) return;
      const dt = Math.min((now - s.last) / 1000, 0.05); s.last = now;
      if (s.paused > 0) { s.paused -= dt; raf.current = requestAnimationFrame(loop); return; }
      s.time -= dt;
      const W = areaRef.current?.clientWidth || 400;
      s.spawnIn -= dt;
      if (s.spawnIn <= 0 && s.items.length < 6) {
        s.spawnIn = 1.1;
        const dir = Math.random() < 0.5 ? 1 : -1;
        const isTarget = Math.random() < 0.45 || !s.items.some((f) => f.letter === s.target);
        s.items.push({ id: s.id++, letter: isTarget ? s.target : distractorFor(s.target, pool.current), x: dir > 0 ? -90 : W + 90, dir, vx: (40 + Math.random() * 40) * dir, y: 22 + Math.random() * 60, emoji: FISH[Math.floor(Math.random() * FISH.length)], state: "swim" });
      }
      for (const f of s.items) if (f.state === "swim") f.x += f.vx * dt;
      s.items = s.items.filter((f) => f.state !== "gone" && f.x > -120 && f.x < W + 120);
      setFish(s.items.map((f) => ({ ...f })));
      setHud((h) => { const t = Math.ceil(s.time); return h.score === s.score && h.target === s.target && h.time === t && h.streak === s.streak ? h : { score: s.score, target: s.target, time: t, streak: s.streak }; });
      if (s.time <= 0) { end(); return; }
      raf.current = requestAnimationFrame(loop);
    };
    g.current.last = performance.now();
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function cast(f, ev) {
    const s = g.current; if (!s || s.over || s.paused > 0) return;
    const it = s.items.find((x) => x.id === f.id); if (!it || it.state !== "swim") return;
    const rect = areaRef.current.getBoundingClientRect();
    setHook({ x: ev.clientX - rect.left, y: ev.clientY - rect.top, id: it.id });
    setTimeout(() => setHook(null), 700);
    if (it.letter === s.target) {
      it.state = "caught"; playPop();
      s.streak += 1; s.hits += 1;
      const gain = 10 + Math.min(s.streak, 5) * 2; s.score += gain;
      popup(ev.clientX, ev.clientY, `+${gain}`, true);
      burstAt(ev.clientX, ev.clientY, ["💦", "⭐", "✨"], 12);
      setTimeout(() => (it.state = "gone"), 600);
      if (s.hits % 5 === 0) { s.target = newTarget(s.target); reveal(s.target, "Angle alle"); s.paused = 2.2; s.items.forEach((f) => (f.state = "gone")); speakSeq([{ text: "Hey! Neuer Buchstabe!" }, { pause: 150 }, { text: `Angle alle ${say(s.target)}!` }]); }
      else speak(`${say(it.letter)}!`);
    } else {
      it.state = "flee"; playWrong(); hurt();
      s.streak = 0; s.score = Math.max(0, s.score - 5);
      popup(ev.clientX, ev.clientY, "−5", false);
      it.vx *= 3; setTimeout(() => { it.state = "swim"; it.vx /= 3; }, 700);
      speak(`Das ist ${say(it.letter)}. Angle ${say(s.target)}!`);
    }
  }

  if (phase !== "play")
    return <GameMenu emoji="🎣" title="Buchstaben-Angeln" game={GAME} result={result} onStart={start} help="Hör gut zu und angle nur die Fische mit dem gesuchten Zeichen! 60 Sekunden." />;

  return (
    <div className="race-shell" style={{ background: "linear-gradient(#bfe9ff 0%, #2f8fd6 30%, #0b4f8a 100%)" }}>
      <GameHud target={hud.target} targetLabel="Angle alle" score={hud.score} streak={hud.streak} right={<span>⏱️ {hud.time}</span>} onClose={end} />
      <div className={`race-area pond ${damage ? "damage" : ""}`} ref={areaRef}>
        <Fx />
        <div className="boat">🚣</div>
        {hook && <div className="hookline" style={{ left: hook.x, height: hook.y }}>🪝</div>}
        {fish.map((f) => (
          <button key={f.id} className={`fish ${f.state}`} style={{ left: f.x, top: `${f.y}%`, transform: `translate(-50%,-50%) scaleX(${f.dir > 0 ? 1 : -1})` }} onPointerDown={(e) => cast(f, e)}>
            <span className="fish-emoji">{f.emoji}</span>
            <span className="fish-letter" style={{ transform: `scaleX(${f.dir > 0 ? 1 : -1})` }}>{f.letter}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
