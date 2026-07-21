# Plan.md — Feature „Weiteres“-Tab + Kinder-Abstands-Rechner

Umbenennung des Tabs „Bücher“ → **„Weiteres“** (Bücher-Regal bleibt als Sektion erhalten) plus neues Werkzeug **„Kinder-Rechner“**: Was-wäre-wenn-Rechner (Alter des ersten Kindes bei Geburt des zweiten, Altersabstand), Entwicklungs-/Selbstständigkeits-Infos je Alter, und Verwaltung von Kindern (eigene + Kinder von Freunden, Geburtsdatum exakt oder geschätzt).

## Verbindliche Architekturentscheidungen (Worker dürfen NICHT abweichen)

1. **Tab-ID bleibt `buecher`** (Events, Prefs, Deep-Links unverändert). Nur UI-Labels ändern sich zu „Weiteres“.
2. **Keine neue Dokument-Key, keine Migration.** Alle Daten leben im bestehenden `global`-Dokument unter neuem Feld `kinder`:
   ```js
   kinder: {
     children: [{
       id: <Date.now()>,          // eindeutig
       name: "Emma",
       relation: "eigen" | "freunde",
       birth: "YYYY-MM-DD" | null, // exaktes Geburtsdatum ODER …
       birthYM: "YYYY-MM" | null,  // … geschätzt (genau EINES von beiden gesetzt)
       note: "",                   // optional (z. B. "Kind von Lisa & Tom")
     }],
     planYM: "YYYY-MM" | null,     // angepeilter Zeugungsmonat im Rechner
   },
   weiteresView: "shelf" | "kinder", // Unternavigation im Tab „Weiteres“
   ```
3. **Seed:** Beim Lazy-Init von `kinder` wird die eigene Tochter automatisch angelegt: `{ id: 1, name: "Tochter", relation: "eigen", birth: KIND2_GEBURT_TOCHTER + "-03" }` (Konstante existiert bereits als `"2024-09"`; exaktes Datum `2024-09-03`).
4. **Rechenlogik** (identisch zu `guideTimingTool`): Geburtstermin ≈ Zeugungsmonat + 9 Monate. Altersabstand = Monatsdifferenz Geburt Kind 1 → errechnete Geburt Kind 2. Geschätzte Geburtsdaten (`birthYM`) rechnen mit dem 15. des Monats.
5. **Meilenstein-Daten statisch** in neuer Datei `frontend/js/kinder-milestones-data.js` (`const KIND_MILESTONES`, per `<script>` eingebunden wie `challenges-data.js`). Kein Fetch, kein npm.
6. **Neue Event-Typen** (snake_case, via `sendEvent`): `kind_added`, `kind_edited`, `kind_removed`, `kinder_plan_changed`. Bestehende Events unangetastet.
7. **Export:** `GET /api/export` enthält `kinder` automatisch (Teil von `global`) — keine Server-Änderung. `server/server.js` wird in diesem Feature NICHT angefasst.
8. **Design:** bestehende Tokens (Karten `#1E1F20` r24, Akzent `#8AB4F8`, Pills r100, Touch ≥ 44px, Bottom-Sheet-Muster wie Habit-Formular). CSS ausschließlich in `frontend/css/app.css` ergänzen.

---

# 0. Projekt-Fortschritt & Changelog-Setup

| ID | Modul/Aufgabe | Prompt-Datei | KI-Modell | Status |
|---|---|---|---|---|
| 1 | Erstellung `docs/` (Feature-Spec, Datenmodell, UI) + DATENMODELL.md-Pflege | `prompts/001-docs-setup.md` | Haiku / Low | [ ] |
| 2 | Statische Meilenstein-Daten (0–6 Jahre) | `prompts/002-milestones-data.md` | Sonnet / Low | [ ] |
| 3 | Tab-Umbau „Bücher“ → „Weiteres“ (Sektionen + Unternavigation) | `prompts/003-tab-weiteres.md` | Sonnet / High | [ ] |
| 4 | Kinder-Rechner (Slider, Abstand, Meilenstein-Panel) | `prompts/004-kinder-rechner.md` | Sonnet / High | [ ] |
| 5 | Kinder-Verwaltung (CRUD, exakt/geschätzt, Altersliste) + CSS-Feinschliff | `prompts/005-kinder-verwaltung.md` | Sonnet / High | [ ] |

