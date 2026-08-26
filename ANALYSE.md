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

## Runde 7 – Spiel-Logik & Feedback

- **Rennen & Ballon-Jagd:** Countdown 3-2-1-LOS (gesprochen + groß im Bild), Ziel-Buchstabe erscheint groß pulsierend in der Mitte („Sammle alle …“) und fliegt dann klein nach oben ins HUD – bei jedem Zielwechsel erneut. Treffer: grünes „+N“ steigt auf + Feuerwerk. Fehler: rotes „−5“ / „−1 ❤️“, Explosion, roter Rand-Blitz, Bild wackelt; beim Auto bleiben Risse und ab dem 2. Schaden Rauch.
- **Memory (beide):** Hänger beseitigt – Zustand liegt jetzt in Refs (keine veralteten Closures bei schnellen Tipps), Reaktion auf `pointerdown` statt `click`, und liegen zwei falsche Karten offen, werden sie beim nächsten Tipp sofort umgedreht statt zu blockieren.
- **Sterne-Abzug in Minispielen:** Fang-Spiel: falscher Buchstabe = ein Stern weg (man muss wirklich fünf *richtige* schaffen). Blasen fangen: falsche Blase = die zuletzt gefangene Blase kommt zurück. Beides zusätzlich zu −2 Münzen und dem Fehler für die Lektions-Sterne.

## Runde 8 – Ehrliche Bilanz zur generierten Stimme

Ich kann nicht hören. Deshalb habe ich die Dateien mit einer Spracherkennung (Whisper) gegengeprüft: Die kostenlosen deutschen Frauenstimmen von Piper (kerstin, ramona, eva_k – alle nur „low“-Qualität) werden bei Einzelwörtern und kurzen Sätzen häufig **nicht** korrekt erkannt („Wolke“ → „wach“, „Bus! Mit B!“ → „das ist die Tille“). Das deckt sich mit deinem Eindruck: Die Wörter werden verschluckt. Ein zweiter Verdacht war das Abspielen mit verändertem Tempo (iOS erzeugt dabei Artefakte) – auch das ist jetzt abgestellt.

**Konsequenz (wie von dir vorgegeben):**
- **Standard ist wieder die System-Stimme** des Geräts – für alle Ansagen, Buchstaben, Wörter, Lektionen, Spiele.
- Die generierte Stimme bleibt nur als **Schalter im Eltern-Bereich** („experimentell“) – aus, bis sie nachweislich taugt.
- **Anlaut-Laute (mmm, sss, b…)** kann die System-Stimme nicht erzeugen; die kommen weiterhin generiert – jetzt aus der besten verfügbaren deutschen Piper-Stimme (thorsten-high, 22 kHz), separat abschaltbar. Hörproben liegen bei.

Was eine wirklich gute, kostenlose Offline-Frauenstimme bräuchte: ein „medium/high“-Piper-Modell für Deutsch mit weiblicher Sprecherin – das gibt es derzeit nicht. Möglich wäre, ein eigenes Piper-Modell aus ein paar Stunden Aufnahmen zu trainieren (ein Tag Rechenzeit auf einer GPU), oder die vorhandenen Texte von einer echten Person einsprechen zu lassen (~2 500 kurze Sätze, etwa 3–4 Stunden Aufnahme) – das wäre pädagogisch die beste Lösung und das Skript würde die Dateien genauso einbinden.

## Runde 9 – Schreiben, Spiele-Pool, Urkunde

- **✏️ Schreiben lernen** (`/schreiben`, Vollbild, Finger/Stift/Maus, Scrollen & Zoomen gesperrt): Bahnen für A–Z und 0–9 in Schul-Schreibrichtung. Pro Strich: Vorführung (Punkt läuft die Bahn entlang, Pfeil = Richtung, nummerierter Startpunkt) → Kind zieht nach → Bewertung (Bahn-Abdeckung 65 % + Genauigkeit 35 %): ≥ 82 % „Perfekt“, ≥ 60 % „Gut gemacht“, sonst „Nochmal“ mit erneuter Vorführung. Knöpfe: Vorführen, Strich löschen, Zurück (letzten Strich zurücknehmen), Buchstabe anhören. Wörter Buchstabe für Buchstabe: eigener Name, MAMA, PAPA, HALLO, HAUS, SONNE, BLUME, WELT, ERDE, OMA, OPA, AUTO, BALL. Fortschritt (✓) pro Zeichen.
- **Rennen & Ballons:** Pool ist jetzt das ganze Alphabet **plus Ziffern 0–9**, zufälliger Start, rotierend. Ziffern werden als Zahlwort gesprochen; Verwechsler auch für Ziffern (0/O, 1/I, 5/S, 2/Z, 8/B).
- **Urkunde:** Pokal links und Gold-/Silber-/Bronze-Medaille rechts (nach Sternen) fest integriert; Fußzeile in eigener Zeile, nichts überlappt mehr. **In der Home-Bildschirm-App kein neuer Tab mehr:** Drucken, Bild und PDF laufen dort alle über das System-Teilen-Menü (Drucken/Fotos/AirDrop) – die Sackgasse ist damit weg.

