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
