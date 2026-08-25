// Erzeugt aus einem Kapitel eine Duolingo-artige Lektion:
// Lernkarten (teach) + Quizfragen (exercise) + Minispiele + Fun Facts.
// Adaptive Schwierigkeit: schwache Items bekommen weniger Antwortoptionen
// und werden in der Wiederholung bevorzugt (Spaced-Repetition-Prinzip).
import { ALL_LETTERS, CHAPTERS, getChapter } from "./content";
import { pickFact } from "./facts";
import { pickGames } from "./games";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr, n) {
  return shuffle(arr).slice(0, n);
}

function buildOptions(correct, distractors, n) {
  const opts = shuffle([correct, ...pick(distractors, n - 1)]);
  return { options: opts, correctIndex: opts.findIndex((o) => o === correct) };
}

export function itemKeyOf(item) {
  if (item.type === "letter") return item.char;
  if (item.type === "number") return String(item.value);
  if (item.type === "grammar") return item.correct;
  return item.word;
}

// ---------- Buchstaben-Übungen ----------

function exHearLetter(item, chapterLetters, n) {
  const pool = [...new Set([...chapterLetters, ...pick(ALL_LETTERS, 6)])].filter(
    (c) => c !== item.char
  );
  const { options, correctIndex } = buildOptions(item.char, pool, n);
  return {
    kind: "exercise",
    itemKey: item.char,
    question: "Welchen Buchstaben hörst du?",
    speakText: item.char,
    announce: `Der Buchstabe lautet: ${item.char}!`,
    prompt: { speaker: true },
    optionStyle: "letter",
    options: options.map((c) => ({ label: c })),
    correctIndex,
    speakOnCorrect: item.char,
    wrongSpeak: (opt) => `Das war ${opt.label}. Suche das ${item.char}!`,
  };
}

function exFirstLetter(item, chapterLetters, n) {
  const word = item.words[Math.floor(Math.random() * item.words.length)];
  const pool = [...new Set([...chapterLetters, ...pick(ALL_LETTERS, 6)])].filter(
    (c) => c !== item.char
  );
  const { options, correctIndex } = buildOptions(item.char, pool, n);
  return {
    kind: "exercise",
    itemKey: item.char,
    question: "Mit welchem Buchstaben beginnt das Wort?",
    speakText: word.word,
    announce: `Das Wort lautet: ${word.word}!`,
    prompt: { emojis: word.emojis.join(" "), word: word.word },
    optionStyle: "letter",
    options: options.map((c) => ({ label: c })),
    correctIndex,
    speakOnCorrect: `${item.char}! ${word.word} beginnt mit ${item.char}.`,
    wrongSpeak: (opt) => `Nein, das war ${opt.label}. ${word.word} fängt mit ${item.char} an!`,
  };
}

function exFindWord(item, chapter, n) {
  const word = item.words[Math.floor(Math.random() * item.words.length)];
  const others = chapter.items
    .filter((i) => i !== item && i.words)
    .map((i) => i.words[Math.floor(Math.random() * i.words.length)]);
  const distractors = pick(others, n - 1);
  const all = shuffle([word, ...distractors]);
  return {
    kind: "exercise",
    itemKey: item.char,
    question: item.inWord
      ? `In welchem Wort hörst du ein ${item.char}?`
      : `Finde ein Wort mit ${item.char}!`,
    speakText: item.inWord
      ? `In welchem Wort hörst du ein ${item.char}?`
      : `Finde ein Wort mit ${item.char}!`,
    prompt: { hero: item.char },
    optionStyle: "emoji",
    options: all.map((w) => ({ label: w.emojis[0], sub: w.word })),
    correctIndex: all.findIndex((w) => w === word),
    speakOnCorrect: word.word,
    wrongSpeak: (opt) =>
      item.inWord
        ? `In ${opt.sub} ist kein ${item.char}. Höre genau hin: ${word.word}!`
        : `${opt.sub} fängt mit ${opt.sub[0]} an. Suche ${item.char}!`,
  };
}

// ---------- Zahlen-Übungen ----------

function exCount(item, chapterNumbers, n) {
  const { options, correctIndex } = buildOptions(
    item.value,
    chapterNumbers.filter((v) => v !== item.value),
    n
  );
  return {
    kind: "exercise",
    itemKey: String(item.value),
    question: "Wie viele siehst du?",
    speakText: "Wie viele siehst du? Zähle!",
    prompt: { emojis: item.emoji.repeat ? item.emoji.repeat(item.value) : "" },
    optionStyle: "number",
    options: options.map((v) => ({ label: String(v) })),
    correctIndex,
    speakOnCorrect: item.word,
    wrongSpeak: (opt) => `Nicht ${opt.label}. Zähle nochmal!`,
  };
}