*(Fortsetzung der Nummerierung: Prompts 006–008 „Kleinkind-Kompass“ → siehe `PlanKinderbücher.md`. Alle Prompts liegen jetzt als Einzeldateien in `prompts/`.)*

**`CHANGELOG.md`-Format** (Keep a Changelog, vom Menschen einmalig anlegen):

```markdown
# Changelog
Alle nennenswerten Änderungen. Format: Keep a Changelog / SemVer-frei (Datums-Releases).

## [Unreleased]
### Added
### Changed
### Fixed
```

Jeder Worker-Prompt endet damit, seinen Eintrag unter `[Unreleased]` zu ergänzen.

---

# 1. Human Setup & Review Checkliste

**Manuelle Setups (einmalig, vor Prompt 001):**
- Ordner anlegen: `docs/` und `prompts/` im Repo-Root.
- `CHANGELOG.md` mit obigem Skelett anlegen.
- Die 5 Prompt-Dateien aus Abschnitt 2 in `prompts/` speichern.
- Kein npm-Install, keine Env-Änderung nötig (reines Frontend-Feature).

**Human Review Checklist (nach jedem Prompt bzw. am Ende):**
- [ ] Nach 003: Tab heißt in Bottom-Nav und Verlauf „Weiteres“; alle Bücher inkl. Wehrle-Challenges, Stahl-Aufgaben, Hörbuch-Notizen und Zweites-Kind-Guide funktionieren unverändert (öffnen, Eintrag anlegen, abhaken).
- [ ] Nach 003: Alter gespeicherter Tab-Zustand (`bookOpen` gesetzt) crasht nicht beim Laden.
- [ ] Nach 004: Slider bewegen → Zeugungsmonat, Geburtstermin, Alter Kind 1 bei Geburt, Abstand in Monaten plausibel (Stichprobe von Hand nachrechnen). Meilenstein-Text wechselt mit dem errechneten Alter.
- [ ] Nach 005: Kind von Freunden mit exaktem UND (separat) mit geschätztem Datum anlegen, bearbeiten, löschen; Alter wird korrekt angezeigt („~“ bei Schätzung).
- [ ] Nach 005: `GET /api/export` (Browser: `:8484/api/export`) enthält `kinder` mit allen Einträgen.
- [ ] Nach 005: Verlauf-Drawer zeigt die neuen Aktionen; SQLite `events` enthält `kind_added` etc.
- [ ] Am Handy (schmales Fenster ≤ 400px): Touch-Ziele ≥ 44px, kein horizontales Scrollen, Formular als Karte/Sheet bedienbar.
- [ ] Abschluss: `docker compose up --build` läuft durch, App unter `:8484` funktioniert.

---

# 2. Sequenzielle Worker-Prompts

--- DATEI: prompts/001-docs-setup.md ---
**Ziel-Modell & Konfiguration:**
- KI-Modell: Claude 3.5 Haiku
- Effort-Modus: Low

**Rolle:** Du bist ein Senior Entwickler für Vanilla-JS/Fastify-Apps. Antworte AUSSCHLIESSLICH mit Code-Blöcken (je Datei ein Block mit Dateipfad als Überschrift).

**Kontext & Inline-Dateien:**
Projekt „Lebensplaner“: Fastify-Server liefert dependency-freies Vanilla-JS-Frontend; Daten in SQLite als `documents` (JSON pro Key) + `events` (append-only). Der Tab „Bücher“ (interne ID `buecher`) wird zu „Weiteres“ und erhält zusätzlich einen „Kinder-Rechner“. Verbindliches Datenmodell (Feld im bestehenden `global`-Dokument):

