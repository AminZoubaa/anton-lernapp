// Alle Lerninhalte: Buchstaben, Zahlen, Vokabeln
// Wörter immer in GROSSBUCHSTABEN, jede Vokabel mit mehreren Emojis.

const L = (char, words) => ({ type: "letter", char, words });
const W = (word, emojis) => ({ word, emojis });
const N = (value, word, emoji) => ({ type: "number", value, word, emoji });
const V = (word, emojis) => ({ type: "word", word, emojis });
// Grammatik: richtiger vs. falscher Satz (gesprochene Sprache)
const G = (emoji, correct, wrong, explain) => ({
  type: "grammar",
  emoji,
  correct,
  wrong,
  explain,
});

export const CHAPTERS = [
  {
    id: "abc-1",
    title: "A – E",
    speakTitle: "Buchstaben A bis E",
    emoji: "🅰️",
    color: "#1cb0f6",
    items: [
      L("A", [W("APFEL", ["🍎", "🍏"]), W("AFFE", ["🐵", "🐒", "🙈"])]),
      L("B", [W("BALL", ["⚽", "🏀", "🎾"]), W("BANANE", ["🍌"])]),
      L("C", [W("CLOWN", ["🤡", "🎪"]), W("COMPUTER", ["💻", "🖥️"])]),
      L("D", [W("DRACHE", ["🐉", "🐲"]), W("DELFIN", ["🐬"])]),
      L("E", [W("ELEFANT", ["🐘"]), W("ENTE", ["🦆", "🐤"])]),
    ],
  },
  {
    id: "abc-2",
    title: "F – K",
    speakTitle: "Buchstaben F bis K",
    emoji: "🐸",
    color: "#58cc02",
    items: [
      L("F", [W("FISCH", ["🐟", "🐠", "🐡"]), W("FROSCH", ["🐸"])]),
      L("G", [W("GESCHENK", ["🎁"]), W("GITARRE", ["🎸"])]),
      L("H", [W("HUND", ["🐶", "🐕"]), W("HAUS", ["🏠", "🏡"])]),
      L("I", [W("IGEL", ["🦔"]), W("INSEL", ["🏝️", "🏖️"])]),
      L("J", [W("JACKE", ["🧥"]), W("JO-JO", ["🪀"])]),
      L("K", [W("KATZE", ["🐱", "🐈"]), W("KUCHEN", ["🎂", "🍰"])]),
    ],
  },
  {
    id: "abc-3",
    title: "L – P",
    speakTitle: "Buchstaben L bis P",
    emoji: "🦁",
    color: "#ff9600",
    items: [
      L("L", [W("LÖWE", ["🦁"]), W("LUFTBALLON", ["🎈"])]),
      L("M", [W("MAUS", ["🐭", "🐁"]), W("MOND", ["🌙", "🌛"])]),
      L("N", [W("NASE", ["👃"]), W("NUDELN", ["🍝"])]),
      L("O", [W("OMA", ["👵"]), W("ORANGE", ["🍊"])]),
      L("P", [W("PFERD", ["🐴", "🐎"]), W("PIZZA", ["🍕"])]),
    ],
  },
  {
    id: "abc-4",
    title: "Q – U",
    speakTitle: "Buchstaben Q bis U",
    emoji: "🚀",
    color: "#ce82ff",
    items: [
      L("Q", [W("QUALLE", ["🪼", "🌊"]), W("QUADRAT", ["🟥", "🟦", "🟩"])]),
      L("R", [W("RAKETE", ["🚀"]), W("REGENBOGEN", ["🌈"])]),
      L("S", [W("SONNE", ["☀️", "🌞"]), W("SCHIFF", ["🚢", "⛵"])]),
      L("T", [W("TIGER", ["🐯", "🐅"]), W("TOMATE", ["🍅"])]),
      L("U", [W("UHR", ["⏰", "⌚", "🕐"]), W("UFO", ["🛸"])]),
    ],
  },
  {
    id: "abc-5",
    title: "V – Z",
    speakTitle: "Buchstaben V bis Z",
    emoji: "🦓",
    color: "#ff86d0",
    items: [
      L("V", [W("VOGEL", ["🐦", "🦜", "🐤"]), W("VULKAN", ["🌋"])]),
      L("W", [W("WAL", ["🐳", "🐋"]), W("WOLKE", ["☁️", "⛅"])]),
      L("X", [W("XYLOFON", ["🎵", "🎶"])]),
      L("Y", [W("YACHT", ["🛥️", "⛵"]), W("YOGA", ["🧘"])]),
      L("Z", [W("ZEBRA", ["🦓"]), W("ZITRONE", ["🍋"])]),
    ],
  },
  {
    id: "abc-6",
    title: "Ä Ö Ü",
    speakTitle: "Die Buchstaben Ä, Ö und Ü",
    emoji: "🎉",
    color: "#ffc800",
    items: [
      L("Ä", [W("ÄRZTIN", ["👩‍⚕️", "🩺"]), W("ÄSTE", ["🌳", "🌿"])]),
      L("Ö", [W("ÖL", ["🫒", "🛢️"])]),
      L("Ü", [W("ÜBERRASCHUNG", ["🎉", "🎁", "🥳"])]),
    ],
  },
  {
    id: "zahlen-1",
    title: "Zahlen 0 – 4",
    speakTitle: "Zahlen null bis vier",
    emoji: "🖐️",
    color: "#1cb0f6",
    items: [
      N(0, "NULL", "🫧"),
      N(1, "EINS", "🍎"),
      N(2, "ZWEI", "🐥"),
      N(3, "DREI", "🎈"),
      N(4, "VIER", "⭐"),
    ],
  },
  {
    id: "zahlen-2",
    title: "Zahlen 5 – 9",
    speakTitle: "Zahlen fünf bis neun",
    emoji: "🎈",
    color: "#58cc02",
    items: [
      N(5, "FÜNF", "🍓"),
      N(6, "SECHS", "🐞"),
      N(7, "SIEBEN", "🌼"),
      N(8, "ACHT", "🐟"),
      N(9, "NEUN", "🚗"),
    ],
  },
  {
    id: "zehner-1",
    title: "10 – 50",
    speakTitle: "Zahlen zehn bis fünfzig",
    emoji: "🔟",
    color: "#ff9600",
    items: [
      N(10, "ZEHN", "🍬"),
      N(20, "ZWANZIG", "🫐"),
      N(30, "DREISSIG", "🌟"),
      N(40, "VIERZIG", "🍇"),
      N(50, "FÜNFZIG", "🐝"),
    ],
  },
  {
    id: "zehner-2",
    title: "60 – 100",
    speakTitle: "Zahlen sechzig bis hundert",
    emoji: "💯",
    color: "#ce82ff",
    items: [
      N(60, "SECHZIG", "🍒"),
      N(70, "SIEBZIG", "🌸"),
      N(80, "ACHTZIG", "🐠"),
      N(90, "NEUNZIG", "🍭"),
      N(100, "HUNDERT", "✨"),
    ],
  },
  {
    id: "vokabeln-tiere",
    title: "Tiere",
    speakTitle: "Tiere",
    emoji: "🐾",
    color: "#58cc02",
    items: [
      V("HUND", ["🐶", "🐕", "🦴"]),
      V("KATZE", ["🐱", "🐈"]),
      V("KUH", ["🐮", "🐄"]),
      V("SCHWEIN", ["🐷", "🐖"]),
      V("PINGUIN", ["🐧", "🧊"]),
      V("SCHMETTERLING", ["🦋", "🌸"]),
      V("SCHLANGE", ["🐍"]),
      V("PFERD", ["🐴", "🐎"]),
    ],
  },
  {
    id: "vokabeln-essen",
    title: "Essen",
    speakTitle: "Essen",
    emoji: "🍕",
    color: "#ff4b4b",
    items: [
      V("BROT", ["🍞", "🥖"]),
      V("KÄSE", ["🧀"]),
      V("MILCH", ["🥛", "🐄"]),
      V("EIS", ["🍦", "🍨"]),
      V("KEKS", ["🍪"]),
      V("ERDBEERE", ["🍓"]),
      V("MÖHRE", ["🥕", "🐰"]),
      V("BIRNE", ["🍐"]),
    ],
  },
  {
    id: "vokabeln-natur",
    title: "Farben & Natur",
    speakTitle: "Farben und Natur",
    emoji: "🌈",
    color: "#ffc800",
    items: [
      V("ROT", ["🔴", "🍎", "🍓"]),
      V("BLAU", ["🔵", "💙", "🐳"]),
      V("GELB", ["🟡", "🌟", "🍌"]),
      V("GRÜN", ["🟢", "🥦", "🐸"]),
      V("BLUME", ["🌸", "🌷", "🌻"]),
      V("BAUM", ["🌳", "🌲"]),
      V("STERN", ["⭐", "🌟"]),
      V("HERZ", ["❤️", "💖"]),
    ],
  },
  {
    id: "sprach-profi",
    title: "Sprach-Profi",
    speakTitle: "Richtig sprechen wie ein Profi",
    emoji: "🗣️",
    color: "#1cb0f6",
    items: [
      G(
        "📏",
        "ICH BIN GRÖSSER ALS DU",
        "ICH BIN GRÖSSER WIE DU",
        "Beim Vergleichen sagt man: größer ALS!"
      ),
      G(
        "🍽️",
        "ICH BLEIBE HIER, WEIL ICH HUNGER HABE",
        "ICH BLEIBE HIER, WEIL ICH HABE HUNGER",
        "Nach weil kommt das Tu-Wort ganz ans Ende: weil ich Hunger HABE!"
      ),
      G(
        "🌧️",
        "WIR BLEIBEN WEGEN DES REGENS DRINNEN",
        "WIR BLEIBEN WEGEN DEM REGEN DRINNEN",
        "Nach wegen sagt man: wegen DES Regens!"
      ),
      G(
        "🤝",
        "ER HAT MIR GEHOLFEN",
        "ER HAT MICH GEHOLFEN",
        "Helfen braucht MIR: Er hat MIR geholfen!"
      ),
      G(
        "🚶",
        "ICH BIN NACH HAUSE GEGANGEN",
        "ICH BIN NACH HAUSE GEGEHT",
        "Von gehen kommt: GEGANGEN!"
      ),
      G(
        "🥤",
        "ICH HABE SAFT GETRUNKEN",
        "ICH HABE SAFT GETRINKT",
        "Von trinken kommt: GETRUNKEN!"
      ),
      G(
        "🍎",
        "ICH HABE EINEN APFEL GEGESSEN",
        "ICH HABE EINEN APFEL GEESST",
        "Von essen kommt: GEGESSEN!"
      ),
      G(
        "🏆",
        "DU BIST DER EINZIGE",
        "DU BIST DER EINZIGSTE",
        "Einziger geht nicht zu steigern: der EINZIGE!"
      ),
      G(
        "👍",
        "GUT, BESSER, AM BESTEN",
        "GUT, GUTER, AM GUTESTEN",
        "Gut steigert man: gut, BESSER, am BESTEN!"
      ),
      G(
        "🐕",
        "DIE VIELEN HUNDE BELLEN",
        "DIE VIELEN HUNDS BELLEN",
        "Mehrere heißen: die HUNDE!"
      ),
    ],
  },
];

export function getChapter(id) {
  return CHAPTERS.find((c) => c.id === id);
}

// Alle Buchstaben / Zahlen / Wörter für falsche Antwortoptionen
export const ALL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ".split("");

export function allNumbersInChapter(chapter) {
  return chapter.items.filter((i) => i.type === "number").map((i) => i.value);
}
