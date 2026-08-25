# Analyse: UX & Lerninhalte – anton-lernapp

Stand: August 2026. Grundlage: kompletter Code (Inhalte, Lektionsaufbau, Minispiele, Lektions-UI, Startseite).

## Was in diesem Update geändert wurde

| Thema | Änderung |
|---|---|
| Umlaut-Lektion | Kapitel `abc-6` (Ä Ö Ü) komplett entfernt; Ä/Ö/Ü tauchen auch nicht mehr als falsche Antwortoptionen auf. |
| X-Lektion | Statt XYLOFON mit Notenschlüssel-Emoji: TAXI 🚕, HEXE 🧙‍♀️, BOXER 🥊. Das X wird als Laut **im** Wort gelernt (wie in gängigen Anlauttabellen). Sprachausgabe („TAXI – da ist ein X drin!“), Hervorhebung im Wort und Übungen sind angepasst; die Frage „Mit welchem Buchstaben beginnt…“ wird für X nicht mehr gestellt. |
| iPad-Sleep | Neues Modul `lib/wakeLock.js`: Screen Wake Lock API (Safari ab iOS 16.4) plus `nosleep.js` als Fallback. Wird beim Start-Tipp aktiviert, beim Verlassen freigegeben, nach Tab-Wechsel automatisch erneuert. |
| Fun Facts | `lib/facts.js` mit 289 Fakten. Gezeigte Fakten werden im localStorage gemerkt; Wiederholung erst, wenn alle einmal dran waren. |
| Minispiele | Falsche Tipps kosten jetzt: −2 Münzen, kurze Sperre (700 ms) gegen Durchklicken, roter Hinweis, und der Fehler zählt für die Sterne-Wertung (einmal pro Spiel, wie bei Übungen). Memory: erst ab dem 3. Fehlversuch (Fehlversuche gehören dort zum Spiel). Punkte können nicht unter 0 fallen. |
| Nachsprechen | `lib/recognition.js` + `components/SpeakBack.js`: Mikro-Knopf auf Lernkarten (Wörter, Zahlen, Buchstaben-Wörter), nur sichtbar, wenn der Browser Spracherkennung kann. Tolerant gegenüber kleinen Aussprachefehlern. |
| Kleine Bugs | Zahl 0: kein „Wie viele siehst du?“ mehr (es war nichts zu sehen). Memory mit Zehnerzahlen zeigte für „20“ fünf Bildchen – jetzt Zahlwort als Partnerkarte. |

## Lerninhalte – was ich verbessern würde

**1. Kleinbuchstaben fehlen komplett.** Die App zeigt nur Großbuchstaben. Für Vorschule/1. Klasse ist das Paar „A a“ zentral (Kinder müssen beide Formen erkennen). Vorschlag: Lernkarte zeigt „A a“, eine Übung „Finde das kleine a“, Blitz-Blick/Zwillings-Suche mit Klein-/Großbuchstaben mischen.

**2. Buchstabenname vs. Laut.** Die Sprachausgabe sagt bei „Welchen Buchstaben hörst du?“ den Namen („Be“, „Ce“), die Lernkarte lehrt aber Anlaute („B wie Ball“). Für Leseanfänger ist der **Laut** wichtig (bbb, nicht „Be“). Das TTS kann isolierte Konsonantenlaute schlecht sprechen; realistischer Weg: eigene, vorher aufgenommene Laut-Audios (siehe Abschnitt Audio unten).

**3. Verwechslungsbuchstaben gezielt üben.** Die Ablenker in Übungen und Spielen sind zufällig. Kinder verwechseln typischerweise b/d, p/q, m/n, u/n, E/F. Vorschlag: Ablenker-Pool bevorzugt aus „ähnlichen“ Buchstaben ziehen, sobald das Kind das Kapitel schon einmal geschafft hat.

**4. Buchstabe C.** „C wie Clown/Computer“ ist okay, aber C hat im Deutschen keinen eigenen stabilen Laut (K oder Z, meist in CH/SCH). Alternativ nur in Kombination lehren (CH, SCH) oder bewusst als „Fremdwort-Buchstabe“ markieren.

**5. Sprach-Profi-Kapitel.** „Wegen des Regens“ (Genitiv) ist für 5–7-Jährige zu weit weg vom Sprachgebrauch und wird in gesprochener Sprache vom Dativ verdrängt. Ich würde diesen Satz streichen; „größer als“, „mir geholfen“, „gegangen/getrunken/gegessen“ sind dagegen genau richtig. Zusätzlich sinnvoll: Artikel (der/die/das) mit Bildern.

**6. Zahlen 10–100.** Bei „HUNDERT“ werden 100 Emojis gerendert – visuell Chaos, kein Lerneffekt. Besser: Zehnerbündel darstellen (10 Punkte pro Reihe / „Zehnerstangen“), Mengen ab 20 nur noch als Bündel zeigen.

**7. Wiederholung nur innerhalb eines Kapitels.** Schwache Items werden nur im gleichen Kapitel bevorzugt. Vorschlag: eine „Tages-Wiederholung“ auf der Startseite, die die schwächsten Items aus allen abgeschlossenen Kapiteln mischt (5 Aufgaben, 2 Minuten).

**8. Emoji-Abhängigkeit.** 🪼 (Qualle) braucht iOS 16.4+, auf älteren Geräten erscheint ein Kästchen. Auch Emoji-Designs unterscheiden sich pro Gerät. Langfristig: eigene SVG-Bilder für alle Wörter (dann wäre auch ein echtes Xylofon möglich).