## Runde 10 – Rennen ausgebaut, sechs neue Spiele

- **Rennen:** volle Bildschirmbreite, Auto folgt dem Finger in **beide Richtungen** (überall auf der Fläche). 3 Treffer in Folge = **Schutzschild** (4 s, falsche Zeichen/Bomben zerbrechen wie Steine). Gegenstände: 🎁 +25, ⭐ Schild 5 s, ❤️ Herz (bis 9), 🛡️ Rüstung (bis 3 Schichten, jede fängt einen Treffer ab), 🍌 Rutsch (2 s schlingern, −10), 💣 Bombe (Explosion, −1 Herz, außer Schild/Rüstung). **Fahrzeugklassen** nach Punkten: Stadtauto → Taxi → Jeep → Bus → Truck → Traktor → Feuerwehr → Rennwagen → Rakete, mit Ansage und Feuerwerk beim Aufstieg. HUD zeigt Fahrzeug, Herzen, Rüstung, Schild.
- **🎣 Angeln:** Fische mit Zeichen schwimmen in beide Richtungen; Haken fällt beim Antippen, richtiger Fisch wird hochgezogen, falscher flieht.
- **💎 Schatzsuche:** 12 Steine, 3 verstecken das gesuchte Zeichen; 8 Schätze pro Runde, Zeitbonus.
- **🚀 Bild-Rakete:** Bilder fliegen vorbei, „Was fängt mit M an?“ – reines Hören (Anlaute), Wort wird beim Antippen gesagt.
- **🧩 Puzzle:** Buchstabe in seine Striche zerlegt (aus den Schreibbahnen), Teile in die graue Form schieben, rasten ein.
- **🐾 Zoo + Tages-Sticker:** 26 Anlaut-Tiere ziehen ein, wenn der Buchstabe dreimal sofort gewusst wurde; Tagesrunde (3 wackeligste) gibt täglich einen Sticker ins Album.
- Alle Spiele: Countdown, Ziel-Reveal, +/− Popups, Schaden-Blitz, Bestenliste, Pool A–Z + 0–9.

## Runde 11 – Schreiben frei, Rennen-Hitze, Fixes

- **Schreiben:** Tutorial (alle Striche nacheinander animiert) läuft nur beim ersten Mal pro Zeichen, verschwindet, sobald das Kind zu schreiben beginnt, und ist danach nur noch über 👀 HILFE erreichbar. Freies Schreiben: beliebig viele Striche, auch alles in einem Zug. Bewertung nach 1,3 s Pause oder ✓ FERTIG – jetzt mit **Reihenfolge** (Position entlang der Gesamtbahn muss vorwärts wandern), Startpunkt, Abdeckung, Genauigkeit; bei Fehlern konkreter Hinweis („Fang beim grünen Punkt 1 an“, „Achte auf die Reihenfolge“, „Bleib auf der Bahn“), nichts blockiert. Wörter mit Bild (🏠 HAUS …), Wort-**Replay** am Ende: alle Buchstaben nebeneinander, Strich für Strich nacheinander animiert, als Bild speicherbar/teilbar. Menü nutzt die ganze Breite ohne Überlauf.
- **Rennen:** volle Breite (alte `max-width`-Regel entfernt – das waren die Balken). **Hitze-Mechanik:** Motor wird heiß (Anzeige links, ~30 s bis 100 %), jedes gesammelte Zeichen = kaltes Wasser (Splash, −35 %); ohne Treffer alle 5 s die Ansage „Wir brauchen Wasser … Sammle das X!“; bei 100 % Explosion → Spiel vorbei. Boni allein retten nicht mehr.
- **Rakete / Angeln / Ballons:** Zielwechsel mit „Hey! Neuer Buchstabe!“, großem Reveal und 2,2 s Pause (Bildschirm geleert), damit kein Fehler passiert.
- **Puzzle:** Bewegung 1:1 unter dem Finger (Umrechnung war falsch), Magnet-Sog ab 30 Einheiten, Einrasten ab 18.
- **Schatzsuche** gelöscht.

