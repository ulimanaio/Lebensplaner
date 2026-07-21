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
