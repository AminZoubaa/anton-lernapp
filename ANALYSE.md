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

---

## Runde 2 – umgesetzt

**Warum 3 Sterne, aber nichts gemerkt (Diagnose):** Die Lektion prüfte Wiedererkennen unter Hilfestellung, nicht Erinnern: 3–4 Optionen (25–33 % Ratechance), hüpfende Hinweis-Tour bei jeder Aufgabe, nach einem Fehler weniger Restoptionen, 2 Sterne trotz Fehlern, Abfrage nur Minuten nach dem Lernen, nie ein Rückgriff auf ältere Buchstaben, keine eigene Produktion (Sagen/Schreiben).

**Änderungen dagegen:**
- Hinweis-Tour nur beim allerersten Durchgang eines Kapitels; bei Wiederholungen muss das Kind selbst suchen (Tour erst nach 3× Untätigkeit).
- Weiter-Knopf „drängelt“ erst nach 4 s statt 2 s.
- Sterne strenger: 3 = 0 Fehler, 2 = 1 Fehler, 1 = mehr (Minispiel-Fehler zählen mit).
- „Weißt du es noch?“: jede Lektion mischt 2 Aufgaben aus früheren Kapiteln derselben Reihe ein (A/B bleiben im Spiel, wenn C/D/E dran sind).
- **Trainer** (`/training`): 8 reine Abfrage-Aufgaben aus allen Kapiteln, priorisiert nach Fehlern und „lange nicht geübt“. Das ist der echte Test, ob etwas hängen bleibt – idealerweise am nächsten Tag spielen. Gleichzeitig der „Vokabel-Reparier-Trainer“.
- **Eltern-Bereich** (`/eltern`, Startseite unten 3 s gedrückt halten): pro Buchstabe/Zahl/Wort: wie oft gesehen, sofort gewusst ✓, erst nach Fehler ✗, 🔥 3× in Folge, ⚠️ wackelig, zuletzt geübt. Plus Name, Stimme, Reset, Update.
- **Update-Knopf** (Eltern-Bereich): löscht Caches + Service Worker und lädt frisch – bricht jede alte Offline-Version. Zeigt die Build-Version (Git-SHA).
- **Offline komplett:** `scripts/gen-sw.mjs` läuft nach jedem Build und schreibt den Service Worker mit der vollständigen Liste aller Dateien (HTML, JS, CSS, Font, Icons, Audio). Nach dem ersten Öffnen läuft alles ohne Internet; neue Version = neuer Cache-Name.
- **Vorgerenderte Audios:** `lib/audio.js` + Fallback in `lib/speech.js`. `npm run audio -- --engine openai|azure|piper` rendert alle 1 387 festen Texte als MP3 nach `public/audio/` und schreibt das Manifest. Anlaut-Laute (mmm, sss …) als eigene Aufnahmen unter `public/audio/laute/<BUCHSTABE>.mp3` – die Lernkarte spielt sie automatisch zweimal langsam ab. Die MP3s sind nicht im Repo (siehe .gitignore) – einmal lokal rendern, dann committen oder `.gitignore`-Zeile entfernen.

**Empfehlung Stimme:** Azure „de-DE-SeraphinaMultilingualNeural“ oder „de-DE-KatjaNeural“ (weiblich, sehr natürlich, kostenlos bis 500 000 Zeichen/Monat) oder OpenAI „nova“. Piper-Frauenstimmen für Deutsch gibt es nur in „low“-Qualität.

**Nachsprechen:** technisch eingebaut, aber nur so gut wie die Erkennung des Geräts. Auf dem iPad in Safari funktioniert es (Diktat muss aktiviert sein, Internet nötig); in der Home-Bildschirm-App hängt es von der iOS-Version ab. Der Eltern-Bereich zeigt an, ob es im aktuellen Browser verfügbar ist. Für Einzelbuchstaben ist die Erkennung unzuverlässig (Apple versteht „Be“ mal als „B“, mal als „Bee“) – für Wörter deutlich besser.

**Noch offen (nächste Runde):** Kleinbuchstaben, getrennte Freischalt-Pfade, Zehnerbündel für 10–100, Badge-Erklärungen, SVG-Bilder statt Emojis.

## Runde 3 – Audio-Fehler & Trainer

