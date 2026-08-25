// Bestenliste pro Spiel (localStorage): Top 10 mit Name und Datum
import { loadName } from "./certificate";
import { CHAPTERS } from "./content";
import { loadProgress } from "./progress";

const key = (game) => `anton-lernapp-board-${game}`;

export function loadBoard(game) {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key(game)) || "[]");
  } catch {
    return [];
  }
}

// Gibt den Platz (1-basiert) zurück oder 0, wenn nicht in den Top 10
export function addScore(game, score, extra = {}) {
  if (typeof window === "undefined") return 0;
  const name = (loadName() || "Ich").trim() || "Ich";
  const board = [...loadBoard(game), { name, score, date: Date.now(), ...extra }]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  localStorage.setItem(key(game), JSON.stringify(board));
  const idx = board.findIndex((e) => e.score === score && e.name === name && e.date);
  return idx >= 0 ? idx + 1 : 0;
}

// Welche Buchstaben darf ein Spiel benutzen? Alle aus Kapiteln mit ≥1 Stern,
// mindestens aber A–E, damit es nie "leer" ist.
export function playableLetters() {
  const p = loadProgress();
  const set = new Set("ABCDE");
  for (const c of CHAPTERS) {
    if (c.id.startsWith("abc") && p[c.id] > 0) for (const it of c.items) set.add(it.char);
  }
  return [...set];
}

// Optisch ähnliche Buchstaben – als Ablenker wertvoller als zufällige
export const LOOKALIKES = {
  B: "DPR8", D: "OBP", E: "FL", F: "EPT", G: "CO", C: "GO", O: "QCDG", Q: "OG",
  M: "NW", N: "MHZ", P: "RBF", R: "PBK", V: "WYU", W: "VM", I: "JLT", J: "IL",
  L: "IJE", T: "IFJ", U: "VY", Y: "VX", X: "KY", K: "XR", H: "NMK", A: "VH", S: "Z5", Z: "SN",
};

export function distractorFor(target, pool) {
  const like = [...(LOOKALIKES[target] || "")].filter((c) => pool.includes(c));
  if (like.length && Math.random() < 0.6) return like[Math.floor(Math.random() * like.length)];
  const others = pool.filter((c) => c !== target);
  return others[Math.floor(Math.random() * others.length)] || "X";
}