function exHearNumber(item, chapterNumbers, n) {
  const { options, correctIndex } = buildOptions(
    item.value,
    chapterNumbers.filter((v) => v !== item.value),
    n
  );
  return {
    kind: "exercise",
    itemKey: String(item.value),
    question: "Welche Zahl hörst du?",
    speakText: item.word,
    announce: `Die Zahl lautet: ${item.word}!`,
    prompt: { speaker: true },
    optionStyle: "number",
    options: options.map((v) => ({ label: String(v) })),
    correctIndex,
    speakOnCorrect: `${item.word}!`,
    wrongSpeak: (opt) => `Das war die ${opt.label}. Suche die ${item.word}!`,
  };
}

function exWordToNumber(item, chapterNumbers, n) {
  const { options, correctIndex } = buildOptions(
    item.value,
    chapterNumbers.filter((v) => v !== item.value),
    n
  );
  return {
    kind: "exercise",
    itemKey: String(item.value),
    question: "Welche Zahl ist das?",
    speakText: item.word,
    announce: `Da steht das Wort: ${item.word}!`,
    prompt: { word: item.word },
    optionStyle: "number",
    options: options.map((v) => ({ label: String(v) })),
    correctIndex,
    speakOnCorrect: `${item.word}!`,
    wrongSpeak: (opt) => `Nein, da steht ${item.word}!`,
  };
}

// ---------- Vokabel-Übungen ----------

function exWordForImage(item, chapter, n) {
  const others = chapter.items.filter((i) => i !== item && i.word).map((i) => i.word);
  const { options, correctIndex } = buildOptions(item.word, others, n);
  return {
    kind: "exercise",
    itemKey: item.word,
    question: "Wie heißt das?",
    speakText: item.word,
    announce: `Das Bild zeigt: ${item.word}!`,
    prompt: { emojis: item.emojis.join(" ") },
    optionStyle: "word",
    options: options.map((w) => ({ label: w })),
    correctIndex,
    speakOnCorrect: item.word,
    wrongSpeak: (opt) => `Da steht ${opt.label}. Suche ${item.word}!`,
  };
}

function exImageForWord(item, chapter, n) {
  const others = chapter.items.filter((i) => i !== item && i.word);
  const distractors = pick(others, n - 1);
  const all = shuffle([item, ...distractors]);
  return {
    kind: "exercise",
    itemKey: item.word,
    question: "Wo siehst du das?",
    speakText: item.word,
    announce: `Das Wort lautet: ${item.word}!`,
    prompt: { word: item.word },
    optionStyle: "emoji",
    options: all.map((i) => ({ label: i.emojis[0], word: i.word })),
    correctIndex: all.findIndex((i) => i === item),
    speakOnCorrect: item.word,
    wrongSpeak: (opt) => `Das war ${opt.word}. Suche ${item.word}!`,
  };
}

// ---------- Lese-Übung: Buchstaben zusammenziehen ----------
// Wort wird Laut für Laut gezeigt und gesprochen (Synthese), dann als
// Ganzes; das Kind wählt das passende Bild. Nur Wörter aus bereits
// gelernten Buchstaben.
const VOWEL_SOUND = { A: "aaa", E: "eee", I: "iii", O: "ooo", U: "uuu", Ä: "äää", Ö: "ööö", Ü: "üüü" };

export function exReadWord(entry, others, n = 3) {
  const distractors = pick(others.filter((o) => o.word !== entry.word), n - 1);
  const all = shuffle([entry, ...distractors]);
  return {
    kind: "exercise",
    itemKey: entry.word,
    readWord: true,
    spell: entry.word.split(""),
    question: "Lies das Wort! Welches Bild passt?",
    speakText: entry.word,
    prompt: { word: entry.word, lower: entry.word[0] + entry.word.slice(1).toLowerCase() },
    optionStyle: "emoji",
    options: all.map((o) => ({ label: o.emoji, word: o.word })),
    correctIndex: all.findIndex((o) => o === entry),
    speakOnCorrect: `${entry.word}! Du hast gelesen!`,
    wrongSpeak: (opt) => `Das ist ${opt.word}. Lies nochmal: ${entry.word}!`,
  };
}

export function letterSoundText(ch) {
  return VOWEL_SOUND[ch] || ch;
}

// ---------- Grammatik-Übungen (Sprach-Profi) ----------

