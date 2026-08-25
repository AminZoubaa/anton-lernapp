// Fortschritt & Punkte im localStorage (keine Datenbank nötig)
const KEY = "anton-lernapp-progress-v1";
const POINTS_KEY = "anton-lernapp-points-v1";

export function loadProgress() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveStars(chapterId, stars) {
  if (typeof window === "undefined") return;
  const p = loadProgress();
  p[chapterId] = Math.max(p[chapterId] || 0, stars);
  window.localStorage.setItem(KEY, JSON.stringify(p));
}

export function loadPoints() {
  if (typeof window === "undefined") return 0;
  const n = parseInt(window.localStorage.getItem(POINTS_KEY) || "0", 10);
  return Number.isFinite(n) ? n : 0;
}

export function addPoints(delta) {
  if (typeof window === "undefined") return 0;
  const total = Math.max(0, loadPoints() + delta);
  window.localStorage.setItem(POINTS_KEY, String(total));
  return total;
}

// ---------- Schwache Items (für Wiederholung / adaptive Schwierigkeit) ----------

const WEAK_KEY = "anton-lernapp-weak-v1";

function loadWeakAll() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(WEAK_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveWeakAll(all) {
  window.localStorage.setItem(WEAK_KEY, JSON.stringify(all));
}

export function getWeakKeys(chapterId) {
  const all = loadWeakAll();
  return Object.keys(all[chapterId] || {});
}

// Fehler gemacht → Item als schwach markieren
export function markWeak(chapterId, itemKey) {
  if (typeof window === "undefined") return;
  const all = loadWeakAll();
  all[chapterId] = all[chapterId] || {};
  all[chapterId][itemKey] = (all[chapterId][itemKey] || 0) + 1;
  saveWeakAll(all);
}

// Beim ersten Versuch richtig → Schwäche abbauen
export function easeWeak(chapterId, itemKey) {
  if (typeof window === "undefined") return;
  const all = loadWeakAll();
  if (!all[chapterId] || !all[chapterId][itemKey]) return;
  all[chapterId][itemKey] -= 1;
  if (all[chapterId][itemKey] <= 0) delete all[chapterId][itemKey];
  saveWeakAll(all);
}

// ---------- Tages-Serie (Daily Streak) ----------

const DAILY_KEY = "anton-lernapp-daily-v1";

export function loadDaily() {
  if (typeof window === "undefined") return { streak: 0, last: null };
  try {
    return JSON.parse(window.localStorage.getItem(DAILY_KEY) || '{"streak":0,"last":null}');
  } catch {
    return { streak: 0, last: null };
  }
}

// Nach jeder abgeschlossenen Lektion aufrufen
export function touchDaily() {
  if (typeof window === "undefined") return { streak: 0, last: null };
  const today = new Date().toISOString().slice(0, 10);
  const d = loadDaily();
  if (d.last === today) return d;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const next = { streak: d.last === yesterday ? d.streak + 1 : 1, last: today };
  window.localStorage.setItem(DAILY_KEY, JSON.stringify(next));
  return next;
}

// ---------- Statistik pro Lern-Item (Buchstabe / Zahl / Wort) ----------
// Für die Eltern-Übersicht und den Trainer: wie oft gesehen, wie oft beim
// ersten Versuch richtig, wann zuletzt geübt.

const STATS_KEY = "anton-lernapp-stats-v1";

export function loadStats() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STATS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function recordAttempt(chapterId, itemKey, firstTry) {
  if (typeof window === "undefined") return;
  const all = loadStats();
  const k = `${chapterId}::${itemKey}`;
  const s = all[k] || { seen: 0, right: 0, wrong: 0, last: null, streak: 0 };
  s.seen += 1;
  if (firstTry) {
    s.right += 1;
    s.streak += 1;
  } else {
    s.wrong += 1;
    s.streak = 0;
  }
  s.last = Date.now();
  all[k] = s;
  window.localStorage.setItem(STATS_KEY, JSON.stringify(all));
}

// Wackelige Items über ALLE Kapitel, sortiert nach Priorität:
// viele Fehler, lange nicht geübt, wenig Serie → zuerst
export function rankItemsForTraining() {
  const all = loadStats();
  const now = Date.now();
  return Object.entries(all)
    .map(([k, s]) => {
      const [chapterId, itemKey] = k.split("::");
      const errRate = s.seen ? s.wrong / s.seen : 0.5;
      const days = s.last ? (now - s.last) / 86400000 : 30;
      const score = errRate * 3 + Math.min(days, 14) / 7 - Math.min(s.streak, 5) * 0.3;
      return { chapterId, itemKey, ...s, score };
    })
    .sort((a, b) => b.score - a.score);
}

export function resetAll() {
  if (typeof window === "undefined") return;
  for (const k of Object.keys(window.localStorage)) {
    if (k.startsWith("anton-lernapp-")) window.localStorage.removeItem(k);
  }
}
