# Handoff: Lebensplaner — Lebensplanung mit Habit-Tracking

## Überblick
Persönliche Single-User-App zur Lebensplanung nach dem "6-Säulen-System": Selbsteinschätzung in 6 Lebensbereichen, Jahresfokus + Jahresziele, Habit-Tracker (66-Tage-Methode mit Wenn-Dann-Plänen), und ein "Freiheit & Kontrolle"-Modul (Tagebuch, Urge-Tracker, Strategien). Läuft lokal auf einem Unraid-Server in **einem** Docker-Container, Daten verschlüsselt in SQLite, Bedienung primär am Handy (PWA).

## Über die Design-Dateien
Die Dateien in `design_reference/` sind **Design-Referenzen in HTML** — ein funktionierender Prototyp, der Aussehen und Verhalten zeigt, aber **kein Produktionscode**. Aufgabe: Diese Designs in der Zielarchitektur dieses Pakets nachbauen (siehe `ARCHITEKTUR.md`). Der Prototyp speichert in `localStorage`; die echte App spricht stattdessen die API des Servers an.

**Wichtig:** `Lebensplaner.dc.html` ist in einem proprietären Template-Format geschrieben (`<sc-if>`, `<sc-for>`, `{{ holes }}`, Logik-Klasse am Dateiende im `<script type="text/x-dc">`-Block). Es ist als **Lese-Referenz** gedacht: Markup + Inline-Styles zeigen das exakte Ziel-Design, die `Component`-Klasse enthält die komplette Geschäftslogik (Datenmodell, Berechnungen, Handler) in normalem JavaScript — diese Logik kann fast 1:1 übernommen werden.

## Fidelity
**High-fidelity.** Farben, Typografie, Abstände, Radien und Copy sind final und sollen pixelgenau übernommen werden.

## Design-Tokens
- Hintergrund: `#131314` (Seite), `#1E1F20` (Karten), `#28292C` (eingebettete Flächen/Inputs), `#37383B` (Hover)
- Linien/Borders: `#2D2E30`, `#3C4043`
- Text: `#FFFFFF` (Titel), `#E3E3E3` (Body), `#BDC1C6` (sekundär), `#9AA0A6` (gedämpft)
- Bereichsfarben: Körper & Geist `#8AB4F8` · Soziales `#81C995` · Liebe `#F28B82` · Finanzen `#FDD663` · Karriere `#C58AF9` · Sinn `#78D9EC`
- Akzent/Primary-Button: `#8AB4F8` (Hover `#AECBFA`), Text darauf `#131314`; Gefahr: `#F28B82` / Border `#5F2120`
- Schrift: 'Google Sans' (Titel/Buttons, 500–700), 'Google Sans Text'/'Roboto' (Body) — via Google Fonts
- Radien: Karten 24px, Inputs 12px, Buttons/Chips 100px (Pill), Bottom-Sheet 20px oben
- Karten-Padding 24–28px; Seitenraster `repeat(auto-fit, minmax(min(100%,320–340px),1fr))`, gap 16–20px; max-width 1180px (Dashboard) bzw. 820–900px (Text-Tabs)
- Mobile: Touch-Ziele min. 44px, sticky Header mit `backdrop-filter: blur(12px)`, Tab-Leiste horizontal scrollbar

## Screens (Tabs)
1. **Dashboard** — Radar-Chart (Ist-Zustand 1–10 über 6 Bereiche, SVG), Ø-Score, "Deine Baustelle"-Karte (schwächster Bereich), 6 Bereichskarten mit Score-Slider + "Meine 10 von 10"-Vision-Textarea.
2. **Fokus & Ziele** — Auswahl von max. `maxFokus` (Default 2) Fokus-Bereichen per Chips (Overload-Warnung bei mehr), pro Fokus-Bereich Jahresziele mit Status, Reflexionsfelder. Jahres-Umschalter im Header (‹ 2026 ›), Daten pro Jahr getrennt.
3. **Habit Tracker** — jahresübergreifend. Habits mit Name, Wenn-Dann-Plan, Motivation kurz/mittel/lang, Startdatum, 66-Tage-Raster (abhakbar). Zwei Ansichten: Streak-Ansicht + Kalender (Monatsnavigation). Neues-Habit-Formular, Overload-Warnung.
4. **Freiheit & Kontrolle** — jahresübergreifend, 3 Unter-Tabs: 📓 Tagebuch (Tages-Einträge, Kommentar-Bottom-Sheet), ⚡ Urge-Tracker (Einträge mit Datum/Uhrzeit, Outcome resisted/gave, Intensität, HALT-Faktoren, Situation/Gerät/Gefühl/Hilfe, Umgebungs-Flag), 🧭 Generell (Strategie-Textfelder: inner/middle/outer circle, bookend, beast, Kosten/Gewinn; Dankbarkeit + Umgebungs-Checks pro Tag). Quote zählt, nicht Streak — Rückfall = Datenpunkt.
5. **Änderungsverlauf** — Seiten-Drawer (rechts), Log der letzten 400 Änderungen mit Zeitstempel, "Verlauf löschen". Speicher-Indikator-Button im Header.

## Datenmodell (aus dem Prototyp)
- **Pro Jahr** (`lebensplaner-y<jahr>`): `{ year, tab, scores{6}, visions{}, focus[], goals{}, goalStatus{}, reflexions{} }`
- **Global** (`lebensplaner-global`): `{ habits[], frei{ log{}, urges[], diary{}, notes{}, inner, middle, outer, bookend, beast, kosten, gewinn, dank{}, umgebung{} }, habitViewMode, calYear, calMonth }`
- **Log** (`lebensplaner-log`): Array von Änderungs-Events (max. 400)
- Habit: `{ id, name, wenn, dann, kurz, mittel, lang, startDate, days: bool[66] }`
- Urge: `{ id, date, time, outcome: 'resisted'|'gave', intensity, halt{}, umgebung, situation, geraet, gefuehl, hilfe }`

In der echten App wird daraus das SQLite-Schema in `db/schema.sql` (Dokument-Store + Event-Log). Eine **Import-Funktion für den localStorage-Export des Prototyps** ist Pflicht (Migrationspfad für Bestandsdaten).

## Props (Konfiguration)
- `jahr` (int, Default 2026), `maxFokus` (1–3, Default 2) → als Server-Config/Env übernehmen.

## Dateien in diesem Paket
- `ARCHITEKTUR.md` — Zielarchitektur, API-Design, Verschlüsselung, PWA
- `ANLEITUNG.md` — Schritt-für-Schritt: GitHub, Unraid, Claude Code (für Einsteiger)
- `CLAUDE.md` — in die Repo-Wurzel legen; Regeln für die Weiterentwicklung mit Claude Code
- `scaffold/` — lauffähiges Grundgerüst: Dockerfile, docker-compose.yml, Server, DB-Schema, PWA-Stub
- `design_reference/Lebensplaner.dc.html` + `support.js` — der Design-Prototyp (im Browser öffnen zum Ansehen)