**Überlagerte Sprache – Ursachen und Fix**
1. Idle-/Nudge-Timer hielten *Pausen* innerhalb einer Ansage für Stille und sprachen dazwischen (die Sequenz wurde abgebrochen, der Nudge kam obendrauf). Fix: `isSpeaking()` kennt jetzt laufende Sequenzen inkl. Pausen.
2. „Sprich nach“ lief parallel zu allem anderen (Nudge, Wiederholung, Weiter). Fix: globale Sprach-Sperre (`holdSpeech`) – während des Nachsprechens gibt es keine automatischen Ansagen, und der Weiter-Knopf ist gesperrt. Ablauf strikt nacheinander: Ansage → Aufnahme → *Vorspielen der eigenen Aufnahme* → Vorbild → Urteil.
3. iOS „verschluckt“ manchmal das Ende einer Ansage → hängende Sequenzen / ewiges „🔊 …“. Fix: Watchdog pro Teil und Obergrenze in `whenSpeechDone`.
4. **Hintergrund-Audio, nicht stoppbar:** das war der Wake-Lock-Fallback `nosleep.js` (spielt ein unsichtbares Video → erscheint als Medienwiedergabe, läuft nach dem Schließen weiter, stört die Sprachausgabe). Entfernt. Wach halten nur noch über die Wake-Lock-API (iOS ≥ 16.4). Zusätzlich: Sprache und Musik stoppen sofort, wenn die App in den Hintergrund geht.

**Trainer für Nicht-Leser**
- 👂 **Hören & Tippen:** nur Aufgaben ohne Lesen (Buchstabe hören → tippen, Bild → Anfangsbuchstabe, Zahl hören/zählen, Wort hören → Bild). Wörter lesen, Zahlwörter und Sätze sind raus.
- 📖 **Lesen:** neue Mechanik „Buchstaben zusammenziehen“: Wort erscheint groß (mit Kleinschreibung darunter), wird Laut für Laut mit Hervorhebung gesprochen, dann als Ganzes; das Kind wählt das passende Bild. Nur Wörter, deren Buchstaben alle schon gelernt sind (Kapitel mit ≥ 1 Stern) – öffnet sich also automatisch, sobald es sinnvoll wird. Mit aufgenommenen Anlaut-Lauten wird das Zusammenziehen echt (statt „Be-A-eL-eL“).

## Runde 4 – Open-Source-Stimme, Anlaute, Memory

- **Stimme:** Piper (Open Source, offline, kostenlos), Stimme „kerstin“ (weiblich, deutsch). Alle 2 159 festen Texte sind als MP3 im Repo (`public/audio`, ~24 MB) – gleiche Stimme auf jedem Gerät, funktioniert offline. Rendern/Nachrendern: `npm run audio` (braucht `pip install piper-tts` und ffmpeg; Stimmen aus dem GitHub-Release rhasspy/piper v0.0.2 nach `voices/`). Alternativstimmen ramona / eva_k mit `--voice`.
- **Anlaute echt:** `scripts/tts.py` gibt dem Modell **Phoneme** statt Text – M → „mːː“, A → „aːː“, B → „bə“ (kurz, mit Schwa, wie in der Anlauttabelle), S → „sːː“, Z → „tsːː“, W → „vːː“, V → „fːː“ usw. Dauerlaute werden per Tonhöhen-erhaltendem Zeitstrecken verdoppelt. Lernkarte spielt den Laut zweimal, Lese-Trainer zieht damit zusammen.
- Sprach-MP3s werden nicht mehr bei der SW-Installation geladen (2 000 Requests sind iOS zu viel), sondern beim ersten Abspielen gecacht – oder komplett über „📥 Offline-Paket laden“ im Eltern-Bereich.
- **Memory:** jede aufgedeckte Karte wird benannt (Buchstabe / Wort / „großes A“ / Zahlwort); nach dem letzten Paar bleibt das Brett offen mit Ergebnis-Banner, erst WEITER wechselt.

## Runde 5 – Nachsprechen raus, Spiele-Engine, neue Spiele, Urkunde

