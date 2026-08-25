"use client";

// Eltern-Bereich: Statistik pro Buchstabe/Zahl/Wort, Einstellungen, Reset,
// Update. Zugang über "3 Sekunden gedrückt halten" auf der Startseite.
import { useEffect, useState } from "react";
import Link from "next/link";
import { CHAPTERS } from "@/lib/content";
import { itemKeyOf } from "@/lib/lesson";
import { loadStats, loadProgress, resetAll, loadPoints } from "@/lib/progress";
import { loadName, saveName } from "@/lib/certificate";
import { loadManifest, getVoiceMode, setVoiceMode, getLauteOn, setLauteOn } from "@/lib/audio";
import UpdateButton from "@/components/UpdateButton";
import VoicePicker from "@/components/VoicePicker";

function Bar({ right, wrong }) {
  const total = right + wrong;
  const pct = total ? Math.round((right / total) * 100) : 0;
  const color = total === 0 ? "#ccc" : pct >= 80 ? "#58cc02" : pct >= 50 ? "#ffc800" : "#ff4b4b";
  return (
    <div className="stat-bar">
      <div className="stat-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function Eltern() {
  const [stats, setStats] = useState({});
  const [progress, setProgress] = useState({});
  const [name, setName] = useState("");
  const [points, setPoints] = useState(0);
  const [voices, setVoices] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [voiceMode, setVoiceModeState] = useState("system");
  const [lauteOn, setLauteOnState] = useState(true);
  const [dl, setDl] = useState(null); // {done,total}

  async function downloadAll() {
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const m = await loadManifest();
    const files = [...new Set(Object.values(m))];
    setDl({ done: 0, total: files.length });
    let done = 0;
    // in kleinen Gruppen laden – der Service Worker legt alles in den Cache
    for (let i = 0; i < files.length; i += 8) {
      await Promise.all(
        files.slice(i, i + 8).map((f) => fetch(`${base}/audio/${f}`).catch(() => null))
      );
      done = Math.min(files.length, i + 8);
      setDl({ done, total: files.length });
    }
  }

  useEffect(() => {
    setStats(loadStats());
    setProgress(loadProgress());
    setName(loadName());
    setPoints(loadPoints());
    setVoiceModeState(getVoiceMode());
    setLauteOnState(getLauteOn());
    loadManifest().then((m) => setAudioReady(!!m && Object.keys(m).length > 0));
  }, []);

  const daysAgo = (t) => (t ? Math.floor((Date.now() - t) / 86400000) : null);

  return (
    <main className="shell eltern">
      <header className="home-header">
        <div className="home-title">👨‍👩‍👧 Eltern</div>
        <div className="home-sub">Was sitzt, was wackelt – pro Buchstabe, Zahl und Wort</div>
      </header>

      <section className="eltern-box">
        <h3>Einstellungen</h3>
        <label>
          Name des Kindes
          <input
            className="cert-name"
            value={name}
            maxLength={20}
            onChange={(e) => {
              setName(e.target.value);
              saveName(e.target.value);
            }}
          />
        </label>
        <div className="eltern-row">
          <button className="btn btn-blue" onClick={() => setVoices(true)}>
            🗣️ System-Stimme wählen
          </button>
        </div>
        <div className="eltern-row" style={{ alignItems: "center" }}>
          <label className="eltern-toggle">
            <input
              type="checkbox"
              checked={voiceMode === "prerendered"}
              onChange={(e) => {
                setVoiceMode(e.target.checked ? "prerendered" : "system");
                setVoiceModeState(e.target.checked ? "prerendered" : "system");
              }}
            />
            Generierte Offline-Stimme statt System-Stimme (experimentell – Verständlichkeit prüfen!)
          </label>
          <label className="eltern-toggle">
            <input
              type="checkbox"
              checked={lauteOn}
              onChange={(e) => {
                setLauteOn(e.target.checked);
                setLauteOnState(e.target.checked);
              }}
            />
            Anlaut-Laute (mmm, sss, b…) auf Lernkarten und im Lese-Trainer abspielen
          </label>
        </div>
        <div className="eltern-row">
          <UpdateButton />
          <button className="btn btn-blue" onClick={downloadAll} disabled={!!dl && dl.done < dl.total}>
            {dl ? (dl.done < dl.total ? `📥 ${dl.done}/${dl.total}` : "✅ Offline-Paket komplett") : "📥 Offline-Paket laden"}
          </button>
        </div>
        <div className="eltern-info">
          „Offline-Paket laden“ holt alle Sprach-Dateien (~24 MB) einmal in den Cache – danach spricht die App auch ohne Internet mit der gleichen Stimme.
          <br />
          Aktive Stimme: {voiceMode === "prerendered" ? "generiert (offline)" : "System-Stimme des Geräts"}
          {audioReady ? "" : " · Audio-Paket nicht gefunden"} · Punkte gesamt: {points}
        </div>
        <button
          className="btn"
          style={{ background: "#ff4b4b", marginTop: 12 }}
          onClick={() => {
            if (window.confirm("Wirklich ALLEN Fortschritt löschen?")) {
              resetAll();
              window.location.href = "./";
            }
          }}
        >
          🗑️ Fortschritt zurücksetzen
        </button>
      </section>

      {CHAPTERS.map((c) => (
        <section className="eltern-box" key={c.id}>
          <h3>
            {c.emoji} {c.title}{" "}
            <span className="eltern-stars">{"⭐".repeat(progress[c.id] || 0) || "– noch nicht gespielt"}</span>
          </h3>
          <table className="stat-table">
            <tbody>
              {c.items.map((it) => {
                const key = itemKeyOf(it);
                const s = stats[`${c.id}::${key}`] || { seen: 0, right: 0, wrong: 0, last: null, streak: 0 };
                const d = daysAgo(s.last);
                return (
                  <tr key={key}>
                    <td className="stat-key">{it.type === "grammar" ? it.emoji : key}</td>
                    <td className="stat-barcell">
                      <Bar right={s.right} wrong={s.wrong} />
                    </td>
                    <td className="stat-num">
                      {s.seen === 0 ? "–" : `${s.right}✓ ${s.wrong}✗`}
                    </td>
                    <td className="stat-num">{s.streak >= 3 ? "🔥" : s.wrong > s.right && s.seen ? "⚠️" : ""}</td>
                    <td className="stat-num">{d === null ? "" : d === 0 ? "heute" : `vor ${d} T.`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}

      <div className="eltern-info" style={{ marginTop: 8 }}>
        ✓ = beim ersten Versuch richtig · ✗ = erst nach Fehler · 🔥 = 3× in Folge gewusst · ⚠️ = mehr Fehler als Treffer.
        Als „gemerkt“ gilt ein Buchstabe erst, wenn er im Trainer nach ein paar Tagen noch sitzt.
      </div>

      {voices && <VoicePicker onClose={() => setVoices(false)} />}
      <Link href="/" className="btn btn-blue" style={{ margin: "20px auto", display: "block", width: "fit-content" }}>
        ⬅️ ZURÜCK
      </Link>
    </main>
  );
}
