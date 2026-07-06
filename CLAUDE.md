# CLAUDE.md — Lebensplaner

Single-User-Lebensplanungs-App. Läuft lokal auf Unraid in EINEM Docker-Container. Kein Cloud-Zugriff, keine externen Dienste.

## Architektur (nicht ändern ohne guten Grund)
- `server/server.js` — Fastify: statisches Frontend + JSON-API. Ein Prozess.
- `frontend/` — Vanilla JS/DOM, **kein Bundler, kein Build-Schritt, kein npm im Frontend**. Dateien werden direkt ausgeliefert.
- SQLite (`better-sqlite3-multiple-ciphers`), verschlüsselt via `PRAGMA key` = Env `DB_PASSPHRASE`. Eine Datei: `/data/lebensplaner.db`.
- Datenhaltung: `documents` (aktueller Zustand als JSON pro Key) + `events` (append-only Log jeder Nutzeraktion). Jede Schreiboperation erzeugt ein Event.
- Schema-Änderungen NUR als neue Datei in `db/migrations/NNN_name.sql` — bestehende Migrationen nie editieren.

## Design
- Design-Referenz: `design_reference/Lebensplaner.dc.html` (hifi, pixelgenau übernehmen). Tokens in `README.md`.
- Dark-only: Seite `#131314`, Karten `#1E1F20` r24, Akzent `#8AB4F8`, Pill-Buttons r100.
- Mobile-first: Touch-Ziele ≥ 44px, Tabs horizontal scrollbar, Bottom-Sheets für Eingaben am Handy.
- Fonts: 'Google Sans' / 'Google Sans Text' / 'Roboto'.

## Konventionen
- Deutsch in UI-Copy und Commit-Messages; Code/Bezeichner Englisch oder wie im Bestand.
- Keine neuen npm-Dependencies ohne Notwendigkeit; Frontend bleibt dependency-frei.
- Jede neue Nutzeraktion bekommt einen Event-Typ (snake_case, z. B. `habit_checked`). Events nie löschen oder umdeuten.
- `GET /api/export` muss nach jedem Feature weiterhin ALLE Daten enthalten.
- Vor Abschluss: `docker compose up --build` muss durchlaufen und die App unter :8484 funktionieren.
