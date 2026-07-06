# Datenmodell — Referenz (zuerst lesen, statt app.js zu durchsuchen)

Alle Daten liegen in SQLite-Tabelle `documents` (JSON pro Key) + `events` (append-only Log).

## Dokument-Keys und ihre Struktur

### `year-<jahr>` (z. B. `year-2026`) — pro Jahr, siehe `freshYearDoc()` in app.js
```js
{
  year: 2026,
  scores:     { koerper: 5, soziales: 5, liebe: 5, finanzen: 5, karriere: 5, sinn: 5 }, // 1–10
  visions:    { <areaId>: "Text" },        // „10 von 10“-Vision je Bereich
  focus:      ["koerper", "finanzen"],     // max. 2 Bereich-IDs (MAX_FOKUS)
  goals:      { <areaId>: "Text" },        // Jahresziele nur für Fokus-Bereiche
  goalStatus: {},                           // reserviert
  reflexions: { <areaId>: "Text" },        // Jahresend-Reflexion
  endScores:  { <areaId>: 1–10 },          // Reflexions-Score
}
```
Bereich-IDs (`AREAS` in app.js): `koerper, soziales, liebe, finanzen, karriere, sinn`.

### `global` — jahresübergreifend, siehe `freshGlobalDoc()`
```js
{
  habits: [{
    id: <Date.now()>, startDate: "YYYY-MM-DD", name, wenn, dann,
    kurz, mittel, lang,                 // das „Warum“ (3 Zeithorizonte)
    days: [false × 66],                 // Tag erledigt ja/nein
    comments: { <dayIdx>: "Notiz" },    // Long-Press-Kommentare
  }],
  habitViewMode: "streak" | "month",
  calYear, calMonth,                    // Monatsansicht-Navigation
  newHabit*: "",                        // Formular-Zwischenstände
  overloadWarn: false,
  freiTab: "tagebuch" | "urge" | "generell",
  freiSelDate, freiCalYear, freiCalMonth,
  challenges: { <1–52>: { done: bool, doneAt: "YYYY-MM-DD"|null, note: "Text" } }, // Tab „Challenges“
  challengeOpen: <id>|null, challengeFilter: "alle"|"offen"|"erledigt",
  frei: {                               // Tab „Freiheit & Kontrolle“
    log:   { "YYYY-MM-DD": "clean" | "fall" },
    urges: [{ id, date, time, outcome: "res"|"gave", intensity: 1–10,
              situation, geraet, gefuehl, hilfe, halt: {h,a,l,t}, umgebung: bool }],
    diary: { "YYYY-MM-DD": "Text" },
    dank:  { "YYYY-MM-DD": "Text" },
    inner, middle, outer, bookend,      // 3-Kreise-Modell + Bookending
    beast, kosten, gewinn,              // „Mein Warum“
  },
}
```

### `uilog` — Anzeige-Änderungsverlauf, Array (max. 400)
```js
[{ day: "YYYY-MM-DD", t: <epoch ms>, label: "Text", year: 2026, n: <Anzahl> }]
```

## Event-Typen (Tabelle `events`, alle snake_case)
Automatisch bei jedem PUT: `doc_saved:<key>` (Payload = komplettes Dokument).
Explizit via `sendEvent()`: `score_changed, vision_edited, focus_toggled, goal_edited,
end_score_changed, reflexion_edited, habit_added, habit_checked, habit_removed,
habit_comment_saved, frei_day_marked, frei_dank_edited, frei_diary_edited,
frei_field_edited, urge_logged, urge_removed, year_switched, tab_selected,
history_entry_removed, history_cleared, import, challenge_toggled, challenge_note_edited`.

## Code-Wegweiser (app.js, ~1470 Zeilen — gezielt springen statt alles lesen)
| Bereich | Funktionen |
|---|---|
| DOM-Helfer | `el()`, `svg()` (Anfang der Datei) |
| Daten laden/speichern | `loadYearDoc`, `setDoc`, `setGlobal`, `setFrei`, `recordLog` |
| Heute (Standard-Tab, Tages-Cockpit) | `renderHeute` — aggregiert Habits/Frei/Challenge/Dankbarkeit über bestehende Daten, keine eigenen Keys/Events |
| Dashboard (Radar, Scores) | `renderDashboard`, `buildRadar`, `updateScoreVisuals` |
| Fokus & Ziele | `renderFokus` |
| Freiheit & Kontrolle | `renderFrei` + `renderFreiTagebuch` / `renderFreiUrge` / `renderFreiGenerell` (enthält `renderFreiStats`: Heatmap/Sieg-Quote/Muster, rein lesend, speichert nichts) |
| Habit Tracker | `renderHabits`, `pressHandlers` (Long-Press), `renderCommentSheet` |
| Mini-Challenges | `renderChallenges`, `setChallenge`, `isoWeek`; statische Daten in `frontend/js/challenges-data.js` (52 Einträge aus Wehrle-Buch, `Sources/`) |
| Verlauf-Drawer | `renderOverlay`, `openLog` |
| Boot/Init | `init`, `renderBoot` |

`frontend/js/markdown.js`: Markdown-Basics für alle Freitext-Felder — `mdToHtml` (Renderer), `mdField` (Drop-in-Ersatz für Textareas: gerenderte Ansicht, Tipp = bearbeiten, ⛶ öffnet Fullscreen-Editor), `openMdEditor`. Gespeichert wird immer roher Markdown-Text — Dokument-Struktur unverändert.
`frontend/js/api.js`: Fetch-Wrapper — `getDoc`, `saveDoc` (1 s Debounce), `flushAll`, `sendEvent`.
`server/server.js`: komplette API (~115 Zeilen) — Routen siehe ARCHITEKTUR.md.
