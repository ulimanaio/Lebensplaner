**Ziel-Modell & Konfiguration:**
- KI-Modell: Claude Sonnet
- Effort-Modus: High

**Rolle:** Du bist ein Senior Entwickler für Vanilla-JS/DOM. Antworte AUSSCHLIESSLICH mit Code-Blöcken (neue Funktionen komplett; Änderungen als Suchen/Ersetzen-Paare).

**Kontext & Inline-Dateien:**
Es existiert bereits ein Abstands-Rechner im Zweites-Kind-Guide, `guideTimingTool(book)` in `frontend/js/app.js` (ab ~Z. 2177) — dieselbe Rechenlogik wird übernommen. Vorhandene Helfer (wiederverwenden, nicht neu bauen): `ymIndex('YYYY-MM')` → Monatsindex (Jahr*12+Monat), `ymLabel(idx)` → „März 2027“, Konstante `KIND2_GEBURT_TOCHTER = '2024-09'`. UI-Helfer: `el()`, `setGlobal(patch, label)`, `sendEvent(type, payload)`. Statische Daten: `KIND_MILESTONES` aus `kinder-milestones-data.js` (Struktur: `{ fromM, toM, label, koennen: [], selbst: [], geschwister: '' }`). Datenmodell: `g.kinder.planYM ("YYYY-MM"|null)`, `g.kinder.children` (erstes Kind mit `relation:'eigen'` = Referenzkind; `birth` exakt oder `birthYM` geschätzt). Platzhalter `renderKinder()` aus Prompt 003 wird ersetzt.

**Präzise Aufgabe:**
Implementiere in `app.js` (Abschnitt-Kommentar `// ---------- Kinder-Rechner (Tab „Weiteres") ----------`):

```js
function kinderAgeMonths(child, atIdx)   // Alter in Monaten am Monatsindex atIdx; birth exakt → Geburtsmonat, birthYM → wie exakt; Rückgabe ≥ 0
function kinderMilestone(months)         // passende KIND_MILESTONES-Spanne; > letzte toM → letzte Spanne
function kinderTimingTool()              // Rechner-Karte, siehe unten
function renderKinder()                  // ganze Ansicht: Zurück-Button, h2 „Kinder-Rechner", kinderTimingTool(), Meilenstein-Karte, (Kinderliste folgt in Prompt 005)
```

`kinderTimingTool()` — Verhalten wie `guideTimingTool`, aber gespeichert unter `g.kinder.planYM`:
- Slider (`input type=range`), Bereich: aktueller Monat … +36 Monate; Startwert = gespeicherter `planYM`, sonst aktueller Monat.
- Live-Anzeige (Update im `oninput`, Speichern + `sendEvent('kinder_plan_changed', { planYM })` erst bei `onchange`):
  - „Angepeilte Zeugung: **{ymLabel}**“
  - „Errechnete Geburt Kind 2: **{ymLabel(zeugIdx + 9)}**“
  - „{Name Kind 1} wäre dann **X Jahre, Y Monate** alt“ (Referenzkind = erstes `relation:'eigen'`-Kind)
  - „Altersabstand: **N Monate** (≈ X,Y Jahre)“
  - WHO-Hinweiszeile wie im Bestand (Fenster ≥ 24 Monate Geburt→Empfängnis erfüllt ab …).
- Meilenstein-Karte darunter, gebunden an das errechnete Alter des Referenzkinds bei Geburt von Kind 2:
  - Titel: „So weit wäre {Name} dann ({Spannen-Label})“
  - Liste `koennen` (Label „Kann durchschnittlich schon“), Liste `selbst` (Label „Selbstständigkeit“), Satz `geschwister` hervorgehoben (Akzentfarbe).
  - Aktualisiert live mit dem Slider.

**Architektur-Vorgaben & Code-Skelett:** Funktionssignaturen exakt wie oben. Kein neuer State außer `kinder.planYM`. CSS-Klassen: `.kinder-timing`, `.kinder-ms-card`, `.kinder-ms-list`, `.kinder-ms-geschwister` in `app.css` ergänzen (Stil an `.gd-timing`-Block anlehnen).

**Robustheit & Corner-Cases:**
- Kein eigenes Kind vorhanden (`children` leer oder ohne `relation:'eigen'`): Rechner zeigt statt Alterszeilen den Hinweis „Lege zuerst ein eigenes Kind an“, crasht nicht.
- Referenzkind mit `birthYM` (geschätzt): Alterszeilen mit vorangestelltem „~“.
- Alter > 72 Monate → letzte Meilenstein-Spanne mit Zusatz „(älter als 6 Jahre)“.
- `KIND_MILESTONES` nicht geladen (`typeof KIND_MILESTONES === 'undefined'`): Meilenstein-Karte weglassen, kein Fehler.

**Abnahmekriterien (Definition of Done):**
- 1. Keine Konsolen-Fehler; Slider-Interaktion flüssig, Speichern debounced über `setGlobal`.
- 2. Handrechnung stimmt: Zeugung 2026-07 → Geburt 2027-04; Tochter (2024-09-03) wäre dann 2 J., 7 M.; Abstand 31 Monate.
- 3. Meilenstein-Inhalte wechseln beim Sliden über Spannengrenzen.
- 4. CHANGELOG-Eintrag unter `[Unreleased]/Added`.
