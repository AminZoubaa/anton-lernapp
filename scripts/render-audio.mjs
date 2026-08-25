// Rendert alle festen Sprach-Texte der App als MP3 nach public/audio/
// und schreibt public/audio/manifest.json (Text → Datei).
//
//   npm run audio -- --voice voices/de-kerstin-low.onnx   (Piper, Open Source, offline)
//   npm run audio -- --list                                (nur zeigen, was gerendert würde)
//
// Voraussetzungen (einmalig):  pip install piper-tts   +   ffmpeg
// Stimmen (kostenlos, GitHub-Release rhasspy/piper v0.0.2):
//   voice-de-kerstin-low, voice-de-ramona-low (weiblich), voice-de-eva_k-x-low (weiblich, kleiner)
//   → nach voices/ entpacken. Standard ist kerstin.
//
// Aufruf mit:  node --experimental-default-type=module scripts/render-audio.mjs …
// (steht so in package.json unter "audio")
//
// Nur die Texte, die feststehen, werden gerendert. Sätze mit variablen Teilen
// (z. B. "Noch 3 zu fangen") spricht weiterhin die System-Stimme – dafür sorgt
// der Fallback in lib/speech.js.
// Anlaut-LAUTE (mmm, sss, bə …) erzeugt scripts/tts.py direkt aus Phonemen
// mit derselben Stimme. Eigene Aufnahmen in public/audio/laute/<BUCHSTABE>.mp3
// haben Vorrang, wenn vorhanden.
import { mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const VOICE = opt("voice", "voices/de-kerstin-low.onnx");
const LIST = args.includes("--list");
const OUT_DIR = "public/audio";
const SPEECH_DIR = join(OUT_DIR, "sprache");
const LAUTE_DIR = join(OUT_DIR, "laute");
mkdirSync(SPEECH_DIR, { recursive: true });
mkdirSync(LAUTE_DIR, { recursive: true });

// ---------- 1. Alle festen Texte einsammeln ----------

const { CHAPTERS } = await import("../lib/content.js");
const { PRAISE, TRY_AGAIN, MOTIVATION, STREAK_PRAISE } = await import("../lib/phrases.js");
const { FUN_FACTS } = await import("../lib/facts.js");
const { NUMBER_WORDS } = await import("../lib/games.js");

const texts = new Set();
const add = (t) => t && texts.add(String(t).trim());

[...PRAISE, ...TRY_AGAIN, ...MOTIVATION, ...STREAK_PRAISE].forEach(add);
FUN_FACTS.forEach((f) => add(f.text));
NUMBER_WORDS.forEach(add);

// Feste UI-Sätze (müssen mit dem Code übereinstimmen)
[
  "Wusstest du das?",
  "Tippe auf den grünen Knopf! Dann geht es weiter!",
  "Tippe auf Weiter!",
  "Tippe auf den grünen Knopf mit dem Haken! Dann geht es weiter!",
  "Tippe auf Weiter! Dann kommt die nächste Aufgabe!",
  "Tippe auf den grünen Knopf, um zur Karte zu kommen! Oder auf den blauen, um nochmal zu spielen!",
  "Tippe unten auf den richtigen Buchstaben!",
  "Tippe unten auf die richtige Zahl!",
  "Tippe unten auf das richtige Wort!",
  "Tippe unten auf das richtige Bild!",
  "Tippe auf den richtigen Satz!",
  "Welchen Buchstaben hörst du?",
  "Mit welchem Buchstaben beginnt das Wort?",
  "Wie viele siehst du?",
  "Wie viele siehst du? Zähle!",
  "Welche Zahl hörst du?",
  "Welche Zahl ist das?",
  "Wie heißt das?",
  "Wo siehst du das?",
  "Welcher Satz ist richtig?",
  "Zähle mit!",
  "Es klingt so:",
  "Merke dir diesen Satz:",
  "Und weg ist es! Wo war es? Tippe darauf!",
  "Schau nochmal ganz genau!",
  "Sehr schön! Wenn du fertig bist, tippe auf den grünen Haken!",
  "Super! Nur noch einer!",
  "Das ist gleich! Such das Zeichen, das anders aussieht!",
  "Blitz-Blick! Schau ganz genau hin und merke dir, was du siehst!",
  "Minispiel! Finde die Paare! Tippe zwei Karten an und merke dir, was darunter ist!",
  "Minispiel! Tippe die Zahlen der Reihe nach, von klein nach groß! Das gelbe Feld zeigt dir, welche Zahl du suchst!",
  "Minispiel! Tippe die Buchstaben in der richtigen Reihenfolge! Das gelbe Feld zeigt dir, welchen Buchstaben du suchst!",
  "Detektiv-Spiel! Drei Zeichen sind gleich, eins ist anders! Tippe auf das Zeichen, das nicht dazu passt!",
  "Hör-Trainer! Zeig mir, was du noch weißt!",
  "Lese-Trainer! Wir ziehen die Buchstaben zusammen und lesen Wörter!",
  "Wir lesen zusammen. Hör zu:",
  "Welches Bild passt dazu? Tippe darauf!",
  "Lies das Wort! Welches Bild passt?",
  "So hast du es gesagt:",
  "Und so klingt es:",
  "Ich habe nichts gehört. Sprich laut und deutlich!",
  "Das klang noch anders. Probier es gleich nochmal!",
  "Das Mikrofon geht gerade nicht.",
  "Alle Paare gefunden!",
  "Ballon-Jagd!",
  "Zähl-Teich! Tippe jedes Tier an und zähle mit. Dann tippe auf die richtige Zahl!",
  "Wie viele siehst du? Tippe jedes Tier an und zähle!",
  "Zieh mit dem Finger, um zu lenken!",
  "Neuer Rekord! Wahnsinn!",
  "Hallo! So klinge ich! A wie APFEL!",
  "Los geht's!",
  "Super! Nur noch einer!",
  ...[2, 3, 4, 5, 6, 7, 8, 9].map((n) => `Super! Noch ${n}!`),
  ...[1, 2, 3, 4].map((n) => `Getroffen! Noch ${n}!`),
].forEach(add);

for (const c of CHAPTERS) {
  add(`${c.speakTitle || c.title}! Tippe auf den großen Knopf, dann geht es los!`);
  add(`${c.speakTitle || c.title}! Los geht's!`);
  for (const it of c.items) {
    if (it.type === "letter") {
      add(it.char);
      add(`${it.char}!`);
      add(`Großes ${it.char}`);
      add(`Kleines ${it.char}`);
      add(`Großes ${it.char} und kleines ${it.char}!`);
      add(`Ein Paar! Großes ${it.char} und kleines ${it.char}!`);
      add(`Das ist das ${it.char}!`);
      add(`Der Buchstabe lautet: ${it.char}!`);
      add(`Suche das ${it.char}!`);
      add(`Suche ${it.char}!`);
      add(`Super! Jetzt sammle alle ${it.char}!`);
      add(`Sammle alle ${it.char}!`);
      add(`Tippe auf alle Ballons mit ${it.char}!`);
      add(`Finde ein Wort mit ${it.char}!`);
      add(`In welchem Wort hörst du ein ${it.char}?`);
      for (const w of it.words) {
        add(w.word);
        add(`${w.word}!`);
        add(`${it.char} wie ${w.word}!`);
        add(`Ein Paar! ${it.char} wie ${w.word}!`);
        add(`${w.word}! Mit ${it.char}!`);
        add(`${w.word}! Da ist ein ${it.char} drin!`);
        add(`Das Wort lautet: ${w.word}!`);
        add(`Hörst du das ${it.char} am Anfang? ${w.word}!`);
        add(`Hörst du das ${it.char} in ${w.word}?`);
        add(`${it.char}! ${w.word} beginnt mit ${it.char}.`);
      }
    } else if (it.type === "number") {
      add(it.word);
      add(`Ein Paar! ${it.word}`);
      add(`${it.word}!`);
      add(`Das ist die Zahl ${it.word}!`);
      add(`Die Zahl lautet: ${it.word}!`);
      add(`Da steht das Wort: ${it.word}!`);
      add(`Suche die ${it.word}!`);
      add(`Nein, da steht ${it.word}!`);
    } else if (it.type === "word") {
      add(it.word);
      add(`Ein Paar! ${it.word}`);
      add(`${it.word}!`);
      add(`Das Bild zeigt: ${it.word}!`);
      add(`Das Wort lautet: ${it.word}!`);
      add(`Suche ${it.word}!`);
    } else if (it.type === "grammar") {
      add(`${it.correct.toLowerCase()}!`);
      add(it.explain);
      add(`${it.correct.toLowerCase()}! ${it.explain}`);
    }
  }
}

const list = [...texts].sort();
console.log(`${list.length} feste Texte`);
if (LIST) {
  console.log(list.join("\n"));
  process.exit(0);
}

// ---------- 2. Rendern (Piper über scripts/tts.py, dann MP3 via ffmpeg) ----------

const fileName = (t) => createHash("sha1").update(t).digest("hex").slice(0, 12);
const normalize = (t) => t.trim().replace(/\s+/g, " ").toLowerCase();
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Die App schreibt Wörter in GROSSBUCHSTABEN – Piper/espeak buchstabiert
// solche Wörter aber ("A-P-F-E-L"). Für die Synthese daher in normale
// Schreibweise wandeln; der Manifest-Schlüssel bleibt der Original-Text.
// Einzelne Buchstaben (A, B …) bleiben, die sollen als Buchstabe gesprochen werden.
export function forSpeech(text) {
  return text.replace(/[A-ZÄÖÜ]{2,}(?:-[A-ZÄÖÜ]+)*/g, (w) =>
    w
      .split("-")
      .map((p) => p[0] + p.slice(1).toLowerCase())
      .join("-")
  );
}

const jobs = [];
for (const text of list) {
  const base = fileName(text);
  if (!existsSync(join(SPEECH_DIR, base + ".mp3"))) jobs.push({ text: forSpeech(text), file: `sprache/${base}.wav` });
}
for (const L of letters) {
  if (!existsSync(join(LAUTE_DIR, `${L}.mp3`))) jobs.push({ laut: L, file: `laute/${L}.wav` });
}
console.log(`${jobs.length} Dateien zu rendern (Stimme: ${VOICE})`);

if (jobs.length) {
  const jobsFile = join(OUT_DIR, "_jobs.json");
  writeFileSync(jobsFile, JSON.stringify(jobs));
  execFileSync("python3", ["scripts/tts.py", "--voice", VOICE, "--jobs", jobsFile, "--out", OUT_DIR], { stdio: "inherit" });
  // WAV → MP3 (mono, 16 kHz, 40 kbit/s – klein genug für den Offline-Cache)
  let n = 0;
  for (const j of jobs) {
    const wav = join(OUT_DIR, j.file);
    if (!existsSync(wav)) continue;
    const mp3 = wav.replace(/\.wav$/, ".mp3");
    // Dauerlaute (mmm, sss, aaa …) doppelt so lang ziehen – Tonhöhe bleibt
    const CONTINUANTS = "AEIOUFLMNRSVWZ";
    // Lautstärke auf ein einheitliches, kräftiges Niveau bringen (Piper ist leise)
    // Piper klingt leise: leichte Kompression + Anhebung + Limiter (≈ +5 dB
    // gefühlte Lautstärke, ohne Verzerrung) – erst dann ist die Stimme so
    // präsent wie die System-Sprachausgabe.
    const norm = "compand=attacks=0.01:decays=0.2:points=-80/-80|-40/-20|-20/-8|0/-4,volume=4dB,alimiter=limit=0.97";
    const filter = ["-af", j.laut && CONTINUANTS.includes(j.laut) ? `atempo=0.5,${norm}` : norm];
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, ...filter, "-ac", "1", "-ar", "16000", "-codec:a", "libmp3lame", "-b:a", "40k", mp3]);
    execFileSync("rm", [wav]);
    if (++n % 100 === 0) console.log(`${n} MP3s…`);
  }
  execFileSync("rm", ["-f", jobsFile]);
}

// ---------- 3. Manifest ----------

const manifest = {};
for (const text of list) {
  const f = `sprache/${fileName(text)}.mp3`;
  if (existsSync(join(OUT_DIR, f))) manifest[normalize(text)] = f;
}
for (const L of letters) {
  if (existsSync(join(LAUTE_DIR, `${L}.mp3`))) manifest[`laut:${L}`] = `laute/${L}.mp3`;
}
writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest));
console.log(`Manifest: ${Object.keys(manifest).length} Einträge`);
