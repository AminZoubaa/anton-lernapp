// Sprachausgabe: zuerst vorgerenderte MP3s (lib/audio.js), sonst Web Speech API (de-DE)
import { loadManifest, playPrerendered, isAudioPlaying, stopAudio } from "./audio";

let germanVoice = null;
let seqToken = 0;
// Läuft gerade eine Sequenz (inkl. ihrer Pausen)? Sonst denken Idle-Timer
// in einer Pause "es ist still" und quatschen dazwischen.
let seqActive = false;
// Externe Sperre (z. B. während das Kind nachspricht): keine automatischen
// Ansagen (Nudges, Wiederholungen, Motivation) – nur ausdrückliche speak()-Aufrufe.
let holds = 0;
export function holdSpeech() {
  holds++;
  return () => {
    holds = Math.max(0, holds - 1);
  };
}
export function isSpeechHeld() {
  return holds > 0;
}

// Beim Verlassen der Seite / App im Hintergrund: sofort still.
if (typeof window !== "undefined") {
  const quiet = () => {
    seqToken++;
    seqActive = false;
    stopAudio();
    window.speechSynthesis?.cancel();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") quiet();
  });
  window.addEventListener("pagehide", quiet);
}

const VOICE_KEY = "anton-lernapp-voice";

export function getSavedVoiceURI() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(VOICE_KEY);
}

// Vom Nutzer gewählte Stimme speichern und sofort verwenden
export function setPreferredVoice(voiceURI) {
  if (typeof window === "undefined") return;
  if (voiceURI) window.localStorage.setItem(VOICE_KEY, voiceURI);
  else window.localStorage.removeItem(VOICE_KEY);
  germanVoice = pickGermanVoice();
}

// Alle deutschen System-Stimmen (für die Auswahl in der UI)
export function getGermanVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const voices = window.speechSynthesis.getVoices();
  const german = voices.filter((v) => v.lang.toLowerCase().startsWith("de"));
  return german.length ? german : voices;
}

function pickGermanVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  // 1. Vom Nutzer gewählte Stimme
  const saved = getSavedVoiceURI();
  if (saved) {
    const chosen = voices.find((v) => v.voiceURI === saved);
    if (chosen) return chosen;
  }
  // 2. Automatische Wahl
  return (
    voices.find((v) => v.lang === "de-DE" && v.localService) ||
    voices.find((v) => v.lang === "de-DE") ||
    voices.find((v) => v.lang.startsWith("de")) ||
    null
  );
}

if (typeof window !== "undefined") loadManifest();

if (typeof window !== "undefined" && window.speechSynthesis) {
  germanVoice = pickGermanVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    germanVoice = pickGermanVoice();
  };
}

function makeUtterance(text, { rate = 0.85, pitch = 1.1 } = {}) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "de-DE";
  if (!germanVoice) germanVoice = pickGermanVoice();
  if (germanVoice) utter.voice = germanVoice;
  utter.rate = rate;
  utter.pitch = pitch;
  return utter;
}

export function speak(text, opts) {
  if (typeof window === "undefined") return;
  seqToken++;
  seqActive = false;
  stopAudio();
  window.speechSynthesis?.cancel();
  if (playPrerendered(text, { rate: opts?.rate ? Math.min(1, opts.rate + 0.15) : 1 })) return;
  if (!window.speechSynthesis) return;
  window.speechSynthesis.speak(makeUtterance(text, opts));
}

// Läuft gerade irgendeine Sprachausgabe (Datei oder TTS)?
// Für Idle-Timer: "beschäftigt" = spricht, Sequenz läuft (auch in Pausen)
// oder eine Sperre ist aktiv.
export function isSpeaking() {
  if (typeof window === "undefined") return false;
  return (
    seqActive ||
    holds > 0 ||
    isAudioPlaying() ||
    !!window.speechSynthesis?.speaking ||
    !!window.speechSynthesis?.pending
  );
}

// Mehrere Teile nacheinander sprechen, mit echten Pausen dazwischen.
// Teil: { text, opts?, onStart?, onEnd? } oder { pause: Millisekunden }
// Zusätzlicher Teil-Typ: { audioKey: "laut:M" } – spielt nur, wenn die
// Datei existiert, sonst wird der Teil still übersprungen.
export function speakSeq(parts, opts) {
  if (typeof window === "undefined") return;
  const token = ++seqToken;
  seqActive = true;
  stopAudio();
  window.speechSynthesis?.cancel();
  const queue = [...parts];
  // Sicherheitsnetz: iOS "verschluckt" manchmal onend – dann hängt die
  // Sequenz nicht ewig, sondern läuft nach einer Weile weiter/endet.
  let watchdog = null;
  const arm = (ms) => {
    clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      if (token === seqToken) next();
    }, ms);
  };

  const next = () => {
    if (token !== seqToken) return;
    const part = queue.shift();
    if (!part) {
      seqActive = false;
      clearTimeout(watchdog);
      return;
    }
    if (part.pause) {
      setTimeout(next, part.pause);
      return;
    }
    const key = part.audioKey || part.text;
    const pre = playPrerendered(key, { rate: 1 });
    if (pre) {
      if (part.onStart) part.onStart();
      arm(15000);
      pre.then(() => {
        if (token !== seqToken) return;
        if (part.onEnd) part.onEnd();
        next();
      });
      return;
    }
    if (part.audioKey || !window.speechSynthesis) {
      next();
      return;
    }
    const utter = makeUtterance(part.text, { ...opts, ...part.opts });
    let ended = false;
    const finish = () => {
      if (ended || token !== seqToken) return;
      ended = true;
      if (part.onEnd) part.onEnd();
      next();
    };
    utter.onstart = () => {
      if (token === seqToken && part.onStart) part.onStart();
    };
    utter.onend = finish;
    utter.onerror = finish;
    // Watchdog: ~90 ms pro Zeichen + Reserve, mindestens 3 s
    clearTimeout(watchdog);
    watchdog = setTimeout(finish, Math.max(3500, part.text.length * 150 + 3000));
    window.speechSynthesis.speak(utter);
  };

  next();
}

export function isSpeechSupported() {
  return typeof window !== "undefined" && !!window.speechSynthesis;
}

// Callback ausführen, sobald die Sprachausgabe fertig ist
// (kleine Anlaufverzögerung, damit gerade startende Ausgabe erkannt wird)
export function whenSpeechDone(cb, { startDelay = 600, checkMs = 200, maxWait = 15000 } = {}) {
  if (typeof window === "undefined") {
    cb();
    return () => {};
  }
  let iv = null;
  let fired = false;
  const fire = () => {
    if (fired) return;
    fired = true;
    clearInterval(iv);
    clearTimeout(cap);
    cb();
  };
  const t = setTimeout(() => {
    iv = setInterval(() => {
      const tts = window.speechSynthesis;
      if (!seqActive && !isAudioPlaying() && (!tts || (!tts.speaking && !tts.pending))) fire();
    }, checkMs);
  }, startDelay);
  // iOS lässt "speaking" gelegentlich hängen → nie ewig warten
  const cap = setTimeout(fire, maxWait);
  return () => {
    clearTimeout(t);
    clearTimeout(cap);
    if (iv) clearInterval(iv);
    fired = true;
  };
}

export function stopSpeaking() {
  if (typeof window !== "undefined") {
    seqToken++;
    seqActive = false;
    stopAudio();
    window.speechSynthesis?.cancel();
  }
}
