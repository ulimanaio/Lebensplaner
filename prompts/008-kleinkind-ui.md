**Ziel-Modell & Konfiguration:**
- KI-Modell: Claude Sonnet
- Effort-Modus: High

**Rolle:** Du bist ein Senior Entwickler für Vanilla-JS/DOM (kein Framework, kein Build). Antworte AUSSCHLIESSLICH mit Code-Blöcken; Änderungen an Bestandsdateien als exakte Suchen/Ersetzen-Paare (Original-Snippet → neues Snippet).

**Kontext & Inline-Dateien:**
Lies zuerst `DATENMODELL.md` (Wegweiser) und in `frontend/js/app.js` gezielt: die `BOOKS`-Registry (ab ~Z. 31, Einträge mit `mode: 'challenges'|'tasks'|'notes'|'guide'`), `renderBuecher()` (Dispatch nach `book.mode`), `renderBookShelf()` (mappt `BOOKS`, nutzt `bookProgress(book, g)`), `openBook(id)` sowie einen bestehenden Detail-Renderer als Muster (`renderBookGuide` für auf-/zuklappbare Sektionen). Helfer: `el()`, `setGlobal(patch, label)`, `sendEvent(type, payload)`, `mdField` aus `frontend/js/markdown.js` (Drop-in-Markdown-Textfeld). Statische Daten: `KLEINKIND_SECTIONS` aus `frontend/js/kleinkind-data.js` (Prompts 006/007) — Struktur: `{ id, emoji, title, src, kern: [], tools: [{ id, name, wie: [], warum }] }`.

**Präzise Aufgabe:**
1. `index.html`: `<script src="js/kleinkind-data.js"></script>` VOR `js/app.js` einbinden.
2. `BOOKS`-Registry: neuen Eintrag ans Array-Ende:
   ```js
   {
     id: 'kleinkind',
     title: 'Kleinkind-Kompass',
     author: 'Destillat aus 8 Elternbüchern',
     emoji: '🧸',
     color: '#81C995',
     mode: 'library',
     intro: 'Kuratierte Kernideen & Werkzeuge aus deinem Kleinkind-Regal (≈ 2 Jahre): Kratzen, Zähneputzen, müde Abende — plus die wichtigsten Ideen jedes Buchs. Hake an, was du ausprobiert hast, und notiere, was bei eurer Tochter wirkt.',
   },
   ```
3. `freshGlobalDoc()`: Feld `kleinkind: { open: 'akut', tried: {}, notes: {} }` ergänzen. Lazy-Init für Altbestand am Anfang von `renderBookLibrary`: `if (!g.kleinkind) g.kleinkind = { open: 'akut', tried: {}, notes: {} };` (direkt setzen, kein Save).
4. Dispatch in `renderBuecher()`: `mode === 'library'` → `renderBookLibrary(book)`.
5. `bookProgress()` erweitern: für `mode 'library'` → gesamt = Anzahl aller Tools über alle Sektionen, erledigt = Anzahl Keys in `g.kleinkind.tried` mit truthy Wert.
6. Neue Funktion `renderBookLibrary(book)` (Abschnitt-Kommentar `// ---------- Kleinkind-Kompass (mode 'library') ----------`):
   - Kopf wie andere Buch-Detailseiten: Zurück-Button `‹ Alle Bücher`, Emoji, Titel, `intro`.
   - Je Sektion aus `KLEINKIND_SECTIONS` eine Karte (`.kk-section`): Kopfzeile (Emoji, `title`, klein `src`, Zähler „x/y ausprobiert“ falls Tools vorhanden) — Tippen klappt auf/zu via `setGlobal({ kleinkind: { …, open: id|null } }, 'Kompass-Sektion geöffnet')`; nur eine Sektion offen (Akkordeon, Muster `renderBookGuide`).
   - Offene Sektion zeigt: Liste `kern` (Bullet-Liste `.kk-kern`), danach je Tool eine Unterkarte `.kk-tool`: `name` fett, `wie`-Schritte als Liste, `warum` kursiv/gedimmt, rechts ein Pill-Toggle „Ausprobiert“ (`.kk-tried`, aktiv = Akzentfarbe):
     ```js
     onClick: () => {
       const tried = { ...g.kleinkind.tried };
       const now = !tried[tool.id];
       if (now) tried[tool.id] = todayISO(); else delete tried[tool.id];
       setGlobal({ kleinkind: { ...g.kleinkind, tried } }, now ? 'Werkzeug ausprobiert' : 'Werkzeug zurückgesetzt');
       sendEvent('kleinkind_tool_tried', { toolId: tool.id, tried: now });
     }
     ```
     (Vorhandenen Heute-Datum-Helfer wiederverwenden, falls es einen gibt — sonst inline `new Date().toISOString().slice(0,10)`.)
   - Unten in jeder offenen Sektion: „Meine Notizen“ als `mdField`, gespeichert unter `g.kleinkind.notes[section.id]`; beim Speichern `setGlobal(…, 'Kompass-Notiz')` + `sendEvent('kleinkind_note_edited', { sectionId: section.id })`.
