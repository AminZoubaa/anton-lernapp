// Tages-Sticker (localStorage)
const STICKERS = ["🌟", "🏅", "🎈", "🍀", "🦄", "🌈", "🍭", "🚀", "🎁", "🏆", "🐝", "🌻", "🎨", "🧸", "⚡", "🍉", "🎯", "🦋", "🍓", "🎪"];
const STICKER_KEY = "anton-lernapp-stickers-v1";

export function loadStickers() {
  try { return JSON.parse(localStorage.getItem(STICKER_KEY) || "[]"); } catch { return []; }
}
export function awardDailySticker() {
  const today = new Date().toISOString().slice(0, 10);
  const list = loadStickers();
  if (list.some((s) => s.date === today)) return null;
  const st = { date: today, emoji: STICKERS[list.length % STICKERS.length] };
  localStorage.setItem(STICKER_KEY, JSON.stringify([...list, st]));
  return st;
}

