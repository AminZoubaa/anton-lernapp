"use client";

// Schreiben lernen – Vollbild, Finger/Stift/Maus.
// • Tutorial: alle Striche des Zeichens werden EINMAL nacheinander animiert
//   (nummerierte Startpunkte, Pfeil = Richtung). Sobald das Kind zu schreiben
//   beginnt, verschwindet die Animation. Danach kommt sie nur noch auf Knopf.
// • Freies Schreiben: beliebig viele Striche, auch alles in einem Zug.
//   Bewertet wird nach kurzer Pause oder auf ✓: Bahn-Abdeckung, Genauigkeit,
//   Startpunkt und REIHENFOLGE entlang der Bahn.
// • Wörter: Buchstabe für Buchstabe (mit Bild), am Ende Replay des ganzen
//   Wortes als Animation + Speichern als Bild.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STROKES, WRITE_WORDS, WORD_EMOJI, samplePath, scoreGlyph, TOL } from "@/lib/strokes";
import { speak, speakSeq, stopSpeaking } from "@/lib/speech";
import { playPop, playCorrect, playWrong, playFanfare, unlockAudio } from "@/lib/sfx";
import { enableWakeLock, disableWakeLock } from "@/lib/wakeLock";
import { loadName } from "@/lib/certificate";
import { addPoints } from "@/lib/progress";
import { confettiRain } from "@/lib/fx";
import { pickFrom, PRAISE } from "@/lib/phrases";
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import WriteSheet from "@/components/WriteSheet";

const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const DIGITS = [..."0123456789"];
const PROGRESS_KEY = "anton-lernapp-writing-v1";
const SEEN_KEY = "anton-lernapp-writing-tutorial-v1";


const CUSTOM_KEY = "write-custom-words";
const loadJson = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); } catch { return d; } };

