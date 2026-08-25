"use client";

// Gemeinsamer Rahmen für die Mini-Spiele: Menü/Ende mit Bestenliste,
// HUD mit Zielzeichen, Countdown, Reveal-Overlay, Punkte-Popups, Schaden.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Leaderboard from "@/components/Leaderboard";
import FullscreenButton from "@/components/FullscreenButton";
import { speak } from "@/lib/speech";
import { NUMBER_WORDS } from "@/lib/games";

export const say = (c) => (/^\d$/.test(c) ? NUMBER_WORDS[+c] : c);

export function useFx() {
  const [popups, setPopups] = useState([]);
  const [overlay, setOverlay] = useState(null);
  const [damage, setDamage] = useState(0);
  const id = useRef(0);
  const popup = (x, y, text, good) => {
    const i = id.current++;
    setPopups((p) => [...p, { id: i, x, y, text, good }]);
    setTimeout(() => setPopups((p) => p.filter((q) => q.id !== i)), 1000);
  };
  const reveal = (letter, label) => {
    setOverlay({ kind: "reveal", letter, label });
    setTimeout(() => setOverlay(null), 1600);
  };
  const countdown = (then) => {
    [3, 2, 1].forEach((n, i) => setTimeout(() => setOverlay({ kind: "count", n }), i * 700));
    setTimeout(() => setOverlay({ kind: "count", n: "LOS!" }), 2100);
    setTimeout(() => {
      setOverlay(null);
      then?.();
    }, 2700);
  };
  const hurt = () => {
    setDamage((d) => d + 1);
    setTimeout(() => setDamage((d) => Math.max(0, d - 1)), 500);
  };
  const Fx = () => (
    <>
      {overlay?.kind === "count" && <div className="count-overlay" key={String(overlay.n)}>{overlay.n}</div>}
      {overlay?.kind === "reveal" && (
        <div className="reveal-overlay" key={overlay.letter}>
          <div className="reveal-label">{overlay.label || "Finde alle"}</div>
          <div className="reveal-letter">{overlay.letter}</div>
        </div>
      )}
      {popups.map((p) => (
        <span key={p.id} className={`score-popup ${p.good ? "good" : "bad"}`} style={{ left: p.x, top: p.y }}>{p.text}</span>
      ))}
    </>
  );
  return { popup, reveal, countdown, hurt, damage, Fx };
}

export function GameMenu({ emoji, title, help, game, result, onStart }) {
  const router = useRouter();
  return (
    <main className="shell">
      <div className="complete">
        <div className="complete-emoji">{emoji}</div>
        <div className="complete-title">{result ? `${result.score} Punkte!` : title}</div>
        <div className="points-total" style={{ maxWidth: 340 }}>{result ? result.text : help}</div>
        <button className="btn splash-start pulse" onClick={onStart}>{result ? "NOCHMAL 🔁" : "🔊 LOS GEHT'S!"}</button>
        <div className="cert-title" style={{ marginTop: 14 }}>🏆 Bestenliste</div>
        <Leaderboard game={game} highlight={result?.rank} />
        <button className="btn btn-blue" style={{ marginTop: 14 }} onClick={() => router.push("/")}>KARTE 🗺️</button>
      </div>
    </main>
  );
}

export function GameHud({ target, score, streak, right, onClose, targetLabel }) {
  return (
    <div className="race-hud" style={{ color: "#1f2a44" }}>
      <button className="close-btn" aria-label="Beenden" onClick={onClose}>✕</button>
      {target && (
        <button className="race-target" onClick={() => speak(`${targetLabel || "Suche"} ${say(target)}!`)}>🔊 {target}</button>
      )}
      <span style={{ flex: 1 }}>🪙 {score} {streak >= 3 && `🔥${streak}`}</span>
      {right}
      <FullscreenButton />
    </div>
  );
}
