"use client";

// Bild-Rakete (Anlaute HÖREN): Bilder fliegen vorbei. "Wo hörst du ein M am
// Anfang?" – Bilder antippen, die mit dem Laut beginnen (das Wort wird beim
// Antippen gesagt). Kein Lesen. 60 s, Bestenliste.
import { useEffect, useRef, useState } from "react";
import { speak, speakSeq, stopSpeaking } from "@/lib/speech";
import { playPop, playWrong, playFanfare, unlockAudio } from "@/lib/sfx";
import { enableWakeLock, disableWakeLock } from "@/lib/wakeLock";
import { addPoints } from "@/lib/progress";
import { pickFrom, PRAISE } from "@/lib/phrases";
import { addScore } from "@/lib/leaderboard";
import { CHAPTERS } from "@/lib/content";
import { burstAt } from "@/lib/fx";
import { GameMenu, GameHud, useFx } from "@/components/GameFrame";

const GAME = "rakete";
const ROUND = 60;
// Alle Anlaut-Wörter: {letter, word, emoji}
const WORDS = CHAPTERS.filter((c) => c.id.startsWith("abc")).flatMap((c) => c.items.filter((i) => !i.inWord).flatMap((i) => i.words.map((w) => ({ letter: i.char, word: w.word, emoji: w.emojis[0] }))));
const LETTERS = [...new Set(WORDS.map((w) => w.letter))].filter((l) => WORDS.filter((w) => w.letter === l).length >= 3);

export default function Rakete() {
  const [phase, setPhase] = useState("menu");
  const [items, setItems] = useState([]);
  const [hud, setHud] = useState({ score: 0, target: "M", time: ROUND, streak: 0 });
  const [result, setResult] = useState(null);
  const g = useRef(null);
  const raf = useRef(0);
  const areaRef = useRef(null);
  const { popup, reveal, countdown, hurt, damage, Fx } = useFx();
  useEffect(() => () => { cancelAnimationFrame(raf.current); stopSpeaking(); disableWakeLock(); }, []);
  const newTarget = (prev) => { const p = LETTERS.filter((c) => c !== prev); return p[Math.floor(Math.random() * p.length)]; };

  function start() {
    unlockAudio(); enableWakeLock();
    const target = newTarget(null);
    g.current = { score: 0, target, hits: 0, streak: 0, time: ROUND, items: [], spawnIn: 0.2, last: performance.now(), id: 0, over: false, paused: 3.2 };
    setHud({ score: 0, target, time: ROUND, streak: 0 }); setResult(null); setPhase("play");
    countdown(() => reveal(target, "Hörst du am Anfang ein"));
    speakSeq([{ text: "Drei" }, { pause: 500 }, { text: "Zwei" }, { pause: 500 }, { text: "Eins" }, { pause: 400 }, { text: "Los geht's!" }, { pause: 200 }, { text: `Tippe auf alle Bilder, die mit ${target} anfangen!` }]);
  }
  function end() {
    const s = g.current; if (!s || s.over) return; s.over = true;
    cancelAnimationFrame(raf.current); playFanfare(); addPoints(Math.round(s.score / 5));
    const rank = addScore(GAME, s.score);
    setResult({ score: s.score, rank, text: `${s.hits} Anlaute erkannt ${rank ? `· Platz ${rank} 🏆` : ""}` });
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
      if (s.spawnIn <= 0 && s.items.length < 5) {
        s.spawnIn = 1.3;
        const good = WORDS.filter((w) => w.letter === s.target);
        const bad = WORDS.filter((w) => w.letter !== s.target);
        const isTarget = Math.random() < 0.45 || !s.items.some((f) => f.letter === s.target);
        const w = (isTarget ? good : bad)[Math.floor(Math.random() * (isTarget ? good : bad).length)];
        s.items.push({ id: s.id++, ...w, x: W + 80, y: 15 + Math.random() * 65, vx: -(50 + Math.random() * 40), state: "fly" });
      }
      for (const f of s.items) f.x += f.vx * dt;
      s.items = s.items.filter((f) => f.state !== "gone" && f.x > -120);
      setItems(s.items.map((f) => ({ ...f })));
      setHud((h) => { const t = Math.ceil(s.time); return h.score === s.score && h.target === s.target && h.time === t && h.streak === s.streak ? h : { score: s.score, target: s.target, time: t, streak: s.streak }; });
      if (s.time <= 0) { end(); return; }
      raf.current = requestAnimationFrame(loop);
    };
    g.current.last = performance.now();
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function tap(f, ev) {
    const s = g.current; if (!s || s.over || s.paused > 0) return;
    const it = s.items.find((x) => x.id === f.id); if (!it || it.state !== "fly") return;
    if (it.letter === s.target) {
      it.state = "gone"; playPop(); s.streak += 1; s.hits += 1;
      const gain = 10 + Math.min(s.streak, 5) * 2; s.score += gain;
      popup(ev.clientX, ev.clientY, `+${gain}`, true);
      burstAt(ev.clientX, ev.clientY, ["🚀", "⭐", "✨"], 12);
      if (s.hits % 5 === 0) { s.target = newTarget(s.target); reveal(s.target, "Hörst du am Anfang ein"); speak(`${it.word}! ${pickFrom(PRAISE)} Jetzt: Was fängt mit ${s.target} an?`); }
      else speak(`${it.word}! ${s.target} wie ${it.word}!`);
    } else {
      playWrong(); hurt(); s.streak = 0; s.score = Math.max(0, s.score - 5);
      popup(ev.clientX, ev.clientY, "−5", false);
      it.state = "wrong"; setTimeout(() => (it.state = "fly"), 600);
      speak(`${it.word} fängt mit ${it.letter} an, nicht mit ${s.target}!`);
    }
  }

  if (phase !== "play")
    return <GameMenu emoji="🚀" title="Bild-Rakete" game={GAME} result={result} onStart={start} help="Hör genau hin: Tippe nur die Bilder an, deren Wort mit dem gesuchten Laut anfängt. Beim Antippen wird das Wort gesagt." />;

  return (
    <div className="race-shell" style={{ background: "linear-gradient(#0b1a3a, #2a3d7a)" }}>
      <GameHud target={hud.target} targetLabel="Was fängt an mit" score={hud.score} streak={hud.streak} right={<span style={{ color: "#fff" }}>⏱️ {hud.time}</span>} onClose={end} />
      <div className={`race-area space ${damage ? "damage" : ""}`} ref={areaRef}>
        <Fx />
        {items.map((f) => (
          <button key={f.id} className={`rocket-item ${f.state === "wrong" ? "bubble-wrong" : ""}`} style={{ left: f.x, top: `${f.y}%` }} onPointerDown={(e) => tap(f, e)}>
            {f.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