export default function Schreiben() {
  const router = useRouter();
  const [phase, setPhase] = useState("menu"); // menu | write | replay
  const [queue, setQueue] = useState([]);
  const [qi, setQi] = useState(0);
  const [tutorial, setTutorial] = useState(false); // Animation läuft
  const [verdict, setVerdict] = useState(null);
  const [best, setBest] = useState({});
  const [custom, setCustom] = useState([]); // eigene Wörter [{ w, e }]
  const [sheetMode, setSheetMode] = useState(false); // Übungsblatt 9× statt Einzelzeichen
  const [sheetGlyph, setSheetGlyph] = useState("A");
  const [newWord, setNewWord] = useState(""); const [newEmoji, setNewEmoji] = useState(""); const [addOpen, setAddOpen] = useState(false);
  const canvasRef = useRef(null);
  const boxRef = useRef(null);
  const replayRef = useRef(null);
  const strokesDrawn = useRef([]); // fertige Striche des aktuellen Zeichens
  const cur = useRef([]); // aktueller Strich
  const wordDrawings = useRef([]); // pro Buchstabe: Striche (für Replay)
  const raf = useRef(0);
  const replayTimer = useRef(0);
  const demoT = useRef(0);
  const drawing = useRef(false);
  const judgeTimer = useRef(null);
  const judged = useRef(false);
  const fb = useRef(null); // farbiges Feedback nach der Bewertung
  const liveRef = useRef(null); // { refs, hits, outside } – wächst beim Zeichnen mit
  const activePtr = useRef(null); // nur EIN Finger/Stift zeichnet; zweiter Finger (Handballen) wird ignoriert
  const liveTick = useRef(0);
  const [live, setLive] = useState(null); // Prozent-Anzeige nach jedem Strich
  const [askDone, setAskDone] = useState(false); // "Fertig? Grüner Knopf!"
  const askedRef = useRef(false);
  const glyph = queue[qi];
  const strokes = glyph ? STROKES[glyph] || [] : [];
  const wordEmoji = queue.length > 1 && queue.length <= 8 ? WORD_EMOJI[queue.join("")] || "⭐" : null;

  useEffect(() => {
    setBest(loadJson(PROGRESS_KEY, {}));
    setCustom(loadJson(CUSTOM_KEY, []));
    return () => { cancelAnimationFrame(raf.current); stopSpeaking(); disableWakeLock(); clearTimeout(judgeTimer.current); };
  }, []);

  function beginGlyph(chars, i, withTutorial) {
    strokesDrawn.current = [];
    cur.current = [];
    judged.current = false;
    fb.current = null; liveRef.current = null; activePtr.current = null; setLive(null); setAskDone(false); askedRef.current = false;
    setVerdict(null);
    demoT.current = 0;
    setTutorial(withTutorial);
  }

  function startSheet(c) { unlockAudio(); enableWakeLock(); setSheetGlyph(c); setPhase("sheet"); }

  function start(chars) {
    unlockAudio(); enableWakeLock();
    const seen = loadJson(SEEN_KEY, {});
    setQueue(chars); setQi(0);
    wordDrawings.current = [];
    setPhase("write");
    const first = chars[0];
    const tut = !seen[first];
    beginGlyph(chars, 0, tut);
    const word = chars.join("");
    speakSeq([
      { text: chars.length > 8 ? `Wir üben alle Zeichen! Zuerst das ${first}.` : chars.length > 1 ? `Wir schreiben ${word}! Zuerst das ${first}.` : `Wir schreiben das ${first}!` },
      { pause: 250 },
      { text: tut ? "Schau einmal zu, dann bist du dran." : "Schreib los! Hilfe gibt es mit dem Augen-Knopf." },
    ]);
  }

  // ---------- Canvas ----------
  useEffect(() => {
    if (phase !== "write") return;
    const canvas = canvasRef.current, box = boxRef.current, ctx = canvas.getContext("2d");
    let W = 0, H = 0, S = 0, ox = 0, oy = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = box.clientWidth; H = box.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      S = Math.min(W, H) * 0.88; ox = (W - S) / 2; oy = (H - S) / 2;
    };
    resize();
    window.addEventListener("resize", resize);
    const P = ([x, y]) => [ox + (x / 100) * S, oy + (y / 100) * S];
    const path = (pts) => { ctx.beginPath(); pts.forEach((p, i) => { const [x, y] = P(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); };
    let last = performance.now();
    // Tutorial-Zeitplan: jeder Strich 1.4 s, dazwischen 0.4 s
    const per = 1.8;
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#fffdf5"; ctx.fillRect(ox, oy, S, S);
      ctx.strokeStyle = "#e6dfc8"; ctx.lineWidth = 2;
      [0.1, 0.5, 0.9].forEach((k) => { ctx.beginPath(); ctx.moveTo(ox, oy + S * k); ctx.lineTo(ox + S, oy + S * k); ctx.stroke(); });
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      // Schablone + nummerierte Startpunkte (immer sichtbar, dezent)
      // Schablone = die erlaubte Bahn (genau so breit wie die Toleranz der Bewertung)
      ctx.strokeStyle = "#e6e6e6"; ctx.lineWidth = S * (TOL * 2) / 100;
      strokes.forEach((st) => { path(st); ctx.stroke(); });
      if (tutorial) strokes.forEach((st, i) => {
        const [sx, sy] = P(st[0]);
        ctx.fillStyle = i === 0 ? "#58cc02" : "#ff9600";
        ctx.beginPath(); ctx.arc(sx, sy, S * 0.045, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = `800 ${S * 0.05}px Andika, Arial, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), sx, sy + 1);
      });
      // Tutorial-Animation: alle Striche nacheinander
      if (tutorial) {
        demoT.current += dt;
        const t = demoT.current;
        strokes.forEach((st, i) => {
          const local = t - i * per;
          if (local <= 0) return;
          const samples = samplePath(st, 1);
          const k = Math.min(1, local / (per - 0.4));
          const n = Math.max(2, Math.floor(samples.length * k));
          ctx.strokeStyle = "#1cb0f6"; ctx.lineWidth = S * 0.075;
          path(samples.slice(0, n)); ctx.stroke();
          if (k < 1) {
            const [hx, hy] = P(samples[n - 1]);
            const [px, py] = P(samples[Math.max(0, n - 6)]);
            const ang = Math.atan2(hy - py, hx - px);
            ctx.fillStyle = "#ff9600"; ctx.beginPath(); ctx.arc(hx, hy, S * 0.05, 0, Math.PI * 2); ctx.fill();
            ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang); ctx.fillStyle = "#fff";
            ctx.beginPath(); ctx.moveTo(S * 0.03, 0); ctx.lineTo(-S * 0.015, -S * 0.02); ctx.lineTo(-S * 0.015, S * 0.02); ctx.fill(); ctx.restore();
          }
        });
        if (t > strokes.length * per + 0.6) {
          setTutorial(false);
          const seen = loadJson(SEEN_KEY, {}); seen[glyph] = true; localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
          speak("Jetzt du!");
        }
      }
      // Live: getroffene Bahn wird grün, während gezeichnet wird
      const L = liveRef.current, f = fb.current;
      if (L && !tutorial) {
        ctx.lineWidth = S * (TOL * 2) / 100; ctx.strokeStyle = "rgba(88,204,2,0.35)";
        L.refs.forEach((r, si) => {
          let run = [];
          const flush = () => { if (run.length > 1) { path(run); ctx.stroke(); } run = []; };
          r.forEach((pt, k) => { if (L.hits[si][k]) run.push(pt); else flush(); });
          flush();
        });
      }
      // Kinderspur
      ctx.strokeStyle = f ? (f.pass ? "#58cc02" : "#ff9600") : "#ff9600";
      ctx.lineWidth = S * 0.07;
      strokesDrawn.current.forEach((st) => { if (st.length > 1) { path(st); ctx.stroke(); } });
      if (cur.current.length > 1) { path(cur.current); ctx.stroke(); }
      // Daneben: sofort rot markieren (auch während des Zeichnens)
      if (L && !tutorial) {
        ctx.fillStyle = "rgba(255,40,40,0.8)";
        L.outside.forEach((p) => { const [x, y] = P(p); ctx.beginPath(); ctx.arc(x, y, S * 0.022, 0, Math.PI * 2); ctx.fill(); });
      }
      // Nach der Bewertung: Lücken in der Bahn rot
      if (f) {
        ctx.lineWidth = S * 0.035; ctx.strokeStyle = "#ff4b4b";
        f.refs.forEach((r, si) => {
          for (let k = 1; k < r.length; k++) {
            if (f.hits[si][k] && f.hits[si][k - 1]) continue;
            ctx.beginPath(); const [ax, ay] = P(r[k - 1]); const [bx, by] = P(r[k]); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
          }
        });
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener("resize", resize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qi, tutorial, verdict, queue]);

  function toBox(e) {
    const b = boxRef.current.getBoundingClientRect();
    const S = Math.min(b.width, b.height) * 0.88, ox = (b.width - S) / 2, oy = (b.height - S) / 2;
    return [((e.clientX - b.left - ox) / S) * 100, ((e.clientY - b.top - oy) / S) * 100];
  }
  // Live-Auswertung eines neuen Punktes: nahe Bahnpunkte als getroffen markieren,
  // Punkt ohne Bahn in der Nähe als "daneben" merken. Billig genug für jedes Move-Event.
  function ensureLive() {
    if (!liveRef.current) liveRef.current = { refs: strokes.map((st) => samplePath(st, 1.5)), hits: strokes.map((st) => samplePath(st, 1.5).map(() => false)), outside: [], lastOut: null };
    return liveRef.current;
  }
  function feedPoint(p) {
    const L = ensureLive(); let any = false;
    L.refs.forEach((r, si) => r.forEach((q, k) => { if (Math.hypot(q[0] - p[0], q[1] - p[1]) <= TOL) { L.hits[si][k] = true; any = true; } }));
    if (!any && (!L.lastOut || Math.hypot(L.lastOut[0] - p[0], L.lastOut[1] - p[1]) >= 1.5)) { L.outside.push(p); L.lastOut = p; }
  }
  function recomputeLive() {
    liveRef.current = null; ensureLive();
    strokesDrawn.current.forEach((st) => samplePath(st, 1.5).forEach(feedPoint));
  }
  function down(e) {
    e.preventDefault();
    if (judged.current) return;
    if (!e.isPrimary) return; // zweiter Finger (Handballen): ignorieren
    // Hängt noch ein alter Strich (pointerup kam nie/spät)? Dann sauber abschließen,
    // statt den neuen Strich zu verschlucken.
    if (drawing.current && activePtr.current !== null && activePtr.current !== e.pointerId) finishStroke();
    if (tutorial) { setTutorial(false); demoT.current = 0; stopSpeaking(); } // Platz frei machen
    clearTimeout(judgeTimer.current);
    setAskDone(false);
    activePtr.current = e.pointerId;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawing.current = true; cur.current = [toBox(e)];
    feedPoint(cur.current[0]);
  }
  function move(e) {
    e.preventDefault();
    if (!drawing.current || e.pointerId !== activePtr.current) return;
    const evs = e.nativeEvent?.getCoalescedEvents?.() || [];
    (evs.length ? evs : [e]).forEach((ev) => { const p = toBox(ev); cur.current.push(p); feedPoint(p); });
    const now = performance.now();
    if (now - liveTick.current > 150) { liveTick.current = now; const L = liveRef.current; const flat = L.hits.flat(); setLive({ coverage: flat.filter(Boolean).length / flat.length, outside: L.outside.length }); }
  }
  function up(e) {
    e.preventDefault();
    if (e.pointerId !== activePtr.current) return;
    finishStroke();
  }
  function finishStroke() {
    activePtr.current = null;
    if (!drawing.current) return;
    drawing.current = false;
    if (cur.current.length > 1) strokesDrawn.current = [...strokesDrawn.current, cur.current];
    cur.current = [];
    // KEIN Zeitlimit und keine automatische Bewertung. Wenn der Buchstabe
    // vollständig aussieht, wird nur gefragt: "Fertig? Dann grüner Knopf!"
    const r = updateLive();
    clearTimeout(judgeTimer.current);
    setAskDone(false);
    if (r && r.coverage >= 0.8) judgeTimer.current = setTimeout(() => {
      if (judged.current) return;
      setAskDone(true);
      if (!askedRef.current) { askedRef.current = true; speak("Bist du fertig? Dann drück auf den grünen Knopf!"); }
    }, 2000);
  }

  function judge() {
    clearTimeout(judgeTimer.current);
    if (judged.current || !strokesDrawn.current.length) return;
    const r = scoreGlyph(strokesDrawn.current, strokes);
    fb.current = r;
    const pct = Math.round(r.coverage * 100), out = Math.round((1 - r.precision) * 100);
    const info = `${pct} % getroffen · ${out} % daneben`;
    if (r.stars === 3) {
      judged.current = true; playCorrect();
      setVerdict({ score: 1, text: `Perfekt! ⭐⭐⭐ ${info}` });
      speak(`Perfekt! ${pickFrom(PRAISE)}`);
      setTimeout(nextGlyph, 1600);
    } else if (r.stars === 2) {
      judged.current = true; playCorrect();
      setVerdict({ score: 0.7, text: `Super! ⭐⭐ ${info}` });
      speak("Super!");
      setTimeout(nextGlyph, 1600);
    } else if (r.stars === 1) {
      judged.current = true; playPop();
      setVerdict({ score: 0.4, text: `Gut! ⭐ ${info}` });
      speak("Gut. Das geht noch genauer, aber weiter!");
      setTimeout(nextGlyph, 1800);
    } else {
      // Nicht bestanden: kurz zeigen, was fehlte (rot), dann alles löschen und neu schreiben
      judged.current = true; playWrong();
      setVerdict({ score: 0, text: `${r.why} ${info}` });
      speak(r.precision < 0.6 || r.excess > 4 ? "Das war zu viel daneben. Ich wische alles weg. Schreib es bitte noch einmal, schön auf der Bahn." : "Da fehlte noch ein Stück. Ich wische alles weg. Schreib es bitte noch einmal ganz.");
      setTimeout(() => { strokesDrawn.current = []; cur.current = []; fb.current = null; liveRef.current = null; judged.current = false; setLive(null); setVerdict(null); }, 2600);
    }
  }

  function nextGlyph() {
    wordDrawings.current = [...wordDrawings.current, { glyph, strokes: strokesDrawn.current }];
    const b = loadJson(PROGRESS_KEY, {}); b[glyph] = (b[glyph] || 0) + 1; localStorage.setItem(PROGRESS_KEY, JSON.stringify(b)); setBest(b);
    addPoints(10);
    if (qi + 1 < queue.length) {
      const next = queue[qi + 1];
      const seen = loadJson(SEEN_KEY, {});
      setQi(qi + 1);
      beginGlyph(queue, qi + 1, !seen[next]);
      speak(`${glyph}! Jetzt das ${next}.`);
    } else {
      playFanfare(); confettiRain();
      if (queue.length > 8) { speak("Alles geschafft! Und nochmal von vorn!"); setTimeout(() => start(queue), 1500); }
      else if (queue.length > 1) { setPhase("replay"); speak(`${queue.join("")}! Du hast ein ganzes Wort geschrieben! Schau, wie es aussieht.`); }
      else { speak(`${glyph}! Du kannst es schreiben! Weiter mit dem nächsten?`); setVerdict({ score: 1, text: `🎉 ${glyph} geschafft!` }); setPhase("next"); }
    }
  }

  function showTutorial() { strokesDrawn.current = []; cur.current = []; judged.current = false; fb.current = null; liveRef.current = null; setLive(null); setVerdict(null); demoT.current = 0; setTutorial(true); speak("Schau zu!"); }
  function clearAll() { clearTimeout(judgeTimer.current); strokesDrawn.current = []; cur.current = []; judged.current = false; fb.current = null; liveRef.current = null; setLive(null); setVerdict(null); speak("Alles weg. Nochmal!"); }
  function undoStroke() { clearTimeout(judgeTimer.current); strokesDrawn.current = strokesDrawn.current.slice(0, -1); judged.current = false; fb.current = null; setVerdict(null); recomputeLive(); updateLive(); }
  function updateLive() {
    if (!strokesDrawn.current.length) { setLive(null); return; }
    const r = scoreGlyph(strokesDrawn.current, strokes);
    setLive(r);
    return r;
  }

  // ---------- Wort-Replay: alle Buchstaben nebeneinander, nacheinander animiert ----------
  useEffect(() => {
    if (phase !== "replay") return;
    const canvas = replayRef.current; const ctx = canvas.getContext("2d");
    const n = wordDrawings.current.length;
    const cell = 300, pad = 30;
    canvas.width = n * cell + pad * 2; canvas.height = cell + pad * 2;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 22; ctx.strokeStyle = "#1f2a44";
    // alle Punkte in Reihenfolge, mit Buchstaben-Versatz
    const seq = [];
    wordDrawings.current.forEach((d, li) => d.strokes.forEach((st) => seq.push(st.map(([x, y]) => [pad + li * cell + (x / 100) * cell, pad + (y / 100) * cell]))));
    // Fehler vorher: pi += 2 übersprang jedes zweite Teilstück (Lücken, Punkte).
    // Jetzt: 3 Teilstücke pro Frame, jedes einzelne gezeichnet.
    let si = 0, pi = 1;
    const step = () => {
      if (si >= seq.length) return;
      const st = seq[si];
      for (let k = 0; k < 3 && pi < st.length; k++, pi++) {
        ctx.beginPath(); ctx.moveTo(st[pi - 1][0], st[pi - 1][1]); ctx.lineTo(st[pi][0], st[pi][1]); ctx.stroke();
      }
      if (pi >= st.length) { si++; pi = 1; replayTimer.current = setTimeout(step, 180); } else replayTimer.current = requestAnimationFrame(step);
    };
    replayTimer.current = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(replayTimer.current); clearTimeout(replayTimer.current); };
  }, [phase]);

  // Animiertes GIF der Wort-Animation (Strich für Strich), zum Teilen
  const [gifBusy, setGifBusy] = useState(false);
  async function saveGif() {
    if (gifBusy) return;
    setGifBusy(true);
    speak("Ich baue das Filmchen …");
    await new Promise((r) => setTimeout(r, 50));
    try {
      const n = wordDrawings.current.length;
      const cell = 160, pad = 16;
      const W = n * cell + pad * 2, H = cell + pad * 2;
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const ctx = c.getContext("2d");
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 12; ctx.strokeStyle = "#1f2a44";
      const seq = [];
      wordDrawings.current.forEach((dd, li) => dd.strokes.forEach((st) => seq.push(st.map(([x, y]) => [pad + li * cell + (x / 100) * cell, pad + (y / 100) * cell]))));
      const gif = GIFEncoder();
      const frame = (delay) => {
        const { data } = ctx.getImageData(0, 0, W, H);
        const palette = quantize(data, 16);
        const index = applyPalette(data, palette);
        gif.writeFrame(index, W, H, { palette, delay });
      };
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      frame(300);
      for (const st of seq) {
        // 6 Punkte pro Frame, alle Teilstücke gezeichnet (keine Lücken), 30 ms/Frame
        for (let i = 1; i < st.length; i += 6) {
          ctx.beginPath(); ctx.moveTo(st[i - 1][0], st[i - 1][1]);
          for (let k = i; k < Math.min(st.length, i + 6); k++) ctx.lineTo(st[k][0], st[k][1]);
          ctx.stroke();
          frame(30);
        }
        ctx.beginPath(); ctx.moveTo(st[st.length - 2][0], st[st.length - 2][1]); ctx.lineTo(st[st.length - 1][0], st[st.length - 1][1]); ctx.stroke();
        frame(200);
      }
      frame(1200);
      gif.finish();
      const blob = new Blob([gif.bytes()], { type: "image/gif" });
      const file = new File([blob], `${queue.join("")}.gif`, { type: "image/gif" });
      if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: queue.join("") }); } catch {} }
      else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); }
    } finally {
      setGifBusy(false);
    }
  }

  async function saveWord() {
    const canvas = replayRef.current;
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    const file = new File([blob], `${queue.join("")}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: queue.join("") }); } catch {} return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  }

  if (phase === "menu") {
    const name = (loadName() || "").toUpperCase().replace(/[^A-Z]/g, "");
    const words = [...(name.length >= 2 ? [name] : []), ...WRITE_WORDS, ...custom.map((c) => c.w)];
    const emojiOf = (w) => (custom.find((c) => c.w === w)?.e) || WORD_EMOJI[w];
    const addWord = () => {
      const w = newWord.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (w.length < 2 || words.includes(w)) { setNewWord(""); return; }
      const list = [...custom, { w, e: newEmoji.trim() }];
      setCustom(list); localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
      setNewWord(""); setNewEmoji("");
    };
    const delWord = (w) => { const list = custom.filter((c) => c.w !== w); setCustom(list); localStorage.setItem(CUSTOM_KEY, JSON.stringify(list)); };
    return (
      <main className="shell write-shell-menu">
        <header className="home-header">
          <div className="home-title">✏️ Schreiben</div>
          <div className="home-sub">Tippe einen Buchstaben, eine Zahl oder ein Wort</div>
        </header>
        <section className="eltern-box" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <strong>Wie üben?</strong>
          <button className={`btn ${!sheetMode ? "" : "btn-blue"}`} style={{ minHeight: 0, padding: "8px 14px" }} onClick={() => setSheetMode(false)}>🔍 GROSS · 1×</button>
          <button className={`btn ${sheetMode ? "" : "btn-blue"}`} style={{ minHeight: 0, padding: "8px 14px" }} onClick={() => setSheetMode(true)}>📝 ÜBUNGSBLATT · 9× (STIFT)</button>
        </section>
        <section className="eltern-box"><h3>Buchstaben <button className="btn" style={{ minHeight: 0, padding: "6px 12px", fontSize: "0.9rem", marginLeft: 8 }} onClick={() => start(LETTERS)}>🔤 ALLE A–Z ÜBEN</button></h3>
          <div className="write-grid">{LETTERS.map((c) => <button key={c} className={`write-tile ${best[c] ? "done" : ""}`} onClick={() => (sheetMode ? startSheet(c) : start([c]))}>{c}{best[c] > 0 && <span className="write-check">✓</span>}</button>)}</div>
        </section>
        <section className="eltern-box"><h3>Zahlen <button className="btn" style={{ minHeight: 0, padding: "6px 12px", fontSize: "0.9rem", marginLeft: 8 }} onClick={() => start(DIGITS)}>🔢 ALLE 0–9 ÜBEN</button></h3>
          <div className="write-grid">{DIGITS.map((c) => <button key={c} className={`write-tile ${best[c] ? "done" : ""}`} onClick={() => (sheetMode ? startSheet(c) : start([c]))}>{c}</button>)}</div>
        </section>
        <section className="eltern-box"><h3>Wörter</h3>
          <div className="write-words">{words.map((w) => <button key={w} className="btn btn-blue" onClick={() => start([...w])}><span>{w === name ? "⭐" : emojiOf(w) || "✏️"}</span>{w}</button>)}</div>
          <div style={{ marginTop: 12 }}>
            {!addOpen ? <button className="btn btn-blue" style={{ minHeight: 0, padding: "8px 14px", fontSize: "0.95rem" }} onClick={() => setAddOpen(true)}>➕ EIGENES WORT HINZUFÜGEN</button> : (
              <div className="write-add">
                <input value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="WORT (nur A–Z, 0–9)" maxLength={12} autoCapitalize="characters" />
                <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} placeholder="Bild 🐶 (optional)" maxLength={3} style={{ width: 130 }} />
                <button className="btn" style={{ minHeight: 0, padding: "8px 14px" }} onClick={addWord}>HINZUFÜGEN</button>
                <button className="btn btn-blue" style={{ minHeight: 0, padding: "8px 14px" }} onClick={() => setAddOpen(false)}>SCHLIESSEN</button>
                {custom.length > 0 && <div className="write-custom-list">{custom.map((c) => <span key={c.w}>{c.e} {c.w} <button onClick={() => delWord(c.w)} aria-label="löschen">✕</button></span>)}</div>}
              </div>
            )}
          </div>
        </section>
        <button className="btn btn-blue" style={{ margin: "10px auto 30px", display: "block" }} onClick={() => router.push("/")}>⬅️ ZURÜCK</button>
      </main>
    );
  }

  if (phase === "replay")
    return (
      <div className="race-shell write-shell">
        <div className="write-replay">
          <div className="memory-won-title">🎉 {wordEmoji} {queue.join("")}</div>
          <canvas ref={replayRef} />
          <div className="write-bar">
            <button className="btn btn-blue" onClick={() => setPhase((p) => (setTimeout(() => setPhase("replay"), 0), "replay-reset"))}>▶️ NOCHMAL ZEIGEN</button>
            <button className="btn btn-blue" onClick={saveWord}>🖼️ ALS BILD</button>
            <button className="btn btn-blue" onClick={saveGif} disabled={gifBusy}>{gifBusy ? "⏳ …" : "🎬 ALS GIF (ANIMIERT)"}</button>
            <button className="btn" onClick={() => setPhase("menu")}>WEITER ✅</button>
          </div>
        </div>
      </div>
    );
  if (phase === "replay-reset") return <div className="race-shell write-shell" />;

  if (phase === "sheet") {
    const list = DIGITS.includes(sheetGlyph) ? DIGITS : LETTERS;
    const nxt = list[(list.indexOf(sheetGlyph) + 1) % list.length];
    return <WriteSheet key={sheetGlyph} glyph={sheetGlyph} onNext={() => setSheetGlyph(nxt)} onMenu={() => setPhase("menu")} />;
  }

  if (phase === "next") {
    const list = DIGITS.includes(glyph) ? DIGITS : LETTERS;
    const nxt = list[(list.indexOf(glyph) + 1) % list.length];
    return (
      <div className="race-shell write-shell">
        <div className="write-replay">
          <div className="complete-emoji" style={{ fontSize: "5rem" }}>🎉</div>
          <div className="memory-won-title">{glyph} geschafft!</div>
          <div className="write-bar">
            <button className="btn" onClick={() => start([nxt])}>NÄCHSTER: {nxt} ➡️</button>
            <button className="btn btn-blue" onClick={() => start([glyph])}>NOCHMAL {glyph} 🔁</button>
            <button className="btn btn-blue" onClick={() => setPhase("menu")}>MENÜ</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="race-shell write-shell">
      <div className="race-hud" style={{ color: "#1f2a44" }}>
        <button className="close-btn" aria-label="Beenden" onClick={() => { stopSpeaking(); setPhase("menu"); }}>✕</button>
        {wordEmoji && <span style={{ fontSize: "2rem" }}>{wordEmoji}</span>}
        {queue.length > 8 ? (
          <div className="write-word"><span className="now">{glyph}</span><span style={{ fontSize: "1rem", color: "#666" }}>{qi + 1}/{queue.length}</span></div>
        ) : (
          <div className="write-word">{queue.map((c, i) => <span key={i} className={i < qi ? "ok" : i === qi ? "now" : ""}>{c}</span>)}</div>
        )}
        <span style={{ flex: 1 }} />
        <span className="write-step">{strokes.length} {strokes.length === 1 ? "Strich" : "Striche"}</span>
      </div>
      <div className="race-area write-area" ref={boxRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <canvas ref={canvasRef} className="game-canvas" />
        {tutorial && <div className="write-hint">👀 Schau zu … (tippe, um selbst zu schreiben)</div>}
        {!tutorial && !verdict && <div className={`write-hint ${askDone ? "ask" : "go"}`}>{askDone ? "Fertig? Dann drück den grünen Knopf ⬇️" : `✏️ ${glyph}${live ? ` · 🎯 ${Math.round(live.coverage * 100)} %${live.outside > 3 || (live.precision != null && live.precision < 0.9) ? " · 🔴 daneben" : ""}` : " nachmalen"}`}</div>}
        {verdict && <div className={`write-verdict ${verdict.score >= 0.65 ? "good" : "bad"}`}>{verdict.text}</div>}
      </div>
      <button className={`btn write-done ${askDone ? "ask" : ""}`} onClick={judge}>✅ FERTIG{askDone ? " – BIST DU FERTIG?" : ""}</button>
      <div className="write-bar">
        <button className="btn btn-blue" onClick={showTutorial}>👀 HILFE</button>
        <button className="btn btn-blue" onClick={undoStroke}>↩️ STRICH ZURÜCK</button>
        <button className="btn btn-blue" onClick={clearAll}>🧽 ALLES WEG</button>
        <button className="btn btn-blue" onClick={() => speak(`Das ist das ${glyph}!`)}>🔊 {glyph}</button>
      </div>
    </div>
  );
}
