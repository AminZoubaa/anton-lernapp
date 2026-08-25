# 🌟 ABC & 123 – Lernspaß

Eine Lern-App für Vorschulkinder: Alphabet, Zahlen, Wörter und richtiges Sprechen –
spielerisch wie Duolingo, komplett auf Deutsch, mit Sprachausgabe.

## Features

- 14 Kapitel: A–Z, Ä/Ö/Ü, Zahlen 0–100, Vokabeln (Tiere, Essen, Farben & Natur), Sprach-Profi (Grammatik)
- Volle Audio-Führung (Web Speech API, de-DE) mit Anlautmethode
- 11 Minispiel-Typen, pro Lektion zufällig gemischt (Memory, Nachspuren, Wort bauen, Namen schreiben, Maulwurf, Lückenwort, Zähl-Spiel, Blitz-Blick u.a.)
- 🏎️ Buchstaben-Rennen: Endless-Runner mit Tank, Explosionen und Highscore
- Punkte, Combos, Sterne, 10 Abzeichen, Tages-Serie, Urkunden als PNG/PDF
- Adaptive Schwierigkeit + Wiederholung schwacher Buchstaben (Spaced Repetition)
- Kein Backend: alles läuft im Browser, Fortschritt im localStorage
- Tablet-first, GSAP-Animationen, generierte Hintergrundmusik

## Entwicklung

```bash
npm install
npm run dev
```

App läuft auf http://localhost:3000

## Deployment

Automatisch per GitHub Actions auf GitHub Pages bei jedem Push auf `main`
(statischer Export, siehe `.github/workflows/deploy.yml`).