## Runde 12 – Bewertungs-Engine, Puzzle groß, GIF

- **Schreib-Bewertung neu** (Prinzip Hanzi-Writer, pro Strich): Kinderspur wird den Soll-Strichen zugeordnet; jeder Strich muss ≥ 60 % abgedeckt sein (sonst „Strich 3 fehlt“), Genauigkeit ≥ 55 %, Start bei Punkt 1, Reihenfolge, Richtung (auch bei Kreisen). Getestet: A ohne Querstrich → fällt durch; Kritzeln → durch; falsche Reihenfolge/rückwärts → durch; alles in einem Zug richtig → besteht.
- **Puzzle:** Zeichen füllen den Bildschirm (dicke Striche), Modi Buchstaben / Zahlen / Wörter, 10 Runden. Gleich geformte Teile (Z-Balken, E-Striche …) passen in jeden freien passenden Platz, auch umgekehrt; Ziel leuchtet beim Annähern, Magnet-Sog, Einrasten.
- **Schreiben-Menü / Eltern:** Ursache der schmalen Spalte war `margin: auto` in einer Flex-Spalte (Kinder schrumpfen auf Inhaltsbreite) – jetzt volle Breite.
- **Wort-Animation als GIF:** Strich für Strich, teilbar/speicherbar (gifenc, rein im Browser).

## Runde 13 – Schreibbahnen geprüft

Alle 36 Bahnen als Bild gerendert und kontrolliert (`schreibbahnen.png`). Fehler behoben: **C** und **G** standen auf dem Kopf (Bogen lief unten herum), **U** lief über den Kopf, **6** war eine Schleife mit Strich, **S** hatte einen Knick. Zusätzlich auf Schul-Schreibrichtung umgestellt: **A** beginnt an der Spitze (zwei Striche nach unten), **M/N/V/W** alle senkrechten/schrägen Striche von oben nach unten. Bewertung mit verwackelten Test-Spuren für 12 Zeichen nachgeprüft (richtig = bestanden, fehlender Strich = durchgefallen, alles in einem Zug = bestanden).
Durchgangs-Modus: „ALLE A–Z ÜBEN“ / „ALLE 0–9 ÜBEN“ rotiert endlos; nach einem einzelnen Zeichen erscheint „NÄCHSTER: D ➡️“ (Nochmal / Menü).

## Runde 14 – Schreibtrainer: Bewertung neu gedacht (Maskenvergleich)

Vorher wurde pro Strich Reihenfolge, Richtung und Startpunkt erzwungen und nach 1,3 s Pause automatisch bewertet – das führte zu Fehlermeldungen bei korrekt gemalten Buchstaben und zu Frust. Jetzt (Prinzip wie bei Nachspur-Apps, z. B. LetterSchool):
- **Nur zwei Größen zählen:** Abdeckung (wie viel Prozent der Bahn getroffen) und Daneben (wie viel Prozent der Spur außerhalb). Dazu eine Überfüllungs-Bremse: Wer den ganzen Bildschirm vollmalt, hat den Buchstaben nicht geschafft (Spur darf höchstens ~3–4× so lang sein wie die Bahn).
- **Keine Reihenfolge, keine Richtung, keine Strichanzahl** – ein Zug oder zehn, vorwärts oder rückwärts, egal.
- **Kein Zeitlimit.** Bewertet wird nur über ✅ FERTIG – oder automatisch, wenn der Buchstabe sicher fertig ist (≥95 % getroffen, ≤10 % daneben).
- **Sterne:** ⭐⭐⭐ ≥90 % / ≤15 % daneben · ⭐⭐ ≥75 % / ≤28 % · ⭐ ≥55 % / ≤40 %. „Perfekt“ nur bei 3 Sternen, sonst „Super“ / „Gut“.
- **Sichtbares Ergebnis:** Nach FERTIG wird die Bahn grün (getroffen) und rot (Lücke) nachgezeichnet, Daneben-Punkte rot markiert, dazu „87 % getroffen · 5 % daneben“. Nach jedem Strich zeigt die Kopfzeile den aktuellen Prozentstand (🎯 72 %).
- **Nicht bestanden:** Spur bleibt stehen, das Kind malt die roten Stellen einfach nach und drückt erneut FERTIG. Nur bei „zu viel daneben“ wird gelöscht.
- Nummerierte Startpunkte gibt es nur noch in der Hilfe-Animation (Empfehlung), nicht mehr auf der Schreibfläche.
Getestet mit simulierten Spuren (gut/wackelig/ein Zug/rückwärts/doppelt/halb/Kritzel/Buchstabe+Kritzel) für 9 Zeichen.