7. CSS in `frontend/css/app.css`: `.kk-section` (Karte `#1E1F20`, r24), `.kk-section-head` (Touch ≥ 44px), `.kk-kern`, `.kk-tool` (dezent abgesetzte Unterkarte), `.kk-tool-warum` (gedimmt, kursiv), `.kk-tried` (Pill r100, ≥ 44px, aktiv `#8AB4F8` auf dunklem Grund). Mobile-first, kein horizontales Scrollen.
8. `DATENMODELL.md` pflegen: im `global`-Block die Zeile `kleinkind: { open: <sectionId>|null, tried: { <toolId>: "YYYY-MM-DD" }, notes: { <sectionId>: "md" } }, // Kleinkind-Kompass (Bücher-Tab)`; Event-Liste um `kleinkind_tool_tried, kleinkind_note_edited` ergänzen; Wegweiser-Zeile „Kleinkind-Kompass (Buch im mode `library`) | `renderBookLibrary`; Daten `kleinkind-data.js`“.

**Architektur-Vorgaben & Code-Skelett:** Keine neuen Dokument-Keys, keine Server-Änderung (`GET /api/export` enthält `kleinkind` automatisch als Teil von `global`). Keine neuen npm-Dependencies. Bestehende Buch-Modi byte-identisch lassen. Verträgt sich mit Plan.md-Prompts 003–005 (Tab-Umbau „Weiteres“): beide ändern nur getrennte Stellen von `renderBuecher`/`renderBookShelf` — bei gleichzeitiger Ausführung zuerst 003, dann 008.

**Robustheit & Corner-Cases:**
- `typeof KLEINKIND_SECTIONS === 'undefined'` (Skript nicht geladen): Detailseite zeigt Hinweis „Daten nicht geladen“ statt zu crashen; Regal-Karte zeigt Fortschritt 0.
- Altes `global` ohne `kleinkind`-Feld darf nicht crashen (Lazy-Init).
- `open` zeigt auf nicht (mehr) existierende Sektions-ID → alle zu, kein Fehler.
- Tool-IDs sind der Persistenz-Schlüssel: niemals umbenennen (Prompts 006/007 sind die Quelle).

**Abnahmekriterien (Definition of Done):**
- 1. Regal zeigt die neue Karte „🧸 Kleinkind-Kompass“ mit Fortschritt; Öffnen, Auf-/Zuklappen, „Ausprobiert“-Toggle und Notizen funktionieren ohne Konsolen-Fehler.
- 2. Verlauf-Drawer zeigt `kleinkind_tool_tried`; `GET /api/export` enthält `kleinkind` mit `tried`/`notes`.
- 3. Mobile-Check ≤ 400px: Touch-Ziele ≥ 44px, kein horizontales Scrollen.
- 4. `docker compose up --build` läuft durch, App unter :8484 funktioniert.
- 5. `DATENMODELL.md` aktualisiert; CHANGELOG-Eintrag unter `[Unreleased]/Added`.