function exPickSentence(item) {
  const correctFirst = Math.random() < 0.5;
  const sentences = correctFirst
    ? [item.correct, item.wrong]
    : [item.wrong, item.correct];
  const correctIndex = correctFirst ? 0 : 1;
  return {
    kind: "exercise",
    itemKey: item.correct,
    question: "Welcher Satz ist richtig?",
    speakText: `Satz eins: ${sentences[0].toLowerCase()}. Satz zwei: ${sentences[1].toLowerCase()}.`,
    announce: `Satz eins: ${sentences[0].toLowerCase()}! … Satz zwei: ${sentences[1].toLowerCase()}!`,
    prompt: { hero: item.emoji },
    optionStyle: "sentence",
    options: sentences.map((s, i) => ({ label: `${i + 1}️⃣`, sub: s, sentence: s })),
    correctIndex,
    speakOnCorrect: `${item.correct.toLowerCase()}! ${item.explain}`,
    wrongSpeak: () => item.explain,
  };
}

// ---------- Übungsauswahl ----------

export function exercisesFor(item, chapter, variant, easy = false) {
  const n = easy ? 3 : 4; // adaptive Schwierigkeit: weniger Optionen
  if (item.type === "letter") {
    const letters = chapter.items.filter((i) => i.char).map((i) => i.char);
    const gens = item.inWord
      ? // Laut steckt im Wort (z. B. X in TAXI) → keine Anlaut-Frage
        [() => exHearLetter(item, letters, n), () => exFindWord(item, chapter, Math.min(n, 4))]
      : [
          () => exHearLetter(item, letters, n),
          () => exFirstLetter(item, letters, n),
          () => exFindWord(item, chapter, Math.min(n, 4)),
        ];
    return gens[variant % gens.length]();
  }
  if (item.type === "number") {
    const numbers = chapter.items.map((i) => i.value);
    const small = item.value <= 10;
    // Zählen nur bei 1–10 (bei 0 gäbe es nichts zu sehen → verwirrend)
    const gens = small && item.value > 0
      ? [
          () => exCount(item, numbers, n),
          () => exHearNumber(item, numbers, n),
          () => exWordToNumber(item, numbers, n),
        ]
      : [() => exHearNumber(item, numbers, n), () => exWordToNumber(item, numbers, n)];
    return gens[variant % gens.length]();
  }
  if (item.type === "grammar") {
    return exPickSentence(item);
  }
  const gens = [
    () => exWordForImage(item, chapter, Math.min(n, 3)),
    () => exImageForWord(item, chapter, n),
  ];
  return gens[variant % gens.length]();
}

// ---------- Fun Facts ----------

function makeFactStep() {
  const fact = pickFact();
  return { kind: "fact", emoji: fact.emoji, text: fact.text };
}

// ---------- Lektion zusammenbauen ----------

export function buildLesson(chapter, weakKeys = [], childName = "") {
  const steps = [];
  const weak = new Set(weakKeys);

  // Buchstaben: pro Lektion 2 zufällige Anlaut-Wörter aus dem Pool zeigen,
  // damit nicht immer die gleichen zwei kommen (Übungen nutzen dieselben).
  const items = chapter.items.map((it) =>
    it.type === "letter" && it.words.length > 2 ? { ...it, words: shuffle(it.words).slice(0, 2) } : it
  );
  const lessonChapter = { ...chapter, items };

  // Lernen + direkt üben, in Zweiergruppen
  for (let i = 0; i < items.length; i += 2) {
    const group = items.slice(i, i + 2);
    for (const item of group) steps.push({ kind: "teach", item });
    for (const [j, item] of group.entries())
      steps.push(exercisesFor(item, lessonChapter, i + j, weak.has(itemKeyOf(item))));
  }

  // Wiederholung: schwache Items zuerst (Spaced Repetition)
  const weakItems = items.filter((it) => weak.has(itemKeyOf(it)));
  const restItems = shuffle(items.filter((it) => !weak.has(itemKeyOf(it))));
  const review = [...shuffle(weakItems), ...restItems].slice(
    0,
    Math.min(4, items.length)
  );
  for (const [j, item] of review.entries())
    steps.push(exercisesFor(item, lessonChapter, j + 1, weak.has(itemKeyOf(item))));

  // Vorwissen: 2 Items aus früheren Kapiteln der gleichen Reihe (ABC, Zahlen,
  // Wörter) mischen – sonst wird A/B nie wieder abgefragt, sobald C/D/E dran ist.
  // Ablenker bleiben die des alten Kapitels, damit die Aufgabe konsistent ist.
  const track = chapter.id.replace(/-.*$/, "");
  const earlier = CHAPTERS.filter(
    (c) => c.id !== chapter.id && c.id.replace(/-.*$/, "") === track && CHAPTERS.indexOf(c) < CHAPTERS.indexOf(chapter)
  );
  const pool = earlier.flatMap((c) =>
    c.items.filter((i) => i.type !== "grammar").map((i) => ({ item: i, chapter: c }))
  );
  for (const [j, { item, chapter: c }] of shuffle(pool).slice(0, 2).entries()) {
    const ex = exercisesFor(item, c, j + 2, false);
    ex.fromChapter = c.id;
    ex.question = `Weißt du es noch? ${ex.question}`;
    steps.push(ex);
  }

  // Minispiele einstreuen: 2-3 zufällig aus dem Pool von 11 Spieltypen,
  // gleichmäßig über die Lektion verteilt – jede Lektion spielt sich anders
  const gameCount = steps.length > 14 ? 3 : 2;
  const games = pickGames(chapter, gameCount, childName);
  games.forEach((game, gi) => {
    const at = Math.floor(((gi + 1) * steps.length) / (games.length + 1));
    steps.splice(Math.min(at, steps.length - 1), 0, game);
  });

  // 1-2 Fun Facts als Belohnung zwischendurch
  const factPos1 = Math.floor(steps.length / 3);
  steps.splice(factPos1, 0, makeFactStep());
  if (steps.length > 12) {
    const factPos2 = Math.floor((steps.length * 3) / 4);
    steps.splice(factPos2, 0, makeFactStep());
  }

  return steps;
}


