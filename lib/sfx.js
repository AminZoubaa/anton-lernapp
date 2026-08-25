// Kleine Soundeffekte über die Web Audio API (kein Datei-Download nötig)
let ctx = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq, start, duration, type = "sine", volume = 0.25) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, c.currentTime + start);
  gain.gain.linearRampToValueAtTime(volume, c.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + duration + 0.05);
}

// AudioContext nach Nutzer-Geste aktivieren (Autoplay-Schutz der Browser)
export function unlockAudio() {
  getCtx();
}

export function playCorrect() {
  tone(523.25, 0, 0.15, "triangle");
  tone(659.25, 0.12, 0.15, "triangle");
  tone(783.99, 0.24, 0.3, "triangle");
}

export function playWrong() {
  tone(220, 0, 0.2, "sawtooth", 0.12);
  tone(174.61, 0.18, 0.3, "sawtooth", 0.12);
}

export function playPop() {
  tone(880, 0, 0.09, "triangle", 0.3);
  tone(1318.5, 0.06, 0.12, "triangle", 0.25);
}

export function playFanfare() {
  tone(523.25, 0, 0.18, "triangle");
  tone(659.25, 0.15, 0.18, "triangle");
  tone(783.99, 0.3, 0.18, "triangle");
  tone(1046.5, 0.45, 0.5, "triangle");
}
