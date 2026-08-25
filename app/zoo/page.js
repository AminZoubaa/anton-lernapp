"use client";

// Mein Buchstaben-Zoo + Tages-Sticker.
// Jeder Buchstabe ist ein Tier (Anlaut-Tier: A = Affe, B = Bär …). Ein Tier
// zieht ein, sobald der Buchstabe dreimal sofort richtig war (Statistik).
// Futter/Sticker gibt es für die Tagesrunde: 3 Aufgaben mit den wackeligsten
// Buchstaben – jeden Tag ein neuer Sticker ins Album.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadStats, rankItemsForTraining } from "@/lib/progress";
import { speak } from "@/lib/speech";
import { loadStickers } from "@/lib/stickers";

const ANIMALS = { A: "🐒", B: "🐻", C: "🦎", D: "🐬", E: "🐘", F: "🐸", G: "🦒", H: "🐹", I: "🦔", J: "🐆", K: "🐱", L: "🦁", M: "🐭", N: "🦛", O: "🐙", P: "🐧", Q: "🪼", R: "🐀", S: "🐍", T: "🐯", U: "🦉", V: "🐦", W: "🐳", X: "🦖", Y: "🦓", Z: "🐐" };
const NAMES = { A: "Affe", B: "Bär", C: "Chamäleon", D: "Delfin", E: "Elefant", F: "Frosch", G: "Giraffe", H: "Hamster", I: "Igel", J: "Jaguar", K: "Katze", L: "Löwe", M: "Maus", N: "Nilpferd", O: "Oktopus", P: "Pinguin", Q: "Qualle", R: "Ratte", S: "Schlange", T: "Tiger", U: "Uhu", V: "Vogel", W: "Wal", X: "Xaver der Dino", Y: "Yak-Zebra", Z: "Ziege" };
export default function Zoo() {
  const router = useRouter();
  const [level, setLevel] = useState({});
  const [stickers, setStickers] = useState([]);
  const [todayDone, setTodayDone] = useState(false);
  useEffect(() => {
    const stats = loadStats();
    const lv = {};
    for (const [k, s] of Object.entries(stats)) {
      const key = k.split("::")[1];
      if (key.length === 1 && ANIMALS[key]) lv[key] = Math.max(lv[key] || 0, s.streak >= 3 || s.right >= 3 ? 2 : s.right >= 1 ? 1 : 0);
    }
    setLevel(lv);
    const st = loadStickers();
    setStickers(st);
    setTodayDone(st.some((s) => s.date === new Date().toISOString().slice(0, 10)));
  }, []);
  const count = Object.values(level).filter((v) => v >= 2).length;

  return (
    <main className="shell">
      <header className="home-header">
        <div className="home-title">🐾 Mein Buchstaben-Zoo</div>
        <div className="home-sub">{count} von 26 Tieren sind eingezogen</div>
      </header>
      <section className="eltern-box">
        <h3>🌟 Tages-Sticker</h3>
        <div className="eltern-info" style={{ marginTop: 0 }}>
          Jeden Tag eine kurze Runde mit deinen wackeligsten Buchstaben – dafür gibt es einen Sticker.
        </div>
        <div className="sticker-row">
          {stickers.map((s, i) => <span key={i} className="sticker" title={s.date}>{s.emoji}</span>)}
          {!stickers.length && <span className="board-empty">Noch kein Sticker – hol dir den ersten!</span>}
        </div>
        <Link href="/training?daily=1" className="btn" style={{ display: "inline-block", marginTop: 10, textDecoration: "none" }}>
          {todayDone ? "✅ Heute schon geschafft – nochmal üben" : "🎯 TAGESRUNDE STARTEN"}
        </Link>
      </section>
      <section className="eltern-box">
        <h3>Gehege</h3>
        <div className="zoo-grid">
          {Object.keys(ANIMALS).map((L) => {
            const lv = level[L] || 0;
            return (
              <button key={L} className={`zoo-cage lv${lv}`} onClick={() => speak(lv >= 2 ? `${L} wie ${NAMES[L]}! ${NAMES[L]} wohnt schon bei dir!` : lv === 1 ? `${L}! ${NAMES[L]} schaut schon vorbei. Übe das ${L} noch etwas!` : `Das ${L} kennst du noch nicht. Dann zieht ${NAMES[L]} ein!`)}>
                <span className="zoo-animal">{lv >= 2 ? ANIMALS[L] : lv === 1 ? "👀" : "🔒"}</span>
                <span className="zoo-letter">{L}</span>
              </button>
            );
          })}
        </div>
        <div className="eltern-info">🔒 noch nicht gelernt · 👀 schon gesehen · Tier = dreimal sofort gewusst. Antippen: Tier stellt sich vor.</div>
      </section>
      <button className="btn btn-blue" style={{ margin: "10px auto 30px", display: "block" }} onClick={() => router.push("/")}>⬅️ ZURÜCK</button>
    </main>
  );
}
