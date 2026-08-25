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
