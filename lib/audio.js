// Vorgerenderte Sprach-Audios (MP3) – gleiche Stimme auf jedem Gerät, offline.
//
// public/audio/manifest.json wird von scripts/render-audio.mjs erzeugt und
// bildet "Text → Datei" ab. speak()/speakSeq() in lib/speech.js schauen hier
// zuerst nach; nur wenn es keine Datei gibt, fällt es auf die System-
// Sprachausgabe zurück. Anlaut-Laute (z. B. "mmm") liegen unter dem
// Schlüssel "laut:M" – die sollten mit einer echten Stimme aufgenommen
// werden, weil TTS reine Konsonantenlaute nicht kann.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
let manifest = null;
let loading = null;
let current = null;
const cache = new Map();

export function normalizeKey(text) {
  return String(text)
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function loadManifest() {
  if (manifest) return Promise.resolve(manifest);
  if (loading) return loading;
  if (typeof window === "undefined") return Promise.resolve({});
  loading = fetch(`${BASE}/audio/manifest.json`, { cache: "force-cache" })
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then((m) => {
      manifest = m || {};
      return manifest;
    });
  return loading;
}

export function hasAudio(keyOrText) {
  if (!manifest) return false;
  return !!(manifest[keyOrText] || manifest[normalizeKey(keyOrText)]);
}

function fileFor(keyOrText) {
  if (!manifest) return null;
  const f = manifest[keyOrText] || manifest[normalizeKey(keyOrText)];
  return f ? `${BASE}/audio/${f}` : null;
}

export function isAudioPlaying() {
  return !!current && !current.paused && !current.ended;
}

export function stopAudio() {
  if (current) {
    try {
      current.pause();
      current.currentTime = 0;
    } catch {}
    current = null;
  }
}

// Spielt eine Datei ab; löst auf, wenn fertig. Gibt null zurück, wenn es
// keine Datei gibt (→ Aufrufer nutzt TTS).
export function playPrerendered(keyOrText, { rate = 1 } = {}) {
  const src = fileFor(keyOrText);
  if (!src) return null;
  stopAudio();
  let el = cache.get(src);
  if (!el) {
    el = new Audio(src);
    el.preload = "auto";
    cache.set(src, el);
  }
  el.playbackRate = rate;
  el.currentTime = 0;
  current = el;
  return new Promise((resolve) => {
    const done = () => {
      el.removeEventListener("ended", done);
      el.removeEventListener("error", done);
      if (current === el) current = null;
      resolve();
    };
    el.addEventListener("ended", done);
    el.addEventListener("error", done);
    el.play().catch(done);
  });
}

// Alle Dateien vorladen (z. B. beim Lektionsstart), damit nichts ruckelt
export async function preloadAudio(keys) {
  await loadManifest();
  for (const k of keys) {
    const src = fileFor(k);
    if (src && !cache.has(src)) {
      const el = new Audio(src);
      el.preload = "auto";
      cache.set(src, el);
    }
  }
}
