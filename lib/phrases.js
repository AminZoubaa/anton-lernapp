// Große Phrasen-Pools für die Sprachausgabe – nie langweilig!
// pickFrom() vermeidet Wiederholungen der letzten Phrasen.

export const PRAISE = [
  "Super!",
  "Toll gemacht!",
  "Klasse!",
  "Spitze!",
  "Wow, du bist gut!",
  "Genau richtig!",
  "Du bist ein Star!",
  "Fantastisch!",
  "Ausgezeichnet!",
  "Perfekt!",
  "Ganz genau!",
  "Richtig gut!",
  "Wunderbar!",
  "Stark!",
  "Das war stark!",
  "Ja, genau so!",
  "Du bist ja ein Profi!",
  "Meisterhaft!",
  "Volltreffer!",
  "Bingo!",
  "Juhu, richtig!",
  "Sehr schön!",
  "Prima!",
  "Bravo!",
  "Weiter so, Champion!",
  "Du lernst so schnell!",
  "Ein Punkt für dich!",
  "Das hast du dir verdient!",
  "Große Klasse!",
  "Einfach spitze!",
  "Du kleiner Schlaufuchs!",
  "Da staune ich aber!",
  "Wie ein echter Schulprofi!",
  "Hervorragend!",
  "Das saß!",
  "Zack, richtig!",
  "Du hast es voll drauf!",
  "So macht man das!",
  "Ein Meisterstück!",
  "Applaus für dich!",
];

// Kurz und auf den Punkt – wird nach der Fehler-Erklärung gesprochen
export const TRY_AGAIN = [
  "Versuch es nochmal!",
  "Gleich hast du es!",
  "Du schaffst das!",
  "Probier es noch einmal!",
  "Nicht schlimm, weiter geht's!",
  "Fast! Noch ein Versuch!",
  "Schau genau hin!",
  "Hör gut zu und versuch es nochmal!",
  "Beim nächsten Mal klappt es!",
  "Nur Mut!",
  "Üben macht stark!",
  "Kopf hoch, nochmal!",
  "Jeder Fehler hilft beim Lernen!",
  "Gleich klappt es!",
  "Du bist nah dran!",
  "Noch einmal ganz in Ruhe!",
  "Augen auf, du findest es!",
  "Ohren auf, du hörst es!",
  "Denk kurz nach, dann klappt es!",
  "Weiter, du packst das!",
];

export const MOTIVATION = [
  "Du schaffst das!",
  "Bisher bist du super!",
  "Bald bist du am Ziel!",
  "Weiter so, du machst das toll!",
  "Schau genau hin, du findest es bestimmt!",
  "Ich glaube an dich!",
  "Du bist stärker als die Aufgabe!",
  "Gleich hast du es geschafft!",
  "Nimm dir Zeit, du kannst das!",
  "Ein Schritt nach dem anderen!",
  "Hör nochmal gut zu!",
  "Deine Ohren sind super Detektive!",
  "Deine Augen finden die Antwort!",
  "Nur noch ein bisschen!",
  "Zeig, was du kannst!",
  "Du bist heute richtig fleißig!",
  "Lernen macht dich stark!",
  "Jede Aufgabe macht dich schlauer!",
  "Tippe einfach auf deine Antwort!",
  "Trau dich, du machst das prima!",
  "Gemeinsam schaffen wir das!",
  "Du bist ein Lern-Held!",
  "Deine Punkte warten schon!",
  "Gleich gibt es wieder Sterne!",
  "Auf geht's, kleiner Entdecker!",
];

export const STREAK_PRAISE = [
  "Super Serie! Weiter so!",
  "Wahnsinn, alles richtig!",
  "Du bist auf einer Glückssträhne!",
  "Dreimal richtig! Unglaublich!",
  "Deine Serie brennt! Feuer frei!",
  "Niemand stoppt dich heute!",
  "Rekordverdächtig!",
  "Du bist im Lauf! Weiter!",
  "Was für eine Serie!",
  "Champion-Serie!",
  "Alles richtig, du Überflieger!",
  "Deine Serie wächst und wächst!",
];

// Fun Facts liegen jetzt in lib/facts.js (über 280 Stück, ohne Wiederholung)
export { FUN_FACTS } from "./facts";

// ---------- Zufall ohne nervige Wiederholungen ----------

const recent = new Map();

export function pickFrom(pool, memory = 5) {
  if (!pool.length) return "";
  const used = recent.get(pool) || [];
  let candidate;
  let guard = 0;
  do {
    candidate = pool[Math.floor(Math.random() * pool.length)];
    guard++;
  } while (used.includes(candidate) && guard < 25);
  used.push(candidate);
  while (used.length > Math.min(memory, pool.length - 1)) used.shift();
  recent.set(pool, used);
  return candidate;
}

// Abwärtskompatibel
export function randomOf(arr) {
  return pickFrom(arr);
}
