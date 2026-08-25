"use client";

// 🏎️ Buchstaben-Rennen: Hauptspiel über das ganze Alphabet.
// Sammle die richtigen Buchstaben, um den Tank zu füllen –
// falsche Buchstaben explodieren, beschädigen das Auto und kosten Sprit!

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { speak, stopSpeaking } from "@/lib/speech";
import { playPop, playWrong, playFanfare, unlockAudio } from "@/lib/sfx";
import { enableWakeLock, disableWakeLock } from "@/lib/wakeLock";
import { addPoints } from "@/lib/progress";
import { burstAt } from "@/lib/fx";
import { pickFrom, PRAISE } from "@/lib/phrases";
import { ALL_LETTERS } from "@/lib/content";
import { isMusicOn, startMusic, stopMusic } from "@/lib/music";
import FullscreenButton from "@/components/FullscreenButton";

const HIGHSCORE_KEY = "anton-lernapp-race-highscore";
const LANES = 3;

function randLetter(except) {
  let l;
  do {
    l = ALL_LETTERS[Math.floor(Math.random() * 26)]; // A-Z ohne Umlaute
  } while (l === except);
  return l;
}

function loadHighscore() {
  if (typeof window === "undefined") return 0;
  const n = parseInt(window.localStorage.getItem(HIGHSCORE_KEY) || "0", 10);
  return Number.isFinite(n) ? n : 0;
}

