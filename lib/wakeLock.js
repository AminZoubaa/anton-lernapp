// Bildschirm wach halten, solange eine Lektion läuft.
//
// 1. Screen Wake Lock API (Safari ab iOS 16.4, Chrome, Edge) – sauber & sparsam.
// 2. Fallback nosleep.js (spielt ein unsichtbares Mini-Video) für ältere iPads.
//
// Beide funktionieren nur nach einer Nutzer-Geste, daher wird enableWakeLock()
// beim Start-Tipp der Lektion aufgerufen. Wird die App in den Hintergrund
// geschoben, verfällt die Sperre – beim Zurückkommen holen wir sie erneut.
let sentinel = null;
let noSleep = null;
let wanted = false;
let listening = false;

async function acquire() {
  if (typeof navigator === "undefined") return;
  if ("wakeLock" in navigator) {
    try {
      if (sentinel && !sentinel.released) return;
      sentinel = await navigator.wakeLock.request("screen");
      sentinel.addEventListener?.("release", () => {
        sentinel = null;
      });
      return;
    } catch {
      // z. B. Energiesparmodus aktiv → Fallback probieren
    }
  }
  try {
    if (!noSleep) {
      const mod = await import("nosleep.js");
      noSleep = new mod.default();
    }
    await noSleep.enable();
  } catch {
    // Kein Fallback möglich – dann schläft das Gerät eben nach der Systemzeit ein
  }
}

function onVisibility() {
  if (wanted && document.visibilityState === "visible") acquire();
}

// Nach einer Nutzer-Geste aufrufen (z. B. Start-Button)
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
  try {
    noSleep?.disable?.();
  } catch {}
}
