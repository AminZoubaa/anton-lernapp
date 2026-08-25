"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { speak, speakSeq, whenSpeechDone, isSpeaking } from "@/lib/speech";
import { playPop, playWrong, playFanfare, playCorrect } from "@/lib/sfx";
import { randomOf, PRAISE, MOTIVATION } from "@/lib/phrases";
import { burstFromElement, confettiRain, pulseEl } from "@/lib/fx";
import { NUMBER_WORDS } from "@/lib/games";

// ---------- Gemeinsame Bausteine ----------

function GameTitle({ icon, title, intro }) {
  return (
    <div className="game-title">
      {icon} {title}{" "}
      <button className="speak-inline" aria-label="Anleitung vorlesen" onClick={() => speak(intro)}>
        🔊
      </button>
    </div>
  );
}

// Wiederholt die Anleitung, wenn nichts passiert
function useIdleRepeat(step, doneRef, extra) {
  const lastAction = useRef(Date.now());
  useEffect(() => {
    const iv = setInterval(() => {
      if (doneRef.current) return;
      if (isSpeaking()) {
        lastAction.current = Date.now();
        return;
      }
      if (Date.now() - lastAction.current > 8000) {
        lastAction.current = Date.now();
        speak(Math.random() < 0.5 ? step.intro : randomOf(MOTIVATION));
        if (extra) extra();
      }
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  return lastAction;
}

function useIntro(step) {
  useEffect(() => {
    const t = setTimeout(() => speak(step.intro), 400);
    return () => clearTimeout(t);
  }, [step]);
}

// Falsche Antwort in einem Minispiel: kurzer Ton, Punktabzug, Fehler zählen
// (kostet am Ende Sterne) und eine kleine Sperre, damit man sich nicht
// einfach durch schnelles Tippen auf alles zur Lösung "durchklickt".
function useWrongTap(onMistake, onPoints) {
  const lockUntil = useRef(0);
  const [penalty, setPenalty] = useState(false);
  const isLocked = () => Date.now() < lockUntil.current;
  const wrong = () => {
    playWrong();
    lockUntil.current = Date.now() + 700;
    onMistake?.();
    onPoints(-2, "−2");
    setPenalty(true);
    setTimeout(() => setPenalty(false), 700);
  };
  return { isLocked, wrong, penalty };
}

function PenaltyHint({ show }) {
  return show ? <div className="game-penalty">Falsch! −2 🪙</div> : null;
}

function finishGame(onPoints, onDone, spokenPraise) {
  playFanfare();
  confettiRain(["⭐", "🎉", "✨", "💛"], 18);
  speak(spokenPraise || randomOf(PRAISE));
  onPoints(10, "+10 Bonus");
  setTimeout(() => whenSpeechDone(onDone), 800);
}

// ---------- 1. Blasen fangen ----------

export function PopGame({ step, onDone, onPoints, onMistake }) {
  const [popped, setPopped] = useState([]);
  const [wrongId, setWrongId] = useState(null);
  const doneRef = useRef(false);
  const { isLocked, wrong, penalty } = useWrongTap(onMistake, onPoints);
  const counterRef = useRef(null);
  const lastAction = useIdleRepeat(step, doneRef);

  const layout = useMemo(
    () =>
      step.bubbles.map((b, i) => ({
        ...b,
        left: 4 + (i % 5) * 19 + Math.random() * 6,
        top: 6 + Math.floor(i / 5) * 44 + Math.random() * 14,
        delay: Math.random() * 2,
        duration: 2.6 + Math.random() * 1.6,
        hue: Math.floor(Math.random() * 5),
      })),
    [step]
  );

  useIntro(step);

  const targetsLeft =
    step.bubbles.filter((b) => b.isTarget).length -
    popped.filter((id) => step.bubbles[id]?.isTarget ?? false).length;

  function tap(bubble, ev) {
    lastAction.current = Date.now();
    if (popped.includes(bubble.id) || doneRef.current || isLocked()) return;
    if (bubble.isTarget) {
      playPop();
      burstFromElement(ev.currentTarget, ["💥", "🎇", "✨", "⭐"], 18);
      onPoints(2, "+2");
      const next = [...popped, bubble.id];
      setPopped(next);
      const remaining =
        step.bubbles.filter((b) => b.isTarget).length -
        next.filter((id) => step.bubbles.find((b) => b.id === id)?.isTarget).length;
      pulseEl(counterRef.current);
      if (remaining === 0) {
        doneRef.current = true;
        finishGame(onPoints, onDone, `Alle gefangen! ${randomOf(PRAISE)}`);
      } else {
        speak(remaining === 1 ? "Super! Nur noch einer!" : `Super! Noch ${remaining}!`);
      }
    } else {
      wrong();
      setWrongId(bubble.id);
      setTimeout(() => setWrongId(null), 500);
      // Strafe: die zuletzt gefangene Blase kommt zurück
      setPopped((p) => p.slice(0, -1));
      speak(`Das ist ${bubble.text}. Fange nur ${step.target}!`);
    }
  }

  return (
    <div className="game">
      <GameTitle icon="🫧" title={step.title} intro={step.intro} />
      <PenaltyHint show={penalty} />
      <div className="game-sub" ref={counterRef}>
        {targetsLeft === 0 ? "🎉 Alle gefangen!" : `Noch ${targetsLeft} zu fangen!`}
      </div>
      <div className="pop-arena">
        {layout.map((b) => (
          <button
            key={b.id}
            className={`bubble hue-${b.hue} ${popped.includes(b.id) ? "popped" : ""} ${
              wrongId === b.id ? "bubble-wrong" : ""
            }`}
            style={{
              left: `${b.left}%`,
              top: `${b.top}%`,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.duration}s`,
            }}
            onClick={(e) => tap(b, e)}
          >
            {b.text}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- 2. Sortieren ----------

export function SortGame({ step, onDone, onPoints, onMistake }) {
  const [placed, setPlaced] = useState(0);
  const [wrongIdx, setWrongIdx] = useState(null);
  const [hintIdx, setHintIdx] = useState(null);
  const doneRef = useRef(false);
  const { isLocked, wrong, penalty } = useWrongTap(onMistake, onPoints);
  const hintTimer = useRef(null);

  const scrambled = useMemo(() => {
    const arr = step.sequence.map((v, i) => ({ v, i }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [step]);

  useIntro(step);
  const lastAction = useIdleRepeat(step, doneRef, () => showHint());

  function showHint() {
    const idx = scrambled.findIndex((e) => e.i === placed);
    if (idx < 0) return;
    setHintIdx(idx);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHintIdx(null), 1600);
  }

  function tap(entry, idx, ev) {
    lastAction.current = Date.now();
    if (entry.i < placed || doneRef.current || isLocked()) return;
    if (entry.i === placed) {
      playPop();
      burstFromElement(ev.currentTarget, ["⭐", "✨", "💫"], 10);
      onPoints(3, "+3");
      const next = placed + 1;
      setPlaced(next);
      setHintIdx(null);
      if (next === step.sequence.length) {
        doneRef.current = true;
        finishGame(onPoints, onDone);
      } else {
        speak(`${entry.v}! Jetzt suche ${step.sequence[next]}!`);
      }
    } else {
      wrong();
      setWrongIdx(idx);
      setTimeout(() => setWrongIdx(null), 500);
      speak(`Das war ${entry.v}. Suche ${step.sequence[placed]}!`);
      showHint();
    }
  }

  return (
    <div className="game">
      <GameTitle icon="🧩" title={step.title} intro={step.intro} />
      <PenaltyHint show={penalty} />
      <div className="game-sub">Das gelbe Feld zeigt dir, was du suchst! 👇</div>
      <div className="sort-slots">
        {step.sequence.map((v, i) => (
          <div key={i} className={`sort-slot ${i < placed ? "filled" : ""} ${i === placed ? "next" : ""}`}>
            {i < placed ? v : i === placed ? <span className="sort-ghost">{v}</span> : "?"}
          </div>
        ))}
      </div>
      <div className="sort-pool">
        {scrambled.map((entry, idx) => (
          <button
            key={idx}
            className={`sort-bubble ${entry.i < placed ? "used" : ""} ${
              wrongIdx === idx ? "bubble-wrong" : ""
            } ${hintIdx === idx ? "sort-hint" : ""}`}
            onClick={(e) => tap(entry, idx, e)}
          >
            {entry.v}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- 3. Memory: Paare finden ----------

export function MemoryGame({ step, onDone, onPoints, onMistake }) {
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const flippedRef = useRef([]);
  const hideTimer = useRef(null);
  const misses = useRef(0);
  const doneRef = useRef(false);
  const { wrong, penalty } = useWrongTap(onMistake, onPoints);
  const lastAction = useIdleRepeat(step, doneRef);
  useIntro(step);

  function tap(card, ev) {
    lastAction.current = Date.now();
    if (doneRef.current || matched.includes(card.pairId)) return;
    let f = flippedRef.current;
    if (f.includes(card.id)) return;
    if (f.length >= 2) {
      clearTimeout(hideTimer.current);
      f = [];
    }
    playPop();
    f = [...f, card.id];
    flippedRef.current = f;
    setFlipped(f);
    if (f.length < 2) return;
    const [c1, c2] = f.map((id) => step.cards.find((c) => c.id === id));
    if (c1.pairId === c2.pairId) {
      playCorrect();
      burstFromElement(ev.currentTarget, ["⭐", "✨"], 10);
      const pair = step.pairs.find((p) => p.id === c1.pairId);
      speak(`Ein Paar! ${pair.speak}`);
      onPoints(4, "+4");
      const newMatched = [...matched, c1.pairId];
      setMatched(newMatched);
      flippedRef.current = [];
      setFlipped([]);
      if (newMatched.length === step.pairs.length) {
        doneRef.current = true;
        finishGame(onPoints, onDone, `Alle Paare gefunden! ${randomOf(PRAISE)}`);
      }
    } else {
      misses.current += 1;
      if (misses.current >= 3) wrong();
      else playWrong();
      hideTimer.current = setTimeout(() => {
        if (flippedRef.current === f) {
          flippedRef.current = [];
          setFlipped([]);
        }
      }, 900);
    }
  }

  return (
    <div className="game">
      <GameTitle icon="🃏" title={step.title} intro={step.intro} />
      <PenaltyHint show={penalty} />
      <div className="game-sub">
        Noch {step.pairs.length - matched.length}{" "}
        {step.pairs.length - matched.length === 1 ? "Paar" : "Paare"}!
      </div>
      <div className="memory-grid">
        {step.cards.map((card) => {
          const open = flipped.includes(card.id) || matched.includes(card.pairId);
          return (
            <button
              key={card.id}
              className={`memory-card ${open ? "open" : ""} ${
                matched.includes(card.pairId) ? "matched" : ""
              } ${card.small ? "small-face" : ""}`}
              onPointerDown={(e) => tap(card, e)}
            >
              {open ? card.face : "❓"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- 4. Nachspuren (Schreiben üben) ----------

export function TraceGame({ step, onDone, onPoints }) {
  const canvasRef = useRef(null);
  const boxRef = useRef(null);
  const drawing = useRef(false);
  const lastPt = useRef(null);
  const lengthRef = useRef(0);
  const hueRef = useRef(200);
  const [enough, setEnough] = useState(false);
  const doneRef = useRef(false);
  const lastAction = useIdleRepeat(step, doneRef);
  useIntro(step);

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;
    canvas.width = box.clientWidth;
    canvas.height = box.clientHeight;
  }, [step]);

  function pt(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function down(e) {
    lastAction.current = Date.now();
    drawing.current = true;
    lastPt.current = pt(e);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function move(e) {
    if (!drawing.current || doneRef.current) return;
    const p = pt(e);
    const ctx = canvasRef.current.getContext("2d");
    const prev = lastPt.current;
    hueRef.current = (hueRef.current + 3) % 360;
    ctx.strokeStyle = `hsl(${hueRef.current}, 85%, 55%)`;
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lengthRef.current += Math.hypot(p.x - prev.x, p.y - prev.y);
    lastPt.current = p;
    if (!enough && lengthRef.current > 350) {
      setEnough(true);
      speak("Sehr schön! Wenn du fertig bist, tippe auf den grünen Haken!");
    }
  }

  function up() {
    drawing.current = false;
  }

  function clearCanvas() {
    const c = canvasRef.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    lengthRef.current = 0;
    setEnough(false);
    speak(`Nochmal! Fahre das ${step.spoken} nach!`);
  }

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    onPoints(5, "+5");
    finishGame(onPoints, onDone, `Toll geschrieben! Das ${step.spoken} sieht super aus!`);
  }

  return (
    <div className="game">
      <GameTitle icon="✏️" title={step.title} intro={step.intro} />
      <div className="game-sub">Male mit deinem Finger über den Buchstaben!</div>
      <div className="trace-box" ref={boxRef}>
        <div className="trace-glyph">{step.glyph}</div>
        <canvas
          ref={canvasRef}
          className="trace-canvas"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
        />
      </div>
      <div className="trace-actions">
        <button className="btn btn-blue" onClick={clearCanvas}>
          🧽 NOCHMAL
        </button>
        <button className="btn" disabled={!enough} onClick={finish}>
          ✅ FERTIG
        </button>
      </div>
    </div>
  );
}

// ---------- 5. Wort bauen ----------

export function BuilderGame({ step, onDone, onPoints, onMistake }) {
  const letters = useMemo(() => step.word.split(""), [step]);
  const [pos, setPos] = useState(0);
  const [usedTiles, setUsedTiles] = useState([]);
  const [wrongIdx, setWrongIdx] = useState(null);
  const doneRef = useRef(false);
  const { isLocked, wrong, penalty } = useWrongTap(onMistake, onPoints);
  const lastAction = useIdleRepeat(step, doneRef);
  useIntro(step);

  function tap(tile, idx, ev) {
    lastAction.current = Date.now();
    if (doneRef.current || usedTiles.includes(idx) || isLocked()) return;
    if (tile === letters[pos]) {
      playPop();
      burstFromElement(ev.currentTarget, ["⭐", "✨"], 8);
      onPoints(3, "+3");
      setUsedTiles([...usedTiles, idx]);
      const next = pos + 1;
      setPos(next);
      if (next === letters.length) {
        doneRef.current = true;
        const spelled = letters.join(", ");
        speakSeq([
          { text: spelled, opts: { rate: 0.7 } },
          { pause: 300 },
          { text: `${step.word}!` },
          { pause: 300 },
          {
            text: step.isName
              ? "Du hast deinen eigenen Namen geschrieben! Wahnsinn!"
              : randomOf(PRAISE),
          },
        ]);
        playFanfare();
        confettiRain(["🎉", "⭐", "✨"], 20);
        onPoints(10, "+10 Bonus");
        setTimeout(() => whenSpeechDone(onDone), 800);
      } else {
        speak(`${tile}! Jetzt das ${letters[next]}!`);
      }
    } else {
      wrong();
      setWrongIdx(idx);
      setTimeout(() => setWrongIdx(null), 500);
      speak(`Das war ${tile}. Suche das ${letters[pos]}!`);
    }
  }

  return (
    <div className="game">
      <GameTitle icon={step.isName ? "⭐" : "🧱"} title={step.title} intro={step.intro} />
      <PenaltyHint show={penalty} />
      <div className="game-sub">
        {step.emoji} Das gelbe Feld zeigt den nächsten Buchstaben! 👇
      </div>
      <div className="sort-slots">
        {letters.map((l, i) => (
          <div key={i} className={`sort-slot ${i < pos ? "filled" : ""} ${i === pos ? "next" : ""}`}>
            {i < pos ? l : i === pos ? <span className="sort-ghost">{l}</span> : ""}
          </div>
        ))}
      </div>
      <div className="sort-pool">
        {step.tiles.map((tile, idx) => (
          <button
            key={idx}
            className={`sort-bubble ${usedTiles.includes(idx) ? "used" : ""} ${
              wrongIdx === idx ? "bubble-wrong" : ""
            }`}
            onClick={(e) => tap(tile, idx, e)}
          >
            {tile}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- 6. Buchstaben-Maulwurf ----------

export function MoleGame({ step, onDone, onPoints, onMistake }) {
  const [active, setActive] = useState(null); // {cell, letter}
  const [hits, setHits] = useState(0);
  const [wrongCell, setWrongCell] = useState(null);
  const doneRef = useRef(false);
  const { isLocked, wrong, penalty } = useWrongTap(onMistake, onPoints);
  const lastAction = useIdleRepeat(step, doneRef);
  useIntro(step);

  useEffect(() => {
    const iv = setInterval(() => {
      if (doneRef.current) return;
      const showTarget = Math.random() < 0.55;
      setActive({
        cell: Math.floor(Math.random() * 9),
        letter: showTarget
          ? step.target
          : step.others[Math.floor(Math.random() * step.others.length)],
      });
    }, 1500);
    return () => clearInterval(iv);
  }, [step]);

  function tap(cellIdx, ev) {
    lastAction.current = Date.now();
    if (doneRef.current || !active || active.cell !== cellIdx || isLocked()) return;
    if (active.letter === step.target) {
      playPop();
      burstFromElement(ev.currentTarget, ["💥", "⭐"], 10);
      onPoints(2, "+2");
      const next = hits + 1;
      setHits(next);
      setActive(null);
      if (next >= step.hitsNeeded) {
        doneRef.current = true;
        finishGame(onPoints, onDone, `Alle gefangen! ${randomOf(PRAISE)}`);
      } else {
        speak(`Getroffen! Noch ${step.hitsNeeded - next}!`);
      }
    } else {
      wrong();
      setWrongCell(cellIdx);
      setTimeout(() => setWrongCell(null), 400);
      // Falsch getippt kostet einen Stern – sonst kommt man durch wildes
      // Tippen trotzdem auf fünf Treffer
      setHits((h) => Math.max(0, h - 1));
      speak(`Das war ${active.letter}! Ein Stern weg! Fange nur das ${step.target}!`);
      setActive(null);
    }
  }

  return (
    <div className="game">
      <GameTitle icon="🐹" title={step.title} intro={step.intro} />
      <PenaltyHint show={penalty} />
      <div className="game-sub">
        {"⭐".repeat(hits)}
        {"☆".repeat(Math.max(step.hitsNeeded - hits, 0))} – Fange das{" "}
        <b>{step.target}</b>!
      </div>
      <div className="mole-grid">
        {Array.from({ length: 9 }, (_, i) => (
          <button
            key={i}
            className={`mole-hole ${active?.cell === i ? "up" : ""} ${
              wrongCell === i ? "bubble-wrong" : ""
            }`}
            onClick={(e) => tap(i, e)}
          >
            {active?.cell === i ? active.letter : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- 7. Lückenwort ----------

export function GapGame({ step, onDone, onPoints, onMistake }) {
  const [solvedGap, setSolvedGap] = useState(false);
  const [wrongIdx, setWrongIdx] = useState(null);
  const doneRef = useRef(false);
  const { isLocked, wrong, penalty } = useWrongTap(onMistake, onPoints);
  const lastAction = useIdleRepeat(step, doneRef);
  useIntro(step);

  function tap(opt, idx, ev) {
    lastAction.current = Date.now();
    if (doneRef.current || isLocked()) return;
    if (opt === step.missing) {
      playCorrect();
      burstFromElement(ev.currentTarget, ["⭐", "✨"], 12);
      setSolvedGap(true);
      onPoints(5, "+5");
      doneRef.current = true;
      speakSeq([
        { text: `${step.missing}!` },
        { pause: 250 },
        { text: `${step.word}!`, opts: { rate: 0.8 } },
        { pause: 250 },
        { text: randomOf(PRAISE) },
      ]);
      playFanfare();
      setTimeout(() => whenSpeechDone(onDone), 800);
    } else {
      wrong();
      setWrongIdx(idx);
      setTimeout(() => setWrongIdx(null), 500);
      speak(`${opt} passt nicht! Höre: ${step.word}!`);
    }
  }

  return (
    <div className="game">
      <GameTitle icon="🧯" title={step.title} intro={step.intro} />
      <PenaltyHint show={penalty} />
      <div className="game-sub">{step.emoji}</div>
      <div className="gap-word">
        {step.word.split("").map((l, i) => (
          <span key={i} className={`gap-letter ${i === step.pos ? "gap-slot" : ""}`}>
            {i === step.pos ? (solvedGap ? l : "_") : l}
          </span>
        ))}
      </div>
      <div className="sort-pool" style={{ marginTop: 20 }}>
        {step.options.map((opt, idx) => (
          <button
            key={idx}
            className={`sort-bubble ${wrongIdx === idx ? "bubble-wrong" : ""}`}
            onClick={(e) => tap(opt, idx, e)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- 8. Zähl-Tippen ----------

export function CountTapGame({ step, onDone, onPoints }) {
  const [tapped, setTapped] = useState([]);
  const doneRef = useRef(false);
  const lastAction = useIdleRepeat(step, doneRef);
  useIntro(step);

  function tap(idx, ev) {
    lastAction.current = Date.now();
    if (doneRef.current || tapped.includes(idx)) return;
    const count = tapped.length + 1;
    playPop();
    burstFromElement(ev.currentTarget, ["✨"], 6);
    setTapped([...tapped, idx]);
    if (count === step.target) {
      doneRef.current = true;
      onPoints(5, "+5");
      speakSeq([
        { text: NUMBER_WORDS[count] || String(count), opts: { rate: 0.75 } },
        { pause: 300 },
        { text: `Genau ${step.word}! ${randomOf(PRAISE)}` },
      ]);
      playFanfare();
      confettiRain(["⭐", "🎉"], 14);
      onPoints(10, "+10 Bonus");
      setTimeout(() => whenSpeechDone(onDone), 800);
    } else {
      speak(NUMBER_WORDS[count] || String(count), { rate: 0.75 });
      onPoints(1, "+1");
    }
  }

  return (
    <div className="game">
      <GameTitle icon="🔢" title={step.title} intro={step.intro} />
      <div className="game-sub">
        Getippt: {tapped.length} / {step.target}
      </div>
      <div className="counttap-grid">
        {Array.from({ length: step.total }, (_, i) => (
          <button
            key={i}
            className={`counttap-item ${tapped.includes(i) ? "tapped" : ""}`}
            onClick={(e) => tap(i, e)}
          >
            {step.emoji}
            {tapped.includes(i) && (
              <span className="counttap-num">{tapped.indexOf(i) + 1}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- 9. Blitz-Blick ----------

export function FlashGame({ step, onDone, onPoints, onMistake }) {
  const [phase, setPhase] = useState("show"); // show | pick
  const [wrongIdx, setWrongIdx] = useState(null);
  const doneRef = useRef(false);
  const { isLocked, wrong, penalty } = useWrongTap(onMistake, onPoints);
  const lastAction = useIdleRepeat(step, doneRef);
  useIntro(step);

  useEffect(() => {
    if (phase !== "show") return;
    const t = setTimeout(() => {
      setPhase("pick");
      speak("Und weg ist es! Wo war es? Tippe darauf!");
    }, 2400);
    return () => clearTimeout(t);
  }, [phase]);

  function tap(opt, idx, ev) {
    lastAction.current = Date.now();
    if (doneRef.current || phase !== "pick" || isLocked()) return;
    if (opt === step.target) {
      playCorrect();
      burstFromElement(ev.currentTarget, ["⭐", "✨", "💫"], 12);
      doneRef.current = true;
      onPoints(5, "+5");
      finishGame(onPoints, onDone, `Genau, das war ${step.spoken}! Super Gedächtnis!`);
    } else {
      wrong();
      setWrongIdx(idx);
      setTimeout(() => setWrongIdx(null), 500);
      speak(`Das war ${opt}. Schau nochmal ganz genau!`);
      setPhase("show");
    }
  }

  return (
    <div className="game">
      <GameTitle icon="⚡" title={step.title} intro={step.intro} />
      <PenaltyHint show={penalty} />
      {phase === "show" ? (
        <div className="flash-glyph">{step.target}</div>
      ) : (
        <>
          <div className="game-sub">Wo war das Zeichen?</div>
          <div className="sort-pool" style={{ marginTop: 16 }}>
            {step.options.map((opt, idx) => (
              <button
                key={idx}
                className={`sort-bubble ${wrongIdx === idx ? "bubble-wrong" : ""}`}
                onClick={(e) => tap(opt, idx, e)}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- 10. Finde das Gleiche ----------

export function SameGame({ step, onDone, onPoints, onMistake }) {
  const [wrongIdx, setWrongIdx] = useState(null);
  const doneRef = useRef(false);
  const { isLocked, wrong, penalty } = useWrongTap(onMistake, onPoints);
  const lastAction = useIdleRepeat(step, doneRef);
  useIntro(step);

  function tap(opt, idx, ev) {
    lastAction.current = Date.now();
    if (doneRef.current || isLocked()) return;
    if (idx === step.correctIndex) {
      playCorrect();
      burstFromElement(ev.currentTarget, ["⭐", "✨"], 12);
      doneRef.current = true;
      onPoints(5, "+5");
      finishGame(onPoints, onDone, `Genau! Zwei Mal ${step.spoken}! ${randomOf(PRAISE)}`);
    } else {
      wrong();
      setWrongIdx(idx);
      setTimeout(() => setWrongIdx(null), 500);
      speak(`Das ist ${opt}. Suche ${step.spoken}!`);
    }
  }

  return (
    <div className="game">
      <GameTitle icon="👯" title={step.title} intro={step.intro} />
      <PenaltyHint show={penalty} />
      <div className="flash-glyph" style={{ fontSize: "clamp(4rem, 18vw, 7rem)" }}>
        {step.target}
      </div>
      <div className="sort-pool">
        {step.options.map((opt, idx) => (
          <button
            key={idx}
            className={`sort-bubble ${wrongIdx === idx ? "bubble-wrong" : ""}`}
            onClick={(e) => tap(opt, idx, e)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- 11. Was passt nicht? ----------

export function OddGame({ step, onDone, onPoints, onMistake }) {
  const [wrongIdx, setWrongIdx] = useState(null);
  const doneRef = useRef(false);
  const { isLocked, wrong, penalty } = useWrongTap(onMistake, onPoints);
  const lastAction = useIdleRepeat(step, doneRef);
  useIntro(step);

  function tap(idx, ev) {
    lastAction.current = Date.now();
    if (doneRef.current || isLocked()) return;
    if (idx === step.oddIndex) {
      playCorrect();
      burstFromElement(ev.currentTarget, ["🕵️", "⭐", "✨"], 12);
      doneRef.current = true;
      onPoints(5, "+5");
      finishGame(
        onPoints,
        onDone,
        `Richtig! Das ${step.odd} ist anders als die ${step.target}s! Super Detektiv!`
      );
    } else {
      wrong();
      setWrongIdx(idx);
      setTimeout(() => setWrongIdx(null), 500);
      speak(`Das ist gleich! Such das Zeichen, das anders aussieht!`);
    }
  }

  return (
    <div className="game">
      <GameTitle icon="🕵️" title={step.title} intro={step.intro} />
      <PenaltyHint show={penalty} />
      <div className="game-sub">Eins ist anders – finde es!</div>
      <div className="odd-grid">
        {step.tiles.map((tile, idx) => (
          <button
            key={idx}
            className={`odd-tile ${wrongIdx === idx ? "bubble-wrong" : ""}`}
            onClick={(e) => tap(idx, e)}
          >
            {tile}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Registry ----------

export const GAME_COMPONENTS = {
  pop: PopGame,
  sort: SortGame,
  memory: MemoryGame,
  trace: TraceGame,
  builder: BuilderGame,
  mole: MoleGame,
  gap: GapGame,
  counttap: CountTapGame,
  flash: FlashGame,
  same: SameGame,
  odd: OddGame,
};