export default function RaceGame() {
  const router = useRouter();
  const [phase, setPhase] = useState("start"); // start | play | over
  const [, setTick] = useState(0);
  const [shaking, setShaking] = useState(false);
  const arenaRef = useRef(null);
  const g = useRef(null); // Spielzustand
  const rafRef = useRef(null);
  const idRef = useRef(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    setBest(loadHighscore());
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stopSpeaking();
      stopMusic();
      disableWakeLock();
    };
  }, []);

  function initGame() {
    g.current = {
      fuel: 100,
      score: 0,
      combo: 0,
      damage: 0,
      collected: 0,
      target: randLetter(),
      letters: [],
      lane: 1,
      speed: 150,
      spawnIn: 0.6,
      time: 0,
      last: performance.now(),
    };
  }

  function startGame() {
    unlockAudio();
    enableWakeLock();
    if (isMusicOn()) startMusic();
    initGame();
    setPhase("play");
    speak(`Los geht's! Sammle alle ${g.current.target}! Tippe auf die Spur, um zu lenken!`);
  }

  // ---------- Spiel-Schleife ----------

  useEffect(() => {
    if (phase !== "play") return;

    const loop = (now) => {
      const s = g.current;
      const arena = arenaRef.current;
      if (!s || !arena) return;
      const dt = Math.min((now - s.last) / 1000, 0.05);
      s.last = now;
      s.time += dt;

      // Sprit verbraucht sich beim Fahren
      s.fuel -= (3 + s.damage * 0.8) * dt;
      s.speed = Math.min(150 + s.time * 4, 340);

      // Buchstaben spawnen
      s.spawnIn -= dt;
      if (s.spawnIn <= 0) {
        s.spawnIn = Math.max(0.72, 1.35 - s.time * 0.012);
        const isTarget = Math.random() < 0.5;
        s.letters.push({
          id: idRef.current++,
          lane: Math.floor(Math.random() * LANES),
          letter: isTarget ? s.target : randLetter(s.target),
          y: -70,
        });
      }

      const H = arena.clientHeight;
      const rect = arena.getBoundingClientRect();
      const laneX = (lane) => rect.left + (rect.width * (lane + 0.5)) / LANES;

      // Bewegen + Kollision
      for (const l of s.letters) l.y += s.speed * dt;
      const keep = [];
      for (const l of s.letters) {
        const hit = l.lane === s.lane && l.y > H - 170 && l.y < H - 60;
        if (hit) {
          if (l.letter === s.target) {
            playPop();
            burstAt(laneX(l.lane), rect.top + H - 120, ["⭐", "✨", "⛽"], 12);
            s.combo += 1;
            s.collected += 1;
            s.score += 10 + (s.combo >= 3 ? 5 : 0);
            s.fuel = Math.min(100, s.fuel + 18);
            if (s.combo % 5 === 0) {
              s.score += 20;
              speak(`${pickFrom(PRAISE)} Bonus!`);
            }
            // Neues Ziel nach je 4 gesammelten Buchstaben
            if (s.collected % 4 === 0) {
              s.target = randLetter(s.target);
              speak(`Jetzt sammle alle ${s.target}!`);
            }
          } else {
            playWrong();
            burstAt(laneX(l.lane), rect.top + H - 120, ["💥", "🔥", "💨"], 18);
            s.combo = 0;
            s.damage += 1;
            s.fuel -= 15;
            setShaking(true);
            setTimeout(() => setShaking(false), 450);
            speak(`Autsch! Das war ${l.letter}! Sammle ${s.target}!`);
          }
        } else if (l.y < H + 60) {
          keep.push(l);
        }
      }
      s.letters = keep;

      if (s.fuel <= 0) {
        s.fuel = 0;
        endGame();
        return;
      }

      setTick((t) => t + 1);
      rafRef.current = requestAnimationFrame(loop);
    };

    g.current.last = performance.now();
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function endGame() {
    const s = g.current;
    playFanfare();
    const coins = Math.max(5, Math.round(s.score / 5));
    addPoints(coins);
    s.coins = coins;
    const prev = loadHighscore();
    s.newRecord = s.score > prev;
    if (s.newRecord) {
      window.localStorage.setItem(HIGHSCORE_KEY, String(s.score));
      setBest(s.score);
    }
    setPhase("over");
    speak(
      s.newRecord
        ? `Der Tank ist leer! ${s.score} Punkte! Das ist ein neuer Rekord! Wahnsinn!`
        : `Der Tank ist leer! Du hast ${s.score} Punkte gesammelt! ${pickFrom(PRAISE)}`
    );
  }

  // ---------- Steuerung ----------

  function steer(e) {
    if (phase !== "play") return;
    const rect = arenaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    g.current.lane = Math.max(0, Math.min(LANES - 1, Math.floor((x / rect.width) * LANES)));
  }

  useEffect(() => {
    const onKey = (e) => {
      if (phase !== "play") return;
      if (e.key === "ArrowLeft") g.current.lane = Math.max(0, g.current.lane - 1);
      if (e.key === "ArrowRight") g.current.lane = Math.min(LANES - 1, g.current.lane + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  // ---------- Render ----------

  const s = g.current;
  const fuelPct = s ? Math.max(0, Math.round(s.fuel)) : 100;

  return (
    <main className="race-shell">
      {phase === "play" && s && (
        <div className="race-hud">
          <button className="close-btn" aria-label="Beenden" onClick={() => router.push("/")}>
            ✕
          </button>
          <div className="race-target pulse">
            Sammle: <b>{s.target}</b>
          </div>
          <div className="race-fuel">
            <span>⛽</span>
            <div className="fuel-track">
              <div
                className={`fuel-fill ${fuelPct < 30 ? "low" : ""}`}
                style={{ width: `${fuelPct}%` }}
              />
            </div>
          </div>
          <div className="race-score">🏆 {s.score}</div>
          <FullscreenButton />
        </div>
      )}

      <div
        className={`race-arena ${shaking ? "race-shake" : ""}`}
        ref={arenaRef}
        onPointerDown={steer}
      >
        {/* Straße */}
        <div className="race-road">
          <div className="road-line" style={{ left: "33.33%" }} />
          <div className="road-line" style={{ left: "66.66%" }} />
        </div>

        {/* Buchstaben */}
        {phase === "play" &&
          s?.letters.map((l) => (
            <div
              key={l.id}
              className={`race-letter ${l.letter === s.target ? "is-target" : ""}`}
              style={{
                left: `${((l.lane + 0.5) / LANES) * 100}%`,
                top: l.y,
              }}
            >
              {l.letter}
            </div>
          ))}

        {/* Auto */}
        {phase !== "start" && s && (
          <div
            className="race-car"
            style={{ left: `${((s.lane + 0.5) / LANES) * 100}%` }}
          >
            {s.damage >= 4 ? "🚗🔥" : s.damage >= 2 ? "🚗💨" : "🏎️"}
          </div>
        )}

        {/* Start-Overlay */}
        {phase === "start" && (
          <div className="race-overlay">
            <div className="race-logo">🏎️</div>
            <h1 className="race-title">BUCHSTABEN-RENNEN</h1>
            <p className="race-info">
              Sammle die richtigen Buchstaben für deinen Tank! ⛽<br />
              Falsche Buchstaben explodieren! 💥<br />
              Tippe auf die Spur, um zu lenken!
            </p>
            <div className="race-best">🏆 Rekord: {best}</div>
            <button className="btn splash-start pulse" onClick={startGame}>
              🔊 START!
            </button>
            <button className="btn btn-blue" onClick={() => router.push("/")}>
              🗺️ ZURÜCK
            </button>
          </div>
        )}

        {/* Game-Over-Overlay */}
        {phase === "over" && s && (
          <div className="race-overlay">
            <div className="race-logo">{s.newRecord ? "🏆" : "🏁"}</div>
            <h1 className="race-title">
              {s.newRecord ? "NEUER REKORD!" : "TANK LEER!"}
            </h1>
            <div className="race-result">
              <div>🏆 Punkte: <b>{s.score}</b></div>
              <div>🔤 Buchstaben: <b>{s.collected}</b></div>
              <div>🥇 Rekord: <b>{Math.max(best, s.score)}</b></div>
              <div>🪙 +{s.coins} Münzen</div>
            </div>
            <button className="btn" onClick={startGame}>
              🔁 NOCHMAL!
            </button>
            <button className="btn btn-blue" onClick={() => router.push("/")}>
              🗺️ ZUR KARTE
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
