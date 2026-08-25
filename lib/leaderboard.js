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

// Spiele-Pool: das ganze Alphabet plus Ziffern 0–9 – jedes Spiel startet mit
// einem zufälligen Zeichen und rotiert durch alles.
export function playableLetters() {
  return [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"];
}

// Optisch ähnliche Buchstaben – als Ablenker wertvoller als zufällige
export const LOOKALIKES = {
  B: "DPR8", D: "OBP", E: "FL", F: "EPT", G: "CO", C: "GO", O: "QCDG", Q: "OG",
  M: "NW", N: "MHZ", P: "RBF", R: "PBK", V: "WYU", W: "VM", I: "JLT", J: "IL",
  L: "IJE", T: "IFJ", U: "VY", Y: "VX", X: "KY", K: "XR", H: "NMK", A: "VH", S: "Z5", Z: "SN2",
  0: "O68", 1: "I7L", 2: "Z5", 3: "8B", 4: "A9", 5: "S6", 6: "9G0", 7: "1T", 8: "B30", 9: "6P4",
};

export function distractorFor(target, pool) {
  const like = [...(LOOKALIKES[target] || "")].filter((c) => pool.includes(c));
  if (like.length && Math.random() < 0.6) return like[Math.floor(Math.random() * like.length)];
  const others = pool.filter((c) => c !== target);
  return others[Math.floor(Math.random() * others.length)] || "X";
}
