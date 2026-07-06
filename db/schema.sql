-- Referenz-Schema (wird über db/migrations/ aufgebaut — diese Datei ist Doku)

-- Aktueller Zustand als JSON-Dokumente. Keys analog zum Prototyp:
--   'year-2026'  → { scores, visions, focus, goals, goalStatus, reflexions }
--   'global'     → { habits, frei, habitViewMode, ... }
CREATE TABLE documents (
  key        TEXT PRIMARY KEY,
  json       TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Append-only Event-Log: Basis für alle späteren Auswertungen.
CREATE TABLE events (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  ts      TEXT NOT NULL,          -- UTC, datetime('now')
  type    TEXT NOT NULL,          -- z. B. 'habit_checked', 'urge_logged'
  payload TEXT                    -- JSON
);
CREATE INDEX idx_events_type_ts ON events (type, ts);
