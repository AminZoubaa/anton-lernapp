// Spracherkennung fürs "Nachsprechen" – über die Web Speech API
// (SpeechRecognition / webkitSpeechRecognition).
//
// Auf dem iPad: Safari unterstützt sie ab iOS 14.5; die Erkennung läuft
// über Apples Diktat-Server (Internet nötig, "Diktat" muss in den
// Einstellungen erlaubt sein). In der Home-Bildschirm-App ist sie auf
// älteren iOS-Versionen nicht verfügbar – dann liefert isRecognitionSupported()
// false und die UI zeigt den Mikro-Knopf gar nicht erst an.

function Ctor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isRecognitionSupported() {
  return !!Ctor();
}

// Einmal zuhören und den erkannten Text (klein, ohne Satzzeichen) liefern.
// Löst mit "" auf, wenn nichts verstanden wurde; wirft nie.
export function listenOnce({ lang = "de-DE", timeoutMs = 5000 } = {}) {
  return new Promise((resolve) => {
    const R = Ctor();
    if (!R) return resolve("");
    let done = false;
    const finish = (text) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        rec.stop();
      } catch {}
      resolve(normalize(text));
    };
    const rec = new R();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    rec.continuous = false;
    rec.onresult = (e) => {
      const alts = Array.from(e.results[0] || []).map((a) => a.transcript);
      finish(alts.join(" | "));
    };
    rec.onerror = () => finish("");
    rec.onend = () => finish("");
    const timer = setTimeout(() => finish(""), timeoutMs);
    try {
      rec.start();
    } catch {
      finish("");
    }
  });
}

export function normalize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-zäöüß| ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Grober Ähnlichkeitsvergleich (Levenshtein), damit "Katze" auch als
// "katze", "katzen" oder "kaze" durchgeht – Kinder sprechen nicht perfekt.
function distance(a, b) {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return d[m][n];
}

// Buchstabennamen, wie sie die Erkennung oft schreibt
const LETTER_ALIASES = {
  a: ["a", "ah"],
  b: ["b", "be", "bä"],
  c: ["c", "ce", "zeh", "ze"],
  d: ["d", "de", "deh"],
  e: ["e", "eh"],
  f: ["f", "ef", "eff"],
  g: ["g", "ge", "geh"],
  h: ["h", "ha", "haa"],
  i: ["i", "ih"],
  j: ["j", "jot", "yot"],
  k: ["k", "ka", "kah"],
  l: ["l", "el", "ell"],
  m: ["m", "em", "emm"],
  n: ["n", "en", "enn"],
  o: ["o", "oh"],
  p: ["p", "pe", "peh"],
  q: ["q", "ku", "kuh"],
  r: ["r", "er", "err"],
  s: ["s", "es", "ess"],
  t: ["t", "te", "teh", "tee"],
  u: ["u", "uh"],
  v: ["v", "vau", "fau"],
  w: ["w", "we", "weh"],
  x: ["x", "ix", "iks"],
  y: ["y", "ypsilon", "üpsilon"],
  z: ["z", "zet", "zett"],
};

// Passt das Gehörte zum erwarteten Wort/Buchstaben?
export function matches(heard, expected) {
  const target = normalize(expected);
  if (!heard || !target) return false;
  const candidates = heard.split("|").map((s) => s.trim()).filter(Boolean);
  const accepted =
    target.length === 1 ? LETTER_ALIASES[target] || [target] : [target];
  for (const c of candidates) {
    for (const word of c.split(" ")) {
      for (const acc of accepted) {
        if (word === acc) return true;
        // Bei längeren Wörtern kleine Abweichungen erlauben
        if (acc.length >= 4 && distance(word, acc) <= Math.floor(acc.length / 3)) return true;
      }
    }
  }
  return false;
}
