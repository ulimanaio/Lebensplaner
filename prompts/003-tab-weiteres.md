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