```js
kinder: {
  children: [{ id, name, relation: "eigen"|"freunde", birth: "YYYY-MM-DD"|null, birthYM: "YYYY-MM"|null, note: "" }],
  planYM: "YYYY-MM"|null,
},
weiteresView: "shelf" | "kinder",
```
Regeln: genau eines von `birth`/`birthYM` gesetzt; Seed-Kind „Tochter“ (`relation:"eigen"`, `birth:"2024-09-03"`); Geburtstermin = Zeugungsmonat + 9 Monate; Events `kind_added, kind_edited, kind_removed, kinder_plan_changed`; Meilensteine statisch in `frontend/js/kinder-milestones-data.js`; Server unangetastet.

**Präzise Aufgabe:**
Erstelle drei Doku-Dateien:
1. `docs/WEITERES-FEATURE.md` — Feature-Spec: Ziel, Nutzerfluss (Tab „Weiteres“ → Sektion „Bücher“ | Sektion „Kinder-Rechner“), UI-Skizze in Textform (Regal-Karten wie bisher; darunter Werkzeug-Karte „👶 Kinder-Rechner“; Kinder-Ansicht mit Rechner-Karte, Meilenstein-Karte, Kinderliste, Formular).
2. `docs/DATENMODELL-KINDER.md` — obiges Datenmodell wörtlich, plus Rechenregeln (geschätztes Datum = 15. des Monats; Abstand in Monaten via Jahr*12+Monat-Differenz) und die 4 Event-Typen mit Auslöser.
3. Ergänzung für `DATENMODELL.md` (als Diff-Anweisung in einem Code-Block): `kinder`- und `weiteresView`-Zeilen im `global`-Block, die 4 Event-Typen in der Event-Liste, Wegweiser-Zeile „Weiteres/Kinder-Rechner | `renderWeiteres`, `renderKinder`, `kinderTimingTool`; Daten `kinder-milestones-data.js`“.

**Architektur-Vorgaben & Code-Skelett:** Nur Markdown, kein Code außer den zitierten Strukturen. Deutsch.

**Robustheit & Corner-Cases:** Dokumentiere explizit: Lazy-Init (alte `global`-Dokumente haben kein `kinder`-Feld), Verhalten bei fehlendem `planYM` (Default = aktueller Monat), Schätz-Kennzeichnung „~“ in der UI.

**Abnahmekriterien (Definition of Done):**
- 1. Alle drei Ausgaben vollständig, in sich schlüssig, ohne offene Platzhalter.
- 2. Datenmodell wörtlich identisch mit dem oben vorgegebenen (keine eigenmächtigen Felder).
- 3. CHANGELOG-Eintrag unter `[Unreleased]/Added` als vierter Code-Block.
-----------------------------------

--- DATEI: prompts/002-milestones-data.md ---
**Ziel-Modell & Konfiguration:**
- KI-Modell: Claude Sonnet
- Effort-Modus: Low

**Rolle:** Du bist ein Senior Entwickler für Vanilla-JS. Antworte AUSSCHLIESSLICH mit Code-Blöcken.

**Kontext & Inline-Dateien:**
Vorbild ist `frontend/js/challenges-data.js`: eine Datei, eine `const`, per `<script>` eingebunden (kein Modul, kein Export). Die Daten beschreiben, was ein Kind je Altersspanne durchschnittlich kann und wie selbstständig es ist — Anzeige im „Kinder-Rechner“ („So alt wäre Kind 1 bei Geburt von Kind 2“).

**Präzise Aufgabe:**
Erstelle `frontend/js/kinder-milestones-data.js` mit exakt dieser Struktur:

