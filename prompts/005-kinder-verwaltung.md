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
