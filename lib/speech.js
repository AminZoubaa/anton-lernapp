// Sprachausgabe über die Web Speech API (de-DE)
let germanVoice = null;
let seqToken = 0;

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
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  seqToken++;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(makeUtterance(text, opts));
}

// Mehrere Teile nacheinander sprechen, mit echten Pausen dazwischen.
// Teil: { text, opts?, onStart?, onEnd? } oder { pause: Millisekunden }
export function speakSeq(parts, opts) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const token = ++seqToken;
  window.speechSynthesis.cancel();
  const queue = [...parts];

  const next = () => {
    if (token !== seqToken) return;
    const part = queue.shift();
    if (!part) return;
    if (part.pause) {
      setTimeout(next, part.pause);
      return;
    }
    const utter = makeUtterance(part.text, { ...opts, ...part.opts });
    utter.onstart = () => {
      if (token === seqToken && part.onStart) part.onStart();
    };
    utter.onend = () => {
      if (token !== seqToken) return;
      if (part.onEnd) part.onEnd();
      next();
    };
    utter.onerror = () => {
      if (token === seqToken) next();
    };
    window.speechSynthesis.speak(utter);
  };

  next();
}

export function isSpeechSupported() {
  return typeof window !== "undefined" && !!window.speechSynthesis;
}

// Callback ausführen, sobald die Sprachausgabe fertig ist
// (kleine Anlaufverzögerung, damit gerade startende Ausgabe erkannt wird)
export function whenSpeechDone(cb, { startDelay = 600, checkMs = 200 } = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    cb();
    return () => {};
  }
  let iv = null;
  const t = setTimeout(() => {
    iv = setInterval(() => {
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
        clearInterval(iv);
        cb();
      }
    }, checkMs);
  }, startDelay);
  return () => {
    clearTimeout(t);
    if (iv) clearInterval(iv);
  };
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    seqToken++;
    window.speechSynthesis.cancel();
  }
}
