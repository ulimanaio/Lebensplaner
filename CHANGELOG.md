# Changelog
Alle nennenswerten Änderungen. Format: Keep a Changelog / SemVer-frei (Datums-Releases).

## [Unreleased]
### Added
- `frontend/js/kleinkind-data.js`: Kleinkind-Kompass-Datendatei mit 9 Sektionen aus 8 Elternbüchern (akut, Lansbury, Faber, Siegel, Montessori, Elternkompass, Juul, Napthali, Karp); 19 Werkzeuge mit eindeutigen IDs.
- Kleinkind-Kompass als neues Buch im Bücher-Tab (`mode 'library'`): Regal-Karte mit Fortschritt, auf-/zuklappbare Sektionen mit Kernideen, Werkzeugen samt „Ausprobiert“-Toggle und Notizfeld je Sektion (`renderBookLibrary` in `frontend/js/app.js`).
### Changed
### Fixed

## Planung
- 2026-07-18 — `PlanKinderbücher.md` angelegt: Feature „Kleinkind-Kompass“ (kuratierte Inhalte aus 8 Elternbüchern als neues Regal-Buch, mode `library`), Worker-Prompts 006–008. Bestehende Prompts 001–005 aus `Plan.md` als Einzeldateien nach `prompts/` extrahiert. Stripe-Payment-Anfrage verworfen (Konflikt mit Lokal-/Offline-Architektur, siehe PlanKinderbücher.md).
