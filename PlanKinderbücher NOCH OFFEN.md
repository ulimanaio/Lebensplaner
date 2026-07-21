# PlanKinderbücher.md — Feature „Kleinkind-Kompass“ (Bücher-Tab)

Die 8 Elternbücher aus `Books/2026-07-18` (Lansbury, Faber/King, Siegel/Bryson, Davies, Schmidt, Juul, Napthali, Karp) werden als EIN kuratiertes „Buch“ im Regal des Bücher-Tabs verfügbar: **„🧸 Kleinkind-Kompass“** — paraphrasierte Kernaussagen und konkrete Werkzeuge, zugeschnitten auf die aktuelle Situation (Tochter ~23 Monate, Kratzen, Zähneputzen, müde Abende). Werkzeuge lassen sich als „Ausprobiert“ abhaken, je Sektion gibt es ein Markdown-Notizfeld.

## Verbindliche Architekturentscheidungen (Worker dürfen NICHT abweichen)

1. **Ein Regal-Eintrag, kein 8-Karten-Spam:** Neuer `BOOKS`-Eintrag `id: 'kleinkind'`, neuer Modus **`mode: 'library'`** mit eigenem Renderer `renderBookLibrary()`. Bestehende Modi (`challenges`/`tasks`/`notes`/`guide`) bleiben unangetastet.
2. **Statische Inhalte** in `frontend/js/kleinkind-data.js` (`const KLEINKIND_SECTIONS`, per `<script>` wie `challenges-data.js`). Inhalte sind in den Prompts 006/007 **wörtlich vorgegeben** (kuratiert aus den Büchern; nur Paraphrasen, keine langen Zitate — Copyright). Worker ändern daran nichts.
3. **Kein neuer Dokument-Key, keine Migration.** State im bestehenden `global`-Dokument:
   ```js
   kleinkind: {
     open: <sectionId>|null,               // aufgeklappte Sektion (Akkordeon)
     tried: { <toolId>: "YYYY-MM-DD" },    // „Ausprobiert“-Abhaken
     notes: { <sectionId>: "md-Text" },    // eigene Notizen je Sektion (mdField)
   },
   ```
   Lazy-Init für Alt-Dokumente; `GET /api/export` enthält alles automatisch — **Server bleibt unangetastet**.
4. **Neue Event-Typen** (snake_case): `kleinkind_tool_tried`, `kleinkind_note_edited`. Buch-Öffnen läuft über das bestehende `book_opened`.
5. **Sektions-/Tool-IDs sind Persistenz-Schlüssel** (`akut`, `lansbury`, …, `akut-stoppen`, …): nie umbenennen.
6. **Design:** bestehende Tokens (Karten `#1E1F20` r24, Akzent `#8AB4F8`, Pills r100, Touch ≥ 44px). Regal-Farbe des Buchs: `#81C995`.
7. **Verhältnis zu `Plan.md` (Prompts 001–005):** unabhängig lauffähig — funktioniert vor und nach dem Tab-Umbau „Weiteres“. Bei Ausführung beider Pläne: erst 003, dann 008 (beide berühren `renderBuecher`).

---

# 0. Projekt-Fortschritt

| ID | Modul/Aufgabe | Prompt-Datei | KI-Modell | Status |
|---|---|---|---|---|
| 6 | Daten Teil 1: Akut-Sektion + Lansbury/Faber/Siegel (Inhalt vorgegeben) | `prompts/006-kleinkind-daten-akut.md` | Haiku / Low | [ ] |
| 7 | Daten Teil 2: Montessori/Elternkompass/Juul/Napthali/Karp | `prompts/007-kleinkind-daten-buecher.md` | Haiku / Low | [ ] |
| 8 | UI: Registry-Eintrag, `renderBookLibrary`, Abhaken, Notizen, CSS, Doku | `prompts/008-kleinkind-ui.md` | Sonnet / High | [ ] |

---

# 1. Human Setup & Review Checkliste

**Manuelle Setups:**
- Keine. Kein npm-Install, keine Env-Änderung, keine Migration (reines Frontend-Feature; `prompts/`- und `CHANGELOG.md`-Grundgerüst sind bereits angelegt).

**Human Review Checklist (nach Prompt 008):**
- [ ] Regal zeigt „🧸 Kleinkind-Kompass“ mit Fortschrittsanzeige; alle bestehenden Bücher funktionieren unverändert.
- [ ] Sektion „Akut“ ist beim ersten Öffnen aufgeklappt; Akkordeon-Verhalten ok; Inhalte lesbar, keine kaputten Umlaute.
- [ ] „Ausprobiert“ an-/abwählen → überlebt Reload; Verlauf-Drawer zeigt `kleinkind_tool_tried`.
- [ ] Notizfeld je Sektion: Markdown speichern, Reload, Inhalt noch da.
- [ ] `:8484/api/export` enthält `kleinkind` mit `tried` und `notes`.
- [ ] Handy-Breite ≤ 400px: Touch-Ziele ≥ 44px, kein horizontales Scrollen.
- [ ] Abschluss: `docker compose up --build` läuft durch, App unter :8484 funktioniert.
- [ ] Inhaltlich (für dich als Papa): Akut-Sektion einmal komplett lesen und die 3 Abend-Werkzeuge (`akut-zaehne-spiel`, `akut-abendsetup`, `akut-papa-akku`) diese Woche real testen.

---

# 2. Übersicht der Worker-Prompts

- `prompts/006-kleinkind-daten-akut.md` — `kleinkind-data.js` anlegen: Akut-Sektion (Kratzen/Zähneputzen/Abende) + No Bad Kids, How to Talk, No-Drama Discipline. Kompletter Inhalt im Prompt.
- `prompts/007-kleinkind-daten-buecher.md` — 5 weitere Sektionen anhängen: Montessori Toddler, Elternkompass, Juul, Buddhism for Mothers, Karp. Kompletter Inhalt im Prompt.
- `prompts/008-kleinkind-ui.md` — `BOOKS`-Eintrag (mode `library`), `renderBookLibrary()` mit Akkordeon, „Ausprobiert“-Toggles, mdField-Notizen, CSS, `DATENMODELL.md`-Pflege.

---

## Hinweis: Stripe-Payment-Modul — bewusst NICHT geplant

Die Anfrage „Payment-Modul für Stripe, integriert in die bestehende User-Datenbank“ kollidiert frontal mit der Architektur laut `CLAUDE.md`: Single-User-App, läuft lokal auf Unraid, **kein Cloud-Zugriff, keine externen Dienste**, keine User-Datenbank (ein einziger Nutzer, keine Accounts). Ein Stripe-Modul hätte hier weder Zahler noch Zweck und würde die Kern-Zusage „lokal & offline“ brechen. Vermutlich ein Überbleibsel aus einer Prompt-Vorlage — falls doch ernst gemeint (z. B. für ein ANDERES Projekt), bitte explizit bestätigen, dann wird ein separater Plan erstellt.