```js
// Entwicklungs-Meilensteine (Durchschnittswerte, Quellen: WHO-Motorik-Meilensteine,
// deutsche U-Untersuchungs-Richtwerte). Angezeigt im Kinder-Rechner (Tab „Weiteres“).
const KIND_MILESTONES = [
  { fromM: 0, toM: 3, label: '0–3 Monate',
    koennen: ['…', '…', '…'],          // 3–5 Einträge: Motorik, Sprache, Sozial
    selbst:  ['…', '…'],               // 2–4 Einträge: Selbstständigkeit/Betreuungsaufwand
    geschwister: '…' },                // 1 Satz: was das für ein Geschwisterkind in dem Alter bedeutet
  // … weitere Spannen
];
```

Spannen (lückenlos, verbindlich): 0–3, 4–6, 7–9, 10–12, 13–18, 19–24, 25–30, 31–36, 37–48, 49–60, 61–72 Monate. Inhalte fachlich seriös (U-Untersuchungs-Niveau), Deutsch, nüchtern, keine Angstmache; `geschwister` konkret (z. B. Eifersucht/Trotzphase bei ~24 M., Kita-Entlastung ab ~36 M.).

**Architektur-Vorgaben & Code-Skelett:** Kein `export`, kein `let`, keine Funktionen. Nur `const KIND_MILESTONES`.

**Robustheit & Corner-Cases:** Letzte Spanne deckt bis 72 ab; UI nutzt für Alter > 72 die letzte Spanne (nichts weiter zu tun, nur Kommentarzeile am Array-Ende).

**Abnahmekriterien (Definition of Done):**
- 1. Datei ist valides ES5+-JS ohne Syntaxfehler, alle 11 Spannen vorhanden, lückenlos.
- 2. Jede Spanne hat `koennen` (≥3), `selbst` (≥2), `geschwister` (1 Satz).
- 3. CHANGELOG-Eintrag unter `[Unreleased]/Added` als zweiter Code-Block.
-----------------------------------

--- DATEI: prompts/003-tab-weiteres.md ---
**Ziel-Modell & Konfiguration:**
- KI-Modell: Claude Sonnet
- Effort-Modus: High

**Rolle:** Du bist ein Senior Entwickler für Vanilla-JS/DOM (kein Framework, kein Build). Antworte AUSSCHLIESSLICH mit Code-Blöcken; für Änderungen an Bestandsdateien liefere exakte Suchen/Ersetzen-Paare (Original-Snippet → neues Snippet).

**Kontext & Inline-Dateien:**
`frontend/js/app.js` (~2900 Zeilen). Relevante Bestandsstellen:
- Tab-Registry: `{ id: 'buecher', label: 'Bücher' }` (Zeile ~25) und `buecher: { icon: NAV_ICONS.buecher, label: 'Bücher' }` (Zeile ~130).
- `freshGlobalDoc()` (ab ~Z. 269) enthält u. a. `bookOpen: null`, `bookGuide: {}`.
- `renderBuecher()` (ab ~Z. 1714): wenn `g.bookOpen` gesetzt → Buch-Detail (`renderChallenges`/`renderBookTasks`/`renderBookNotes`/`renderBookGuide`), sonst `renderBookShelf()`. `renderBookShelf()` (ab ~Z. 1772) rendert `el('div', { class: 'screen', 'data-screen-label': 'Bücher' }, el('h2', …, 'Bücher'), …)`.
- Helfer: `el(tag, attrs, ...children)`, `setGlobal(patch, logLabel)` (merged Patch in `global`-Dok, speichert debounced, schreibt Verlauf), `sendEvent(type, payload)`.
- `index.html` bindet Skripte klassisch ein: `<script src="js/challenges-data.js"></script>` usw.

