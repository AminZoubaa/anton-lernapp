// Bildschirm wach halten, solange eine Lektion läuft – nur über die
// Screen Wake Lock API (Safari ab iOS 16.4, Chrome, Edge).
//
// Bewusst KEIN Video/Audio-Trick (nosleep.js): der läuft auf dem iPad als
// "Medienwiedergabe" im Hintergrund weiter, stört die Sprachausgabe und
// lässt sich vom Nutzer nicht stoppen.
let sentinel = null;
let wanted = false;
let listening = false;

async function acquire() {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
  try {
    if (sentinel && !sentinel.released) return;
    sentinel = await navigator.wakeLock.request("screen");
    sentinel.addEventListener?.("release", () => {
      sentinel = null;
    });
  } catch {
    // z. B. Energiesparmodus → dann eben nicht
  }
}

function onVisibility() {
  if (wanted && document.visibilityState === "visible") acquire();
}

export function enableWakeLock() {
  wanted = true;
  if (!listening && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
    listening = true;
  }
  acquire();
}

export function disableWakeLock() {
  wanted = false;
  try {
    sentinel?.release?.();
  } catch {}
  sentinel = null;
}