// ---------- Trainer: wackelige Items über alle Kapitel ----------
// Liefert bis zu `count` Übungen, bevorzugt Items mit Fehlern / lange nicht geübt.
// Übungen, die KEIN Lesen voraussetzen (hören → tippen, Bild → Anlaut, zählen)
const NO_READING = {
  letter: [0, 1], // exHearLetter, exFirstLetter
  number: [0, 1], // exCount, exHearNumber
  word: [1], // exImageForWord (Wort wird vorgesprochen, Bild wählen)
};

export function buildTraining(ranked, count = 8, mode = "hoer") {
  if (mode === "lesen") return buildReadingTraining(count);
  const steps = [];
  const seen = new Set();
  const variantFor = (item) => {
    const allowed = NO_READING[item.type] || [];
    return allowed[Math.floor(Math.random() * allowed.length)] ?? 0;
  };
  for (const r of ranked) {
    if (steps.length >= count) break;
    const chapter = getChapter(r.chapterId);
    if (!chapter) continue;
    const item = chapter.items.find((i) => itemKeyOf(i) === r.itemKey);
    if (!item || item.type === "grammar" || seen.has(r.chapterId + r.itemKey)) continue;
    if (item.type === "number" && item.value === 0) continue;
    seen.add(r.chapterId + r.itemKey);
    const ex = exercisesFor(item, chapter, variantFor(item), r.wrong > r.right);
    ex.fromChapter = chapter.id;
    steps.push(ex);
  }
  // Auffüllen mit zufälligen Items aus geschafften Kapiteln, falls zu wenig Statistik
  if (steps.length < count) {
    const pool = shuffle(
      CHAPTERS.flatMap((c) => c.items.filter((i) => i.type !== "grammar").map((i) => ({ i, c })))
    );
    for (const { i, c } of pool) {
      if (steps.length >= count) break;
      if (seen.has(c.id + itemKeyOf(i))) continue;
      if (i.type === "number" && i.value === 0) continue;
      seen.add(c.id + itemKeyOf(i));
      const ex = exercisesFor(i, c, variantFor(i), false);
      ex.fromChapter = c.id;
      steps.push(ex);
    }
  }
  return steps;
}


// Welche Buchstaben hat das Kind schon gelernt? (Kapitel mit ≥1 Stern)
export function learnedLetters(progress) {
  const set = new Set();
  for (const c of CHAPTERS) {
    if (!c.id.startsWith("abc") || !(progress[c.id] > 0)) continue;
    for (const it of c.items) set.add(it.char);
  }
  return set;
}

// Alle Wörter (mit Bild), die nur aus gelernten Buchstaben bestehen
export function readableWords(progress, { minLen = 2, maxLen = 5 } = {}) {
  const letters = learnedLetters(progress);
  const out = new Map();
  for (const c of CHAPTERS) {
    for (const it of c.items) {
      const list = it.type === "letter" ? it.words : it.type === "word" ? [it] : [];
      for (const w of list) {
        const word = w.word;
        if (word.length < minLen || word.length > maxLen || word.includes("-")) continue;
        if (![...word].every((ch) => letters.has(ch))) continue;
        if (!out.has(word)) out.set(word, { word, emoji: w.emojis[0] });
      }
    }
  }
  return [...out.values()];
}

export function buildReadingTraining(count = 6) {
  const progress = typeof window === "undefined" ? {} : JSON.parse(localStorage.getItem("anton-lernapp-progress-v1") || "{}");
  const words = shuffle(readableWords(progress));
  if (words.length < 3) return [];
  return words.slice(0, count).map((w) => exReadWord(w, words, 3));
}