## UX – was ich verbessern würde

**1. Linearer Freischalt-Pfad.** Alle Kapitel sind eine Kette: Tiere-Vokabeln erst nach ABC 1–5 *und* allen Zahlen. Ein Kind, das Zahlen mag, kommt nicht an Tiere. Vorschlag: drei getrennte Pfade (ABC, Zahlen, Wörter) mit eigener Freischaltung.

**2. Beenden ohne Nachfrage.** Das ✕ oben links verwirft die Lektion sofort. Ein Kind tippt das schnell versehentlich. Vorschlag: kurze Rückfrage („Wirklich aufhören?“) oder ✕ nur lang drücken.

**3. Nudge-Timing.** Der Weiter-Knopf „meckert“ schon nach 2 Sekunden Ruhe. Bei Lernkarten schauen Kinder oft noch. 4–5 Sekunden beim ersten Mal wären ruhiger; die Wiederholungs-Intervalle (7–9 s) sind okay.

**4. Elternbereich fehlt.** Kein Ort für: Name ändern, Fortschritt zurücksetzen, Stimme wählen, Musik, Sprachaufnahme an/aus. Das ist aktuell verstreut (Stimmwahl auf der Startseite, Name erst auf der Urkunde). Ein mit „lange drücken“ geschützter Eltern-Knopf würde alles bündeln.

**5. Badges ohne Erklärung.** Auf der Startseite sind nur Emojis zu sehen; welche Bedingung dahintersteckt, sieht man nicht. Antippen → kleine Karte mit Titel und „so bekommst du es“.

**6. Punkte-Inflation.** Punkte gibt es überall (+1 pro Tipp beim Zählen, +10 Bonus je Spiel). Mit dem neuen Abzug ist es besser, aber ein sichtbares Ziel („noch 40 bis zum nächsten Abzeichen“) würde Punkte bedeutungsvoller machen.

**7. Lange Lektionen.** ABC-Kapitel mit 6 Buchstaben ergeben ~20 Schritte (Karten + Übungen + Wiederholung + 3 Spiele + 2 Fakten). Für 5-Jährige ist das lang. Vorschlag: Lektion in zwei Hälften mit Zwischen-Belohnung, oder Wiederholungsblock nur bei Bedarf (nur schwache Items).

**8. Textabhängigkeit.** „Welcher Satz ist richtig?“ zeigt lange Sätze in Großbuchstaben, die die Zielgruppe nicht lesen kann – rein akustisch lösbar, aber der Bildschirm sieht nach Lesen aus. Hier helfen 1️⃣/2️⃣ mit großen Lautsprecher-Knöpfen pro Satz.

**9. Accessibility.** Buttons haben teils keine `aria-label`s (Emoji-only), Kontrast der grauen „?“-Slots ist niedrig. Für Kinder mit Sehschwäche ein größerer Schriftmodus wäre gut.

## Spracherkennung – Optionen

- **Web Speech API (jetzt eingebaut).** iPad Safari ab iOS 14.5, sendet Audio an Apple, braucht Internet und aktiviertes Diktat. In der Home-Bildschirm-App ist sie erst in neueren iOS-Versionen zuverlässig verfügbar – deshalb erscheint der Knopf nur, wenn es funktioniert.
- **Offline / WASM:** [Vosk](https://github.com/ccoreilly/vosk-browser) (deutsches Kleinmodell ~50 MB, gut für Einzelwörter), [whisper.cpp WASM](https://github.com/ggerganov/whisper.cpp) oder `@xenova/transformers` mit whisper-tiny (~40 MB, auf älteren iPads langsam), [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) (WASM, Streaming). Für ein „Sprich nach“-Feature mit ~150 Zielwörtern wäre Vosk die pragmatischste Wahl; das Modell müsste vom Service Worker gecacht werden.
- **Ohne echte Erkennung:** Lautstärke-Messung über Web Audio („Hast du laut gesprochen?“) als Fallback, damit die Übung nie „tot“ ist.

## Sprachausgabe ohne Web Speech API – Optionen

- **Vorproduzierte Audio-Dateien (empfohlen).** Die App hat einen begrenzten Textkorpus (Wörter, Buchstaben, Zahlen, Anleitungen, Lob). Alles einmal mit einer guten Stimme rendern (z. B. Piper „thorsten“/„kerstin“ oder eine Cloud-TTS), als MP3/OGG ausliefern und mit `<audio>` abspielen. Vorteile: identische Stimme auf jedem Gerät, echte Konsonantenlaute möglich, offline, kein Sleep-Problem durch TTS-Aussetzer. Nachteil: Fun Facts (289) und dynamische Sätze müssten ebenfalls vorgerendert werden – machbar per Build-Skript.
- **Piper in WASM** (z. B. `@mintplex-labs/piper-tts-web` oder sherpa-onnx TTS): deutsche Stimmen 20–60 MB, Qualität gut, Startzeit auf iPad einige Sekunden.
- **espeak-ng / meSpeak.js:** ~2 MB, läuft überall, klingt aber robotisch – für Kinder eher abschreckend.

## Nächste Schritte (Vorschlag in Reihenfolge)

1. Kleinbuchstaben ergänzen (größter Lerneffekt).
2. Freischalt-Pfade trennen + ✕-Rückfrage (größter UX-Effekt, wenig Aufwand).
3. Vorproduzierte Audios für Buchstabenlaute und Wörter.
4. Tages-Wiederholung über alle Kapitel.
5. Eigene SVG-Bilder statt Emojis.