## Runde 15 – Schreiben nachgebessert, Übungsblatt, eigene Wörter, Welt-Spiel, Scroll-Sperre

- **Bewertungs-Bug gefunden:** Die Überfüllungs-Bremse zählte Punkte statt Streckenlänge. Langsames, sorgfältiges Malen liefert vom Finger sehr viele Punkte → „100 % getroffen, 0 % daneben“ und trotzdem durchgefallen. Jetzt wird die Kinderspur ausgedünnt und die echte Streckenlänge mit der Bahnlänge verglichen (gilt zentral in `scoreGlyph`, also für alle Zeichen und beide Modi).
- Großer grüner **FERTIG-Knopf** direkt unter dem Papier. Wenn der Buchstabe zu ≥80 % gemalt ist und 2 s nichts passiert: Frage „Bist du fertig? Dann grüner Knopf!“ (Sprache + gelber Hinweis + pulsierender Knopf). Keine automatische Bewertung.
- **Fehlversuch:** rot zeigen, erklären, alles löschen, neu schreiben (kein Nachbessern mehr).
- **Übungsblatt 9×** (`components/WriteSheet.js`): 3 Reihen à 3 Kästchen, Schablone wird von Kästchen zu Kästchen blasser (wie ein Schreibheft), jedes Kästchen einzeln bewertet, Punkte = Sterne × 3 je Kästchen. Schalter **NUR STIFT** (Touch wird ignoriert, Hand darf aufliegen; wird gemerkt).
- **Eigene Wörter:** im Schreib-Menü „➕ EIGENES WORT HINZUFÜGEN“ (A–Z, 0–9, optional Bild-Emoji), gespeichert in localStorage, löschbar.
- **Kein Gummiband-Scrollen:** `PwaSetup` fängt touchmove ab, außer ein Element kann wirklich scrollen und ist nicht am Rand.
- **🌍 Welt** (`app/welt/page.js`): echte Karten aus world-atlas (`scripts/gen-geo.mjs` → `public/geo/europa.json`, `welt.json`, je ~200 KB, offline gecacht). Europa 28 Länder (Kegelprojektion, geprüft), Welt 29 Länder. Spielarten FINDEN (Land antippen), FLAGGE (Flagge → Land), PUZZLE (ausgeschnittenes Land als magnetisches Teil an seinen Platz ziehen). Nach 2 Fehlern blinkt das Ziel. Gefundene Länder werden grün und zeigen ihre Flagge; 10 Runden, Bestenliste.

## Runde 16 – Wort-Replay repariert, GIF schneller, Mal-App, Artikel

- **Replay-Bug:** In der Abspiel-Animation stand `pi += 2` – jedes zweite Teilstück wurde übersprungen (Lücken, einzelne Punkte, „falsche Zeichen“). Jetzt wird jedes Teilstück gezeichnet, 3 pro Frame; eigener Timer statt des geteilten `raf`. Dieselbe Lücke war auch im GIF (`i += 3` mit Sprung) – ebenfalls behoben; GIF: 6 Punkte je Frame, 30 ms, kürzere Pausen → schneller und kleiner.
- **🎨 Malen** (`app/malen/page.js`): freies Zeichnen, 60 s ab dem ersten Strich („Noch zehn Sekunden“), 10 Farben, 3 Dicken, Stift/Marker/Radierer, Zurück/Alles weg. Beim Fertigstellen wird auf die Bounding-Box aller Striche (+ halbe Strichdicke) plus 8 px Rand zugeschnitten, das Bild in 2× Auflösung gerendert; GIF max. 480 px, ~150 Frames, 25 ms je Frame. Ergebnis-Seite zeigt Vorschau und Pixelgröße.
- **Artikel:** zentral in `forSpeech` (speech.js): „das 2“, „das ZWEI“, „dem 1“ → „die Zwei“, „der Eins“; Buchstaben bleiben sächlich („das A“). Gilt für alle Spiele, Lektionen und Trainer.