**Präzise Aufgabe:**
1. Beide Labels `'Bücher'` → `'Weiteres'` (Tab-Registry + NAV; IDs bleiben `buecher`!).
2. `freshGlobalDoc()`: Felder `weiteresView: 'shelf'` und `kinder: { children: [{ id: 1, name: 'Tochter', relation: 'eigen', birth: '2024-09-03', birthYM: null, note: '' }], planYM: null }` ergänzen.
3. Lazy-Init in `renderBuecher` (alte Dokumente): `const g = state.global; if (!g.kinder) { … Seed wie oben, direkt auf g setzen ohne Save … }`.
4. `renderBuecher()` umbauen: wenn `g.bookOpen` → wie bisher Buch-Detail; sonst wenn `g.weiteresView === 'kinder'` → `renderKinder()` (Platzhalter: `el('div', { class: 'screen' }, 'Kinder-Rechner folgt')` — wird in Prompt 004 ersetzt); sonst `renderBookShelf()`.
5. `renderBookShelf()`: Überschrift/`data-screen-label` → „Weiteres“, Intro-Text anpassen („Dein Regal & Werkzeuge …“), Zwischenüberschrift `el('div', { class: 'bt-label' }, 'BÜCHER')` über den Buch-Karten, und darunter eine Werkzeug-Karte:
   ```js
   el('div', { class: 'card book-card kinder-entry-card', onclick: () => {
     setGlobal({ weiteresView: 'kinder' }, 'Kinder-Rechner geöffnet');
   } },
     el('div', { class: 'book-emoji' }, '👶'),
     el('div', {},
       el('div', { class: 'book-title' }, 'Kinder-Rechner'),
       el('div', { class: 'book-sub' }, 'Altersabstand planen · Kinder von Freunden im Blick')),
   )
   ```
6. Zurück-Navigation in `renderKinder`-Platzhalter: Button `‹ Weiteres` → `setGlobal({ weiteresView: 'shelf' }, …)` (Muster wie der bestehende `‹ Alle Bücher`-Button, Z. ~1730).
7. `index.html`: `<script src="js/kinder-milestones-data.js"></script>` VOR `js/app.js` einbinden.
8. `frontend/css/app.css`: Klasse `.kinder-entry-card` (Karten-Layout wie `.book-card`, Akzent-Rand oder dezente Hervorhebung; Touch-Ziel ≥ 44px).

**Architektur-Vorgaben & Code-Skelett:** Keine neuen Dokument-Keys, keine Server-Änderung, keine Umbenennung interner IDs/Eventtypen. Bestehende Buch-Funktionalität byte-identisch lassen, wo nicht explizit genannt.

**Robustheit & Corner-Cases:**
- Altes `global` ohne `weiteresView`/`kinder` darf nicht crashen (Lazy-Init, Fallback `'shelf'`).
- `bookOpen` gesetzt UND `weiteresView === 'kinder'`: `bookOpen` gewinnt (bestehender Code-Pfad zuerst).

**Abnahmekriterien (Definition of Done):**
- 1. Code lauffähig ohne Konsolen-Fehler; alle 4 Buch-Modi (challenges/tasks/notes/guide) unverändert bedienbar.
- 2. Tab zeigt überall „Weiteres“; Werkzeug-Karte öffnet Platzhalter, Zurück-Button führt zum Regal.
- 3. CHANGELOG-Eintrag unter `[Unreleased]/Changed` + `Added`.
-----------------------------------

--- DATEI: prompts/004-kinder-rechner.md ---
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
-----------------------------------

--- DATEI: prompts/005-kinder-verwaltung.md ---
**Ziel-Modell & Konfiguration:**
- KI-Modell: Claude Sonnet
- Effort-Modus: High

**Rolle:** Du bist ein Senior Entwickler für Vanilla-JS/DOM. Antworte AUSSCHLIESSLICH mit Code-Blöcken (neue Funktionen komplett; Änderungen als Suchen/Ersetzen-Paare).