- **Nachsprechen komplett entfernt** (Komponente, Erkennung, Knöpfe). Kommt erst wieder, wenn es einen klaren Ablauf gibt: Ansage → sichtbarer Countdown → Aufnahme → Vorspielen → Weiter, ohne dass irgendetwas anderes dazwischen sprechen oder blockieren kann. Aktuell blockiert nichts mehr.
- **Rennen neu:** eigene Canvas-Engine (ein rAF-Loop, keine DOM-Updates pro Frame, DPR-skaliert – auf dem iPad flüssig). Lenken **stufenlos**: Finger irgendwo auf die Straße legen und ziehen, das Auto folgt weich der Fingerposition (kein Spurwechsel-Tippen mehr). Schilder mit Buchstaben, Zielbuchstabe oben groß + gesprochen, **ähnliche Buchstaben als Ablenker** (E/F, M/N, O/Q, P/R, B/D …), Buchstabenpool = gelernte Kapitel. 3 Leben, Tempo steigt, Combo, Bestenliste (Top 10 mit Namen). Warum keine Phaser/PixiJS: 1 MB+ Bibliothek für ein Spiel dieser Größe bringt keinen Vorteil, kostet aber Ladezeit im Offline-Cache; GSAP ist eine Tween-Bibliothek, keine Spiele-Engine.
- **🎈 Ballon-Jagd** (Buchstaben, kein Lesen): Ballons steigen auf, gesuchter Buchstabe wird gesprochen (🔊 zum Wiederholen), richtige tippen, Ablenker sind ähnliche Buchstaben, 60 s, Bestenliste.
- **🐸 Zähl-Teich** (Zahlen, kein Rechnen): Tiere antippen = laut mitzählen, dann Ziffer auf dem Seerosenblatt tippen. 10 Runden, Schwierigkeit 1–3 → 1–5 → 1–9, Tempo-Bonus, Bestenliste.
- Gemeinsame Bestenliste (`lib/leaderboard.js`), Startseite: vier Spiel-Knöpfe.
- **Urkunde:** 15 × 10 cm bei 300 dpi (1772 × 1181 px) → passt randlos auf Fotodrucker 10x15 und Postkarte. Knöpfe: **Teilen** (System-Menü: AirDrop, Fotos, Nachrichten), **Drucken** (@page 150×100 mm, randlos), Bild, PDF (jetzt exakt 150×100 mm).
- **Anlaute aus einer fertigen Bibliothek?** Es gibt keine frei lizenzierte, fertige Sammlung deutscher Anlaut-Laute (mmm, sss, bə…) – die schulischen Anlauttabellen (Tinto, Zebra, Mildenberger) sind urheberrechtlich geschützt, Wiktionary/Forvo haben nur Wörter, keine isolierten Laute. Deshalb erzeugen wir sie selbst aus Phonemen mit derselben Piper-Stimme – konsistent und offline.

## Runde 6 – Audio-Qualität & -Korrektheit

- **Wörter wurden buchstabiert:** Die App schreibt Wörter in GROSSBUCHSTABEN, und Piper/espeak liest solche Wörter als Abkürzung („A-P-F-E-L“). Genau das war „nur Laute statt Wortname“ im Memory und das „verlorene Wort“ bei „A wie AFFE“. Fix: für die Synthese werden Großwörter in normale Schreibweise gewandelt (Schlüssel bleibt der Originaltext) – alle 2 477 Dateien neu gerendert.
- **Zu leise:** Piper liefert ~6 dB weniger als die System-Stimme. Fix: Kompression + Anhebung + Limiter beim Encoden (jetzt ca. so laut wie die Web-Speech-API). Hintergrundmusik auf weniger als die Hälfte reduziert.
- **Falscher Buchstabe / Überlagerung beim schnellen Tippen:** Audio-Elemente wurden wiederverwendet; auf iOS kann ein pausiertes Element mit dem alten play()-Versprechen „nachspielen“. Fix: jede Wiedergabe ein frisches Element, Generationszähler, Quelle wird beim Stoppen gekappt.
- **Nicht stoppbare Sprache im Hintergrund:** Die Sprachausgabe von iOS (Web-Speech-API) ist ein **System-Dienst außerhalb der Seite**. Ruft man `cancel()` und direkt danach `speak()`, ignoriert iOS das cancel() häufig und hängt die Ansage an eine Warteschlange – die läuft dann weiter, auch wenn App und Browser geschlossen sind, und überlagert die nächste Sitzung. Fix: kurzer Abstand zwischen cancel() und speak(), beim Verlassen mehrfaches pause/cancel mit Verzögerung, beim Zurückkommen sofort cancel(). Außerdem läuft jetzt fast alles über die MP3-Dateien, die iOS beim Schließen sofort stoppt. **Falls es doch noch einmal hängt:** Das ist die System-Sprachausgabe von iOS – sie lässt sich mit dem Stumm-Schalter nicht beenden, wohl aber, indem man kurz Siri aktiviert (Seitentaste halten) und wieder schließt, oder das iPad sperrt; bei hartnäckigen Fällen ein Neustart.
