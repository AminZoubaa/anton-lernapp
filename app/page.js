"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CHAPTERS } from "@/lib/content";
import { loadProgress, loadPoints, loadDaily } from "@/lib/progress";
import { armMusicAutostart, stopMusic, toggleMusic, isMusicOn } from "@/lib/music";
import { BADGES, loadEarnedBadges } from "@/lib/badges";
import FullscreenButton from "@/components/FullscreenButton";
import VoicePicker from "@/components/VoicePicker";

const POSITIONS = ["mid", "left", "mid", "right"];
const DECO = ["🎈", "⭐", "🦋", "🌈", "☁️", "🎨", "🚀", "🌟"];

function Stars({ count }) {
  return (
    <div className="chapter-stars" aria-hidden>
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= count ? "star-on" : "star-off"}>
          ⭐
        </span>
      ))}
    </div>
  );
}

function ParentLink() {
  // Für Kinder unerreichbar: 3 Sekunden gedrückt halten
  const router = useRouter();
  const timer = useRef(null);
  const [holding, setHolding] = useState(false);
  const start = () => {
    setHolding(true);
    timer.current = setTimeout(() => router.push("/eltern"), 3000);
  };
  const stop = () => {
    setHolding(false);
    clearTimeout(timer.current);
  };
  return (
    <div
      className="eltern-link"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      {holding ? "⏳ halten…" : "👨‍👩‍👧 Eltern: 3 Sekunden gedrückt halten"}
    </div>
  );
}

export default function Home() {
  const [progress, setProgress] = useState({});
  const [points, setPoints] = useState(0);
  const [ready, setReady] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [earned, setEarned] = useState([]);
  const [daily, setDaily] = useState({ streak: 0 });
  const [showVoices, setShowVoices] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
    setPoints(loadPoints());
    setMusicOn(isMusicOn());
    setEarned(loadEarnedBadges());
    setDaily(loadDaily());
    armMusicAutostart();
    setReady(true);
    return () => stopMusic();
  }, []);

  const totalStars = Object.values(progress).reduce((a, b) => a + b, 0);

  return (
    <main className="shell">
      <div className="deco-layer" aria-hidden>
        {DECO.map((e, i) => (
          <span
            key={i}
            className="deco"
            style={{
              left: `${(i * 13 + 4) % 92}%`,
              animationDelay: `${i * 1.7}s`,
              animationDuration: `${14 + (i % 5) * 3}s`,
            }}
          >
            {e}
          </span>
        ))}
      </div>

      <header className="home-header">
        <div className="home-title">🌟 ABC &amp; 123 🌟</div>
        <div className="home-sub">Tippe auf einen Kreis und los geht&apos;s!</div>
        {ready && (
          <>
            <div className="home-stats">
              <span className="points-pill big">🪙 {points}</span>
              <span className="points-pill big">⭐ {totalStars}</span>
              {daily.streak > 0 && (
                <span className="points-pill big streak-pill">🔥 {daily.streak} Tag{daily.streak > 1 ? "e" : ""}</span>
              )}
              <button
                className="music-btn"
                aria-label="Musik an/aus"
                onClick={() => setMusicOn(toggleMusic())}
              >
                {musicOn ? "🎵" : "🔇"}
              </button>
              <button
                className="music-btn"
                aria-label="Stimme auswählen"
                onClick={() => setShowVoices(true)}
              >
                🗣️
              </button>
              <FullscreenButton />
            </div>
            <div className="badge-row">
              {BADGES.map((b) => (
                <div
                  key={b.id}
                  className={`badge-chip ${earned.includes(b.id) ? "earned" : "unearned"}`}
                  title={b.title}
                >
                  <span className="badge-emoji">{b.emoji}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </header>

      {showVoices && <VoicePicker onClose={() => setShowVoices(false)} />}

      <div className="game-row">
        <Link href="/rennen" style={{ textDecoration: "none" }}>
          <div className="game-node" style={{ background: "linear-gradient(135deg, #ff9600, #ffc800)" }}>🏎️ RENNEN</div>
        </Link>
        <Link href="/ballons" style={{ textDecoration: "none" }}>
          <div className="game-node" style={{ background: "linear-gradient(135deg, #ff4b4b, #ff86d0)" }}>🎈 BALLONS</div>
        </Link>
        <Link href="/zaehlen" style={{ textDecoration: "none" }}>
          <div className="game-node" style={{ background: "linear-gradient(135deg, #58cc02, #1cb0f6)" }}>🐸 ZÄHLEN</div>
        </Link>
        <Link href="/memory" style={{ textDecoration: "none" }}>
          <div className="game-node" style={{ background: "linear-gradient(135deg, #ce82ff, #1cb0f6)" }}>🃏 MEMORY</div>
        </Link>
        <Link href="/schreiben" style={{ textDecoration: "none" }}>
          <div className="game-node" style={{ background: "linear-gradient(135deg, #1f2a44, #4a6cf7)" }}>✏️ SCHREIBEN</div>
        </Link>
      </div>
      {totalStars > 0 && (
        <Link href="/training" style={{ textDecoration: "none" }}>
          <div className="trainer-node">
            <span>🏋️</span>
            <span>TRAINER – WAS WEISST DU NOCH?</span>
          </div>
        </Link>
      )}

      <div className="map">
        {CHAPTERS.map((chapter, index) => {
          const stars = progress[chapter.id] || 0;
          const prev = CHAPTERS[index - 1];
          const unlocked = index === 0 || (prev && (progress[prev.id] || 0) > 0);
          const pos = POSITIONS[index % POSITIONS.length];

          const node = (
            <div className={`chapter-node ${unlocked ? "" : "locked"}`}>
              <div
                className={`chapter-bubble ${unlocked && stars === 0 ? "bounce-slow" : ""}`}
                style={{ background: chapter.color, "--shadow-c": "rgba(0,0,0,0.18)" }}
              >
                {unlocked ? chapter.emoji : "🔒"}
              </div>
              <div className="chapter-title">{chapter.title}</div>
              {ready && unlocked ? <Stars count={stars} /> : <div className="chapter-stars" />}
            </div>
          );

          return (
            <div key={chapter.id} className={`chapter-row ${pos}`}>
              {unlocked ? (
                <Link
                  href={`/lesson/${chapter.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {node}
                </Link>
              ) : (
                node
              )}
            </div>
          );
        })}
      </div>
      <ParentLink />
    </main>
  );
}
