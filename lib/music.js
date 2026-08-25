// Sanfte Hintergrundmusik über die Web Audio API (generiert, keine Dateien)
const MUSIC_KEY = "anton-lernapp-music";

let ctx = null;
let master = null;
let playing = false;
let timer = null;
let nextTime = 0;
let step = 0;

const TEMPO = 96;
const EIGHTH = 60 / TEMPO / 2;

// Fröhliche Pentatonik-Melodie (Frequenzen in Hz), 32 Achtel = Loop
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880.0, C6 = 1046.5;
const MELODY = [
  C5, E5, G5, E5, A5, G5, E5, D5,
  C5, E5, G5, A5, C6, A5, G5, E5,
  D5, E5, G5, E5, C5, D5, E5, G5,
  A5, G5, E5, D5, C5, 0, G5, 0,
];
const BASS = [130.81, 196.0, 220.0, 174.61]; // C3 G3 A3 F3, je 8 Achtel

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.06; // sehr leise, damit die Stimme gut hörbar bleibt
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function note(freq, time, duration, type, vol) {
  if (!freq) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  osc.connect(gain).connect(master);
  osc.start(time);
  osc.stop(time + duration + 0.05);
}

function schedule() {
  if (!playing || !ctx) return;
  while (nextTime < ctx.currentTime + 0.7) {
    const i = step % MELODY.length;
    note(MELODY[i], nextTime, EIGHTH * 1.6, "triangle", 0.9);
    if (i % 8 === 0) {
      note(BASS[Math.floor(i / 8) % BASS.length], nextTime, EIGHTH * 7, "sine", 0.6);
    }
    nextTime += EIGHTH;
    step++;
  }
}

export function isMusicOn() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(MUSIC_KEY) !== "off";
}

export function startMusic() {
  const c = getCtx();
  if (!c || playing) return;
  playing = true;
  nextTime = c.currentTime + 0.1;
  step = 0;
  timer = setInterval(schedule, 200);
}

export function stopMusic() {
  playing = false;
  if (timer) clearInterval(timer);
  timer = null;
}

export function toggleMusic() {
  if (typeof window === "undefined") return false;
  if (isMusicOn()) {
    window.localStorage.setItem(MUSIC_KEY, "off");
    stopMusic();
    return false;
  }
  window.localStorage.setItem(MUSIC_KEY, "on");
  startMusic();
  return true;
}

// Nach der ersten Nutzer-Interaktion starten (Autoplay-Schutz der Browser)
export function armMusicAutostart() {
  if (typeof window === "undefined") return;
  const handler = () => {
    if (isMusicOn()) startMusic();
    window.removeEventListener("pointerdown", handler);
  };
  window.addEventListener("pointerdown", handler);
}