**Kontext & Inline-Dateien:**
Baut auf Prompt 004 auf. `renderKinder()` existiert; darunter wird jetzt die Kinderliste + Formular ergänzt. Datenmodell-Kind: `{ id, name, relation: 'eigen'|'freunde', birth: 'YYYY-MM-DD'|null, birthYM: 'YYYY-MM'|null, note: '' }` — genau eines von `birth`/`birthYM` gesetzt. Helfer: `el()`, `setGlobal()`, `sendEvent()`, `ymIndex()`, `ymLabel()`, `kinderAgeMonths()` (aus 004). Formular-Muster im Bestand: Habit-Formular (`.habit-add-title`, Eingaben als Karten, Pill-Button zum Speichern). Events: `kind_added`, `kind_edited`, `kind_removed`.

**Präzise Aufgabe:**
1. `function setKind(patchFn, eventType, payload, label)` — zentrale Schreibfunktion: liest `state.global.kinder`, wendet `patchFn(children)` an, `setGlobal({ kinder: { …, children } }, label)`, danach `sendEvent(eventType, payload)`.
2. Kinderliste in `renderKinder()` (Abschnitt „KINDER“):
   - Je Kind eine Zeile/Karte: Name, Badge „eigen“ (Akzent) oder „Freunde“ (neutral), Alter heute als „X J., Y M.“ — bei `birthYM` mit „~“ davor; `note` klein darunter.
   - Tippen öffnet Bearbeiten (Inline-Formular wie Anlegen, vorbefüllt); Löschen-Button mit `confirm()`-Abfrage, nur für `relation:'freunde'` (eigene Kinder ohne Lösch-Button).
3. Anlege-Formular (aufklappbar über Button „+ Kind hinzufügen“, Pill r100):
   - Felder: Name (Text, Pflicht), Zugehörigkeit (2 Chips: „Eigenes Kind“/„Kind von Freunden“, Default Freunde), Datums-Modus (2 Chips: „Genaues Datum“ → `input type=date` | „Geschätzt“ → Monat `input type=month`), Notiz (Text, optional).
   - Speichern validiert: Name nicht leer, Datum bzw. Monat gesetzt, nicht in der Zukunft; setzt exklusiv `birth` ODER `birthYM`; `sendEvent('kind_added', { id, relation, estimated: !!birthYM })`.
4. Sortierung der Liste: eigene Kinder zuerst, dann Freunde nach Alter absteigend.
5. CSS in `app.css`: `.kind-row`, `.kind-badge`, `.kind-badge--eigen`, `.kind-form`, Chips wiederverwenden (bestehende Chip-Klassen des Guides nutzen, falls vorhanden — sonst `.kind-chip` mit r100, ≥ 44px Höhe).

**Architektur-Vorgaben & Code-Skelett:** Nur `app.js` + `app.css`. Kein Server-Code. IDs via `Date.now()`. Keine neuen Dokumentfelder außer den definierten.

**Robustheit & Corner-Cases:**
- `input type=month` ohne Browser-Support (Fallback Text): Eingabe gegen `/^\d{4}-\d{2}$/` validieren, sonst Hinweistext.
- Wechsel des Datums-Modus beim Bearbeiten setzt das jeweils andere Feld auf `null`.
- Leerer Name / Zukunftsdatum: Speichern verweigern, Feld optisch markieren (Rahmen `#F28B82`), kein `alert`.
- Löschen des Referenzkinds ist ausgeschlossen (kein Löschen bei `relation:'eigen'`).

**Abnahmekriterien (Definition of Done):**
- 1. Anlegen/Bearbeiten/Löschen funktionieren ohne Konsolen-Fehler; Events erscheinen im Verlauf-Drawer.
- 2. Alter korrekt für exakt UND geschätzt (Stichprobe: geb. 2023-05 geschätzt → heute „~3 J., 2 M.“ bei Stand Juli 2026).
- 3. `GET /api/export` enthält alle angelegten Kinder.
- 4. Mobile-Check: Formular ≤ 400px Breite bedienbar, Touch-Ziele ≥ 44px.
- 5. CHANGELOG-Eintrag unter `[Unreleased]/Added`.
-----------------------------------
