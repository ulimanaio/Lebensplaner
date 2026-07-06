# Zielarchitektur

Ein Docker-Container, keine externe Datenbank, Single-User, nur lokal (LAN), Daten verschlüsselt, langfristig auswertbar, effizient mit Claude Code erweiterbar.

```
Browser/Handy (PWA)  ──HTTP──▶  Node.js (Fastify)  ──▶  SQLite (verschlüsselt, /data/lebensplaner.db)
        ▲ statisches Frontend + JSON-API in EINEM Prozess/Container
```

## Komponenten

### 1. Server (`server/`)
- **Node.js 22 + Fastify** (klein, schnell). Liefert `frontend/` als statische Dateien und die API unter `/api/*`.
- **Kein Auth-System nötig** (Single-User, LAN) — aber ein optionaler simpler PIN-Schutz via Env `APP_PIN` ist vorgesehen (Header `x-pin`).

### 2. Datenbank
- **SQLite via `better-sqlite3-multiple-ciphers`** — SQLCipher-kompatible Verschlüsselung der gesamten DB-Datei mit Passphrase aus Env `DB_PASSPHRASE` (`PRAGMA key`). Ohne Passphrase ist die Datei unlesbar.
- Eine Datei: `/data/lebensplaner.db`, per Docker-Volume auf dem Unraid-Array. Backup = Datei kopieren.
- **Hybrid-Schema** (siehe `scaffold/db/schema.sql`):
  - `documents(key, json, updated_at)` — aktueller Zustand als JSON-Dokumente, Keys wie im Prototyp (`year-2026`, `global`). Einfach für Claude zu erweitern, keine Migration bei jedem neuen Feld.
  - `events(id, ts, type, payload)` — **append-only Event-Log**: jede Nutzeraktion (habit_checked, score_changed, urge_logged, …) als Zeile. Das ist die Basis für spätere Auswertungen (SQL über Zeitreihen).
  - `db/migrations/NNN_*.sql` — nummerierte Migrationen, beim Start automatisch angewendet (`schema_version`-Tabelle). Neue Features = neue Migrationsdatei, nie alte ändern.

### 3. API (bewusst minimal)
- `GET /api/doc/:key` → JSON-Dokument
- `PUT /api/doc/:key` → Dokument speichern **und** automatisch Event loggen
- `POST /api/event` → explizites Event (Typ + Payload)
- `GET /api/events?type=&from=&to=` → Auswertungs-Rohdaten
- `GET /api/export` → kompletter Dump (JSON) für Backup; `POST /api/import` für den localStorage-Export des Prototyps
- Frontend hält den State im Speicher (wie der Prototyp), speichert debounced (~1 s) per PUT. Offline: Service Worker cached die App-Shell; Schreibzugriffe brauchen den Server (LAN reicht).

### 4. Frontend (`frontend/`)
- **Vanilla JS + ein kleines Rendering (Preact via ESM-CDN-Datei lokal eingecheckt, oder reines DOM)** — kein Bundler, kein npm-Build fürs Frontend. Dateien werden direkt ausgeliefert. Das hält den Container trivial und Claude-Code-Änderungen sind sofort sichtbar (Seite neu laden).
- **PWA**: `manifest.webmanifest` (Name, Icons, `display: standalone`, Theme `#131314`) + `sw.js` (Cache-First für App-Shell). Auf dem Handy: Browser → "Zum Startbildschirm hinzufügen".
- Design 1:1 aus `design_reference/Lebensplaner.dc.html` übernehmen (Tokens im README).

### 5. Docker
- Multi-Stage-Build (Alpine + Build-Tools nur für das native SQLite-Modul), Runtime-Image klein.
- `docker-compose.yml`: Port 8484, Volume `/mnt/user/appdata/lebensplaner:/data`, Env `DB_PASSPHRASE`.

## Warum so?
- **SQLite statt Postgres**: kein zweiter Container, kein DB-Admin, trotzdem volles SQL für Auswertungen.
- **Dokument-Store + Event-Log**: Dokumente machen Feature-Entwicklung schnell (Schema-frei), das Event-Log sichert die Auswertbarkeit über Jahre. Beides zusammen ist der Sweet Spot für eine Ein-Personen-App.
- **Kein Frontend-Build**: die häufigste Fehlerquelle bei Hobby-Projekten entfällt; jede Claude-Änderung ist ohne Toolchain testbar.

## Auswertungen (später)
Beispiele direkt auf `events`: Habit-Erfolgsquote pro Wochentag, Urge-Intensität über Zeit, Score-Verlauf pro Lebensbereich pro Jahr. Ein eigener "Auswertung"-Tab kann `GET /api/events` konsumieren.
