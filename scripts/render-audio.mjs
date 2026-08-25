// Rendert alle festen Sprach-Texte der App als MP3 nach public/audio/
// und schreibt public/audio/manifest.json (Text → Datei).
//
//   npm run audio -- --engine openai            (Cloud, sehr gute Qualität)
//   npm run audio -- --engine azure             (Cloud, sehr gute Qualität)
//   npm run audio -- --engine piper --model ~/piper/de_DE-kerstin-low.onnx  (offline, kostenlos)
//   npm run audio -- --list                     (nur zeigen, was gerendert würde)
//
// Aufruf mit:  node --experimental-default-type=module scripts/render-audio.mjs …
// (steht so in package.json unter "audio")
//
// Empfehlung für eine gute WEIBLICHE deutsche Stimme:
//   openai  → OPENAI_API_KEY setzen, Stimme "nova" oder "shimmer" (Modell gpt-4o-mini-tts)
//   azure   → AZURE_TTS_KEY + AZURE_TTS_REGION, Stimme "de-DE-SeraphinaMultilingualNeural"
//             oder "de-DE-KatjaNeural" (sehr natürlich, klar, kindgerecht)
//   piper   → kostenlos/offline, deutsche Frauenstimmen nur in "low"-Qualität
//             (kerstin, ramona, eva_k) – deutlich hörbar schlechter als die Cloud-Stimmen.
//
// Nur die Texte, die feststehen, werden gerendert. Sätze mit variablen Teilen
// (z. B. "Noch 3 zu fangen") spricht weiterhin die System-Stimme – dafür sorgt
// der Fallback in lib/speech.js. Die Anlaut-LAUTE (mmm, sss …) kann keine TTS
// sprechen: dafür bitte kurze Aufnahmen nach public/audio/laute/<BUCHSTABE>.mp3
// legen (siehe Ausgabe am Ende), das Skript trägt sie ins Manifest ein.
import { mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const ENGINE = opt("engine", "openai");
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
  "Trainer! Zeig mir, was du noch weißt!",
  "Hallo! So klinge ich! A wie APFEL!",
  "Los geht's!",
].forEach(add);

for (const c of CHAPTERS) {
  add(`${c.speakTitle || c.title}! Tippe auf den großen Knopf, dann geht es los!`);
  add(`${c.speakTitle || c.title}! Los geht's!`);
  for (const it of c.items) {
    if (it.type === "letter") {
      add(it.char);
      add(`${it.char}!`);
      add(`Das ist das ${it.char}!`);
      add(`Der Buchstabe lautet: ${it.char}!`);
      add(`Suche das ${it.char}!`);
      add(`Finde ein Wort mit ${it.char}!`);
      add(`In welchem Wort hörst du ein ${it.char}?`);
      for (const w of it.words) {
        add(w.word);
        add(`${w.word}!`);
        add(`${it.char} wie ${w.word}!`);
        add(`${w.word}! Mit ${it.char}!`);
        add(`${w.word}! Da ist ein ${it.char} drin!`);
        add(`Das Wort lautet: ${w.word}!`);
        add(`Hörst du das ${it.char} am Anfang? ${w.word}!`);
        add(`Hörst du das ${it.char} in ${w.word}?`);
        add(`${it.char}! ${w.word} beginnt mit ${it.char}.`);
      }
    } else if (it.type === "number") {
      add(it.word);
      add(`${it.word}!`);
      add(`Das ist die Zahl ${it.word}!`);
      add(`Die Zahl lautet: ${it.word}!`);
      add(`Da steht das Wort: ${it.word}!`);
      add(`Suche die ${it.word}!`);
      add(`Nein, da steht ${it.word}!`);
    } else if (it.type === "word") {
      add(it.word);
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

// ---------- 2. Rendern ----------

const fileName = (t) => createHash("sha1").update(t).digest("hex").slice(0, 12) + ".mp3";
const normalize = (t) => t.trim().replace(/\s+/g, " ").toLowerCase();

async function renderOpenAI(text, file) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY fehlt");
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opt("model", "gpt-4o-mini-tts"),
      voice: opt("voice", "nova"),
      input: text,
      instructions:
        "Sprich langsam, klar und freundlich, wie eine Grundschullehrerin, die mit einem fünfjährigen Kind spricht. Deutsch.",
      response_format: "mp3",
      speed: 0.9,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

async function renderAzure(text, file) {
  const key = process.env.AZURE_TTS_KEY;
  const region = process.env.AZURE_TTS_REGION;
  if (!key || !region) throw new Error("AZURE_TTS_KEY / AZURE_TTS_REGION fehlen");
  const voice = opt("voice", "de-DE-SeraphinaMultilingualNeural");
  const ssml = `<speak version="1.0" xml:lang="de-DE"><voice name="${voice}"><prosody rate="-12%">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")}</prosody></voice></speak>`;
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
    },
    body: ssml,
  });
  if (!res.ok) throw new Error(`Azure ${res.status}: ${await res.text()}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

function renderPiper(text, file) {
  const model = opt("model");
  if (!model) throw new Error("--model <pfad.onnx> fehlt");
  const wav = file.replace(/\.mp3$/, ".wav");
  execFileSync("piper", ["--model", model, "--output_file", wav, "--length_scale", "1.15"], {
    input: text,
  });
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-q:a", "4", file]);
  execFileSync("rm", [wav]);
}

const manifestPath = join(OUT_DIR, "manifest.json");
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
let done = 0;
for (const text of list) {
  const name = fileName(text);
  const file = join(SPEECH_DIR, name);
  if (!existsSync(file)) {
    try {
      if (ENGINE === "openai") await renderOpenAI(text, file);
      else if (ENGINE === "azure") await renderAzure(text, file);
      else renderPiper(text, file);
      done++;
      process.stdout.write(`\r${done} neu gerendert…`);
    } catch (e) {
      console.error(`\nFehler bei "${text}": ${e.message}`);
      continue;
    }
  }
  manifest[normalize(text)] = `sprache/${name}`;
}

// Anlaut-Laute: manuell aufgenommene Dateien eintragen
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const present = new Set(readdirSync(LAUTE_DIR));
const missing = [];
for (const L of letters) {
  const f = `${L}.mp3`;
  if (present.has(f)) manifest[`laut:${L}`] = `laute/${f}`;
  else missing.push(L);
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
console.log(`\nManifest: ${Object.keys(manifest).length} Einträge → ${manifestPath}`);
if (missing.length) {
  console.log(
    `\nAnlaut-Laute fehlen für: ${missing.join(" ")}\n` +
      `→ Kurz aufnehmen (z. B. mit dem iPhone-Sprachmemo, 0,5–1 s, nur der Laut: "mmm", "sss", "t", "k" …)\n` +
      `  und als public/audio/laute/<BUCHSTABE>.mp3 ablegen, dann Skript erneut laufen lassen.`
  );
}
