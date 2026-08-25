"use client";

// Schatzsuche: Unter Steinen verstecken sich Zeichen. Gesuchtes Zeichen wird
// gesagt. Stein antippen → Zeichen erscheint. Richtig = Schatz 💎 in die
// Kiste, falsch = Stein rollt weg (−Punkte). 8 Schätze pro Runde, Zeit zählt.
import { useEffect, useRef, useState } from "react";
import { speak, speakSeq, stopSpeaking } from "@/lib/speech";
import { playPop, playWrong, playCorrect, playFanfare, unlockAudio } from "@/lib/sfx";
import { enableWakeLock, disableWakeLock } from "@/lib/wakeLock";
import { addPoints } from "@/lib/progress";
import { pickFrom, PRAISE } from "@/lib/phrases";
import { addScore, playableLetters, distractorFor } from "@/lib/leaderboard";
import { burstFromElement, confettiRain } from "@/lib/fx";
import { GameMenu, GameHud, useFx, say } from "@/components/GameFrame";

const GAME = "schatz";
const TREASURES = 8;
const STONES = ["🪨", "🪨", "🪨", "🌰", "🪵"];

export default function Schatz() {
  const [phase, setPhase] = useState("menu");
  const [tiles, setTiles] = useState([]);
  const [hud, setHud] = useState({ score: 0, target: "A", found: 0, streak: 0 });
  const [result, setResult] = useState(null);
  const pool = useRef(playableLetters());
  const s = useRef(null);
  const { popup, reveal, countdown, hurt, damage, Fx } = useFx();
  useEffect(() => () => { stopSpeaking(); disableWakeLock(); }, []);

  const newTarget = (prev) => { const p = pool.current.filter((c) => c !== prev); return p[Math.floor(Math.random() * p.length)]; };
  function board(target) {
    const n = 12;
    const arr = Array.from({ length: n }, (_, i) => ({ id: i, letter: i < 3 ? target : distractorFor(target, pool.current), stone: STONES[Math.floor(Math.random() * STONES.length)], state: "hidden" }));
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  }
  function start() {
    unlockAudio(); enableWakeLock();
    const target = newTarget(null);
    s.current = { score: 0, target, found: 0, streak: 0, mistakes: 0, t0: 0, over: false, ready: false };
    setTiles(board(target));
    setHud({ score: 0, target, found: 0, streak: 0 });
    setResult(null); setPhase("play");
    countdown(() => { reveal(target, "Finde"); s.current.ready = true; s.current.t0 = Date.now(); });
    speakSeq([{ text: "Drei" }, { pause: 500 }, { text: "Zwei" }, { pause: 500 }, { text: "Eins" }, { pause: 400 }, { text: "Los geht's!" }, { pause: 200 }, { text: `Finde den Schatz mit ${say(target)}! Tippe auf die Steine!` }]);
  }
  function end() {
    const st = s.current; if (!st || st.over) return; st.over = true;
    const secs = (Date.now() - st.t0) / 1000;
    const bonus = Math.max(0, Math.round(90 - secs)) ;
    st.score += bonus;
    playFanfare(); confettiRain(); addPoints(Math.round(st.score / 4));
    const rank = addScore(GAME, st.score);
    setResult({ score: st.score, rank, text: `${st.found} Schätze in ${Math.round(secs)} s · Zeit-Bonus +${bonus} ${rank ? `· Platz ${rank} 🏆` : ""}` });
    setPhase("over");
    setTimeout(() => speak(rank === 1 ? `Neuer Rekord! ${st.score} Punkte!` : `Alle Schätze! ${st.score} Punkte!`), 500);
  }
  function tap(tile, ev) {
    const st = s.current; if (!st || st.over || !st.ready || tile.state !== "hidden") return;
    if (tile.letter === st.target) {
      playCorrect(); st.streak += 1; st.found += 1;
      const gain = 10 + Math.min(st.streak, 5) * 2; st.score += gain;
      popup(ev.clientX, ev.clientY, `+${gain} 💎`, true);
      burstFromElement(ev.currentTarget, ["💎", "⭐", "✨"], 12);
      setTiles((t) => t.map((x) => (x.id === tile.id ? { ...x, state: "treasure" } : x)));
      if (st.found >= TREASURES) { setTimeout(end, 800); speak(`${say(tile.letter)}! Alle Schätze gefunden!`); return; }
      if (st.found % 3 === 0) {
        st.target = newTarget(st.target);
        setTimeout(() => { setTiles(board(st.target)); reveal(st.target, "Finde"); speak(`${pickFrom(PRAISE)} Jetzt suche ${say(st.target)}!`); }, 700);
      } else speak(`${say(tile.letter)}! Noch ${3 - (st.found % 3)}!`);
    } else {
      playWrong(); hurt(); st.streak = 0; st.mistakes += 1; st.score = Math.max(0, st.score - 5);
      popup(ev.clientX, ev.clientY, "−5", false);
      setTiles((t) => t.map((x) => (x.id === tile.id ? { ...x, state: "shown" } : x)));
      speak(`Das ist ${say(tile.letter)}. Suche ${say(st.target)}!`);
    }
    setHud({ score: st.score, target: st.target, found: st.found, streak: st.streak });
  }

  if (phase !== "play")
    return <GameMenu emoji="💎" title="Schatzsuche" game={GAME} result={result} onStart={start} help="Unter den Steinen verstecken sich Zeichen. Finde 8 Schätze mit dem gesuchten Zeichen – schnell gibt Bonus!" />;

  return (
    <div className="race-shell" style={{ background: "linear-gradient(#f3d9a4, #c9a063)" }}>
      <GameHud target={hud.target} targetLabel="Finde" score={hud.score} streak={hud.streak} right={<span>💎 {hud.found}/{TREASURES}</span>} onClose={end} />
      <div className={`race-area ${damage ? "damage" : ""}`} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Fx />
        <div className="stone-grid">
          {tiles.map((t) => (
            <button key={t.id} className={`stone ${t.state}`} onPointerDown={(e) => tap(t, e)}>
              {t.state === "hidden" ? t.stone : t.state === "treasure" ? "💎" : t.letter}
              {t.state === "treasure" && <span className="stone-letter">{t.letter}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