## Runde 17 – Rennen entschärft, Welt-Entdecker neu gebaut

- **Rennen:** Rüstung sechsmal seltener (Gewicht 3 → 0,5) und höchstens 1 statt 3. Ein falsches Zeichen kostet jetzt IMMER Combo und 3 Punkte – auch mit Schild oder Rüstung. Schutz verhindert nur das verlorene Herz; „einfach alles einsammeln“ lohnt sich nicht mehr.
- **Welt** komplett neu (`app/welt/page.js`, Daten `lib/countries.js`):
  - Karte zoombar (Pinch mit zwei Fingern, +/−/⛶-Knöpfe) und verschiebbar; Tippen und Ziehen sauber getrennt (8 px Schwelle). Linienstärke skaliert mit dem Zoom, alle Länder mit sichtbaren Grenzen, Ziel-Länder in Pastellfarben.
  - Jede Aufgabe fährt die Karte automatisch an: Lernen/Flagge/Puzzle auf das Land; Finden auf eine Region, in der das Land irgendwo (nicht mittig) liegt, damit die Zoomfahrt nichts verrät.
  - Prominente Aufgabenkarte oben (FINDE **Italien**, WELCHE FLAGGE HAT **Spanien?**, Flagge + Name), Tippen wiederholt die Ansage.
  - **📖 LERNEN:** Land für Land mit Steckbrief: Flagge, Hauptstadt, Sprache, Einwohner, Größenbalken (Vergleich zum größten Land der Karte), Anteil an der Weltlandfläche, Vergleich zu Deutschland („3-mal so groß“), ein Fun-Fact – alles vorgelesen. Vor/Zurück.
  - **🏳️ FLAGGE:** Quiz nach Führerschein-App-Prinzip: drei große Flaggen, Land wird auf der Karte gezeigt, falsche Fragen werden 3 Aufgaben später erneut gestellt.
  - Gelernte Länder bekommen ab mittlerem Zoom ihren Namen auf der Karte.

## Runde 18 – Touch-Aussetzer über alle Spiele, Live-Genauigkeit beim Schreiben

**Ursachen der Touch-Hänger („hört mittendrin auf, 300 ms später eine zufällige Linie“):**
1. Ein zweiter Berührungspunkt (Handballen, zweiter Finger) löste ein neues `pointerdown` aus → der laufende Strich wurde verworfen und der erste Finger schrieb in den neuen Strich weiter (Sprung). Jetzt zeichnet/steuert nur EIN Pointer (ID-Guard) in Schreiben, Übungsblatt, Malen, Rennen, Puzzle, Welt.
2. Der globale Anti-Gummiband-Handler prüfte bei JEDEM touchmove per `getComputedStyle` die Elternkette – synchron auf dem Main-Thread, das bremst Touch-Events. Jetzt einmal bei touchstart bestimmen, bei touchmove nur Arithmetik; Spielflächen (`race-area`, Canvas, SVG) werden sofort blockiert.
3. iOS-Lupen-/Kontextmenü bei langem Drücken (`-webkit-touch-callout`) unterbrach Striche → global abgeschaltet, Tap-Highlight entfernt.
4. `onTouchMove={preventDefault}` in React ist passiv und wirkungslos → entfernt, `touch-action: none` auf allen Spielflächen erzwungen.
5. Zeichnen nutzt jetzt `getCoalescedEvents()` – alle Zwischenpunkte, keine Ecken bei schnellen Bewegungen.

**Schreiben, Genauigkeit live:** Die graue Schablone ist jetzt exakt die erlaubte Bahn (Breite = 2 × Toleranz). Beim Zeichnen färbt sich die getroffene Bahn sofort grün, jeder Punkt daneben bekommt sofort einen roten Punkt, die Kopfzeile zeigt fortlaufend „🎯 72 % · 🔴 daneben“. Toleranz für „daneben“ von 10,8 auf 9 Einheiten verschärft (identisch mit der sichtbaren Bahn). Nach FERTIG werden Lücken in der Bahn rot nachgezeichnet.
