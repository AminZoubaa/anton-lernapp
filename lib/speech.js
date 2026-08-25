// Sprachausgabe über die Web Speech API (de-DE)
let germanVoice = null;
let seqToken = 0;

function pickGermanVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
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
