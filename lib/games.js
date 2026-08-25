// Spiele-Fabrik: baut aus einem Kapitel zufällige Minispiel-Schritte.
// 11 Spieltypen, pro Lektion werden 2-3 verschiedene zufällig gemischt.
import { ALL_LETTERS } from "./content";

export const NUMBER_WORDS = [
  "NULL", "EINS", "ZWEI", "DREI", "VIER", "FÜNF", "SECHS", "SIEBEN", "ACHT",
  "NEUN", "ZEHN",
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pick = (arr, n) => shuffle(arr).slice(0, n);
const one = (arr) => arr[Math.floor(Math.random() * arr.length)];

const labelOf = (i) => (i.type === "letter" ? i.char : String(i.value));
const anyWord = (i) => i.words[Math.floor(Math.random() * i.words.length)];
const spokenOf = (i) => (i.type === "letter" ? i.char : i.word);

// ---------- 1. Blasen fangen (pop) ----------

function makePop(chapter) {
  const items = chapter.items.filter((i) => i.type !== "grammar");
  if (!items.length) return null;
  const item = one(items);

  if (item.type === "letter" || item.type === "number") {
    const label = labelOf(item);
    const spoken = spokenOf(item);
    const others = items.filter((i) => i !== item).map(labelOf);
    const distractors = pick(
      [...others, ...(item.type === "letter" ? pick(ALL_LETTERS.filter((c) => c !== label), 4) : [])],
      6
    );
    const bubbles = shuffle([...Array(4).fill(label), ...distractors]).map(
      (text, i) => ({ id: i, text, isTarget: text === label })
    );
    return {
      kind: "game",
      game: "pop",
      target: label,
      intro: `Minispiel! Fange alle ${spoken}! Tippe auf alle Blasen mit ${spoken}!`,
      title: `Fange alle ${label}!`,
      bubbles,
    };
  }

  const targetEmoji = item.emojis[0];
  const others = items.filter((i) => i !== item).map((i) => i.emojis[0]);
  const bubbles = shuffle([...Array(4).fill(targetEmoji), ...pick(others, 6)]).map(
    (text, i) => ({ id: i, text, isTarget: text === targetEmoji })
  );
  return {
    kind: "game",
    game: "pop",
    target: targetEmoji,
    intro: `Minispiel! Fange alle ${item.word}!`,
    title: `Fange: ${item.word}!`,
    bubbles,
  };
}

// ---------- 2. Sortieren (sort) ----------

function makeSort(chapter) {
  const sortable = chapter.items.filter(
    (i) => i.type === "letter" || i.type === "number"
  );
  if (sortable.length < 3) return null;
  const seq = sortable.slice(0, 6).map(labelOf);
  const isNumbers = sortable[0].type === "number";
  return {
    kind: "game",
    game: "sort",
    sequence: seq,
    intro: isNumbers
      ? "Minispiel! Tippe die Zahlen der Reihe nach, von klein nach groß! Das gelbe Feld zeigt dir, welche Zahl du suchst!"
      : "Minispiel! Tippe die Buchstaben in der richtigen Reihenfolge! Das gelbe Feld zeigt dir, welchen Buchstaben du suchst!",
    title: isNumbers ? "Sortiere die Zahlen!" : "Sortiere die Buchstaben!",
  };
}

// ---------- 3. Memory: Paare finden ----------

function makeMemory(chapter) {
  const items = chapter.items.filter((i) => i.type !== "grammar");
  if (items.length < 3) return null;
  const chosen = pick(items, 3);
  const pairs = chosen.map((item, idx) => {
    if (item.type === "letter") {
      const w = anyWord(item);
      return { id: idx, a: item.char, b: w.emojis[0], speak: `${item.char} wie ${w.word}!` };
    }
    if (item.type === "number") {
      return {
        id: idx,
        a: String(item.value),
        // Nur bis 5 als Bildchen – "20" mit fünf Bildern wäre falsch,
        // deshalb ab 6 das Zahlwort als Partner-Karte.
        b: item.value >= 1 && item.value <= 5 ? item.emoji.repeat(item.value) : item.word,
        speak: item.word,
      };
    }
    return { id: idx, a: item.word, b: item.emojis[0], speak: item.word };
  });
  const cards = shuffle(
    pairs.flatMap((p) => [
      { pairId: p.id, face: p.a, small: p.a.length > 2 },
      { pairId: p.id, face: p.b, small: p.b.length > 2 },
    ])
  ).map((c, i) => ({ ...c, id: i }));
  return {
    kind: "game",
    game: "memory",
    intro: "Minispiel! Finde die Paare! Tippe zwei Karten an und merke dir, was darunter ist!",
    title: "Finde die Paare!",
    cards,
    pairs,
  };
}

// ---------- 4. Nachspuren: Schreiben üben ----------

function makeTrace(chapter) {
  const items = chapter.items.filter(
    (i) => i.type === "letter" || (i.type === "number" && i.value <= 9)
  );
  if (!items.length) return null;
  const item = one(items);
  const glyph = labelOf(item);
  return {
    kind: "game",
    game: "trace",
    glyph,
    spoken: spokenOf(item),
    intro: `Schreib-Übung! Fahre das große ${spokenOf(item)} mit deinem Finger nach! Male einfach darüber!`,
    title: `Schreibe das ${glyph} nach!`,
  };
}

// ---------- 5. Wort bauen (Buchstaben legen) ----------

function makeBuilder(chapter, name) {
  // Eigener Name hat Vorrang, wenn gespeichert (max 10 Zeichen)
  let word = null;
  let isName = false;
  if (name && name.length >= 2 && name.length <= 10 && Math.random() < 0.4) {
    word = name.toUpperCase().replace(/[^A-ZÄÖÜ]/g, "");
    isName = word.length >= 2;
    if (!isName) word = null;
  }
  if (!word) {
    const withWords = chapter.items.filter((i) => i.type === "letter" && i.words);
    const vocab = chapter.items.filter((i) => i.type === "word");
    const candidates = [
      ...withWords.flatMap((i) => i.words.map((w) => w.word)),
      ...vocab.map((i) => i.word),
    ].filter((w) => w.length >= 3 && w.length <= 7 && !w.includes("-"));
    if (!candidates.length) return null;
    word = one(candidates);
  }
  const letters = word.split("");
  const distractors = pick(
    ALL_LETTERS.filter((c) => !letters.includes(c)),
    Math.min(3, 10 - letters.length < 0 ? 0 : 2)
  );
  const emoji = isName
    ? "⭐"
    : (chapter.items.find(
        (i) =>
          (i.type === "word" && i.word === word) ||
          (i.type === "letter" && i.words && i.words.some((w) => w.word === word))
      )?.emojis?.[0] ??
      chapter.items
        .flatMap((i) => i.words || [])
        .find((w) => w.word === word)?.emojis?.[0] ??
      "✨");
  return {
    kind: "game",
    game: "builder",
    word,
    isName,
    emoji,
    tiles: shuffle([...letters, ...distractors]),
    intro: isName
      ? `Jetzt schreibst du deinen eigenen Namen! Tippe die Buchstaben in der richtigen Reihenfolge! Zuerst: ${letters[0]}!`
      : `Wort-Baustelle! Baue das Wort ${word}! Tippe die Buchstaben in der richtigen Reihenfolge! Zuerst: ${letters[0]}!`,
    title: isName ? "Schreibe deinen Namen!" : `Baue das Wort: ${word}!`,
  };
}

// ---------- 6. Buchstaben-Maulwurf (Blitz-Tippen) ----------

function makeMole(chapter) {
  const items = chapter.items.filter(
    (i) => i.type === "letter" || i.type === "number"
  );
  if (items.length < 2) return null;
  const item = one(items);
  const target = labelOf(item);
  const others = items.filter((i) => i !== item).map(labelOf);
  return {
    kind: "game",
    game: "mole",
    target,
    spoken: spokenOf(item),
    others: others.length ? others : pick(ALL_LETTERS.filter((c) => c !== target), 4),
    hitsNeeded: 5,
    intro: `Blitz-Spiel! Der ${spokenOf(item)} versteckt sich! Tippe schnell, wenn ${spokenOf(item)} auftaucht! Fange ihn fünf Mal!`,
    title: `Fange das ${target}! (5×)`,
  };
}

// ---------- 7. Lückenwort ----------

function makeGap(chapter) {
  const candidates = [];
  for (const i of chapter.items) {
    if (i.type === "letter" && i.words)
      for (const w of i.words) candidates.push({ word: w.word, emoji: w.emojis[0] });
    if (i.type === "word") candidates.push({ word: i.word, emoji: i.emojis[0] });
  }
  const usable = candidates.filter((c) => c.word.length >= 3 && !c.word.includes("-"));
  if (!usable.length) return null;
  const target = one(usable);
  const pos = Math.floor(Math.random() * Math.min(target.word.length, 4));
  const missing = target.word[pos];
  const options = shuffle([
    missing,
    ...pick(ALL_LETTERS.filter((c) => c !== missing && !target.word.includes(c)), 2),
  ]);
  return {
    kind: "game",
    game: "gap",
    word: target.word,
    emoji: target.emoji,
    pos,
    missing,
    options,
    intro: `Lücken-Retter! Beim Wort ${target.word} fehlt ein Buchstabe! Welcher passt in die Lücke?`,
    title: "Welcher Buchstabe fehlt?",
  };
}

// ---------- 8. Zähl-Tippen (genau N antippen) ----------

function makeCountTap(chapter) {
  const nums = chapter.items.filter((i) => i.type === "number" && i.value >= 2 && i.value <= 9);
  if (!nums.length) return null;
  const item = one(nums);
  const total = Math.min(item.value + 3 + Math.floor(Math.random() * 3), 12);
  return {
    kind: "game",
    game: "counttap",
    target: item.value,
    word: item.word,
    emoji: item.emoji,
    total,
    intro: `Zähl-Spiel! Tippe genau ${item.word} ${item.emoji} an! Zähle laut mit!`,
    title: `Tippe genau ${item.value} an!`,
  };
}

// ---------- 9. Blitz-Blick (kurz merken) ----------

function makeFlash(chapter) {
  const items = chapter.items.filter(
    (i) => i.type === "letter" || i.type === "number"
  );
  if (items.length < 2) return null;
  const item = one(items);
  const target = labelOf(item);
  const pool = items.filter((i) => i !== item).map(labelOf);
  const extra =
    item.type === "letter" ? pick(ALL_LETTERS.filter((c) => c !== target), 4) : [];
  const options = shuffle([target, ...pick([...pool, ...extra], 3)]);
  return {
    kind: "game",
    game: "flash",
    target,
    spoken: spokenOf(item),
    options,
    intro: "Blitz-Blick! Schau ganz genau hin und merke dir, was du siehst!",
    title: "Merke dir das Zeichen!",
  };
}

// ---------- 10. Finde das Gleiche ----------

function makeSame(chapter) {
  const items = chapter.items.filter(
    (i) => i.type === "letter" || i.type === "number"
  );
  if (items.length < 2) return null;
  const item = one(items);
  const target = labelOf(item);
  const pool = items.filter((i) => i !== item).map(labelOf);
  const extra =
    item.type === "letter" ? pick(ALL_LETTERS.filter((c) => c !== target), 4) : [];
  const options = shuffle([target, ...pick([...pool, ...extra], 3)]);
  return {
    kind: "game",
    game: "same",
    target,
    spoken: spokenOf(item),
    options,
    correctIndex: options.indexOf(target),
    intro: `Zwillings-Suche! Oben siehst du ${spokenOf(item)}. Finde unten genau das gleiche Zeichen!`,
    title: "Finde das Gleiche!",
  };
}

// ---------- 11. Was passt nicht? ----------

function makeOdd(chapter) {
  const items = chapter.items.filter(
    (i) => i.type === "letter" || i.type === "number"
  );
  if (items.length < 2) return null;
  const item = one(items);
  const target = labelOf(item);
  const otherPool = items.filter((i) => i !== item).map(labelOf);
  const odd = one(
    otherPool.length ? otherPool : pick(ALL_LETTERS.filter((c) => c !== target), 1)
  );
  const tiles = shuffle([target, target, target, odd]);
  return {
    kind: "game",
    game: "odd",
    tiles,
    oddIndex: tiles.indexOf(odd),
    target,
    odd,
    intro: `Detektiv-Spiel! Drei Zeichen sind gleich, eins ist anders! Tippe auf das Zeichen, das nicht dazu passt!`,
    title: "Was passt nicht?",
  };
}

// ---------- Auswahl ----------

const FACTORIES = [
  makePop,
  makeSort,
  makeMemory,
  makeTrace,
  (c, name) => makeBuilder(c, name),
  makeMole,
  makeGap,
  makeCountTap,
  makeFlash,
  makeSame,
  makeOdd,
];

// Wählt `count` verschiedene, zum Kapitel passende Spiele zufällig aus
export function pickGames(chapter, count, name = "") {
  const games = [];
  for (const factory of shuffle(FACTORIES)) {
    if (games.length >= count) break;
    try {
      const g = factory(chapter, name);
      if (g && !games.some((x) => x.game === g.game)) games.push(g);
    } catch {
      // Ein kaputtes Spiel soll nie die Lektion verhindern
    }
  }
  return games;
}
