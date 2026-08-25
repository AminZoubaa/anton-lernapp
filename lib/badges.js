// Abzeichen (Badges) – Belohnungen für Lernerfolge
import { CHAPTERS } from "./content";
import { loadProgress, loadPoints, loadDaily } from "./progress";

const BADGES_KEY = "anton-lernapp-badges-v1";

export const BADGES = [
  { id: "erste-lektion", emoji: "🎓", title: "Erste Lektion" },
  { id: "drei-sterne", emoji: "🌟", title: "3 Sterne geholt" },
  { id: "punkte-100", emoji: "💯", title: "100 Punkte" },
  { id: "punkte-500", emoji: "🏅", title: "500 Punkte" },
  { id: "abc-meister", emoji: "🔤", title: "ABC-Meister" },
  { id: "zahlen-profi", emoji: "🔢", title: "Zahlen-Profi" },
  { id: "woerter-kenner", emoji: "🎨", title: "Wörter-Kenner" },
  { id: "sprach-held", emoji: "🗣️", title: "Sprach-Held" },
  { id: "drei-tage", emoji: "🔥", title: "3 Tage in Folge" },
  { id: "alles-fertig", emoji: "👑", title: "Alles geschafft" },
];

function checks() {
  const p = loadProgress();
  const points = loadPoints();
  const daily = loadDaily();
  const done = (prefix) =>
    CHAPTERS.filter((c) => c.id.startsWith(prefix)).every((c) => (p[c.id] || 0) > 0);
  return {
    "erste-lektion": Object.keys(p).length >= 1,
    "drei-sterne": Object.values(p).some((s) => s >= 3),
    "punkte-100": points >= 100,
    "punkte-500": points >= 500,
    "abc-meister": done("abc-"),
    "zahlen-profi": done("zahlen-") && done("zehner-"),
    "woerter-kenner": done("vokabeln-"),
    "sprach-held": (p["sprach-profi"] || 0) > 0,
    "drei-tage": daily.streak >= 3,
    "alles-fertig": CHAPTERS.every((c) => (p[c.id] || 0) > 0),
  };
}

export function loadEarnedBadges() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(BADGES_KEY) || "[]");
  } catch {
    return [];
  }
}

// Prüft alle Abzeichen, speichert neue und gibt die NEU verdienten zurück
export function evaluateBadges() {
  if (typeof window === "undefined") return [];
  const earned = new Set(loadEarnedBadges());
  const state = checks();
  const fresh = [];
  for (const badge of BADGES) {
    if (state[badge.id] && !earned.has(badge.id)) {
      earned.add(badge.id);
      fresh.push(badge);
    }
  }
  window.localStorage.setItem(BADGES_KEY, JSON.stringify([...earned]));
  return fresh;
}
