**Ziel-Modell & Konfiguration:**
- KI-Modell: Claude 3.5 Haiku
- Effort-Modus: Low

**Rolle:** Du bist ein Senior Entwickler für Vanilla-JS. Antworte AUSSCHLIESSLICH mit Code-Blöcken. Der Inhalt ist unten vollständig vorgegeben — reines, fehlerfreies Einfügen, keine inhaltlichen Änderungen.

**Kontext & Inline-Dateien:**
Baut auf Prompt 006 auf: `frontend/js/kleinkind-data.js` existiert mit `const KLEINKIND_SECTIONS = [ …4 Sektionen… ];`. Lies die Datei, um die exakte Einfügestelle zu finden.

**Präzise Aufgabe:**
Füge die folgenden 5 Sektionen unverändert VOR der schließenden `];` ein (nach der Sektion `siegel`). Aktualisiere den Kopfkommentar auf „Teil 1+2 vollständig (9 Sektionen)“.

```js
  { id: 'montessori', emoji: '🌱', title: 'The Montessori Toddler', src: 'Simone Davies',
    kern: [
      '„Hilf mir, es selbst zu tun“: Kleinkinder wollen mitmachen, nicht behandelt werden. Widerstand entsteht oft, weil sie Objekt statt Akteur sind.',
      'Umgebung schlägt Ermahnung: Hocker am Waschbecken, eigene Bürste in Griffhöhe, Spiegel auf Augenhöhe — dann macht das Bad Lust statt Stress.',
      'Tempo raus: Kleinkinder leben in Zeitlupe. 10 Minuten Puffer für die Abendroutine verhindern die Hälfte aller Kämpfe.',
      'Nicht austricksen: Merkt sie, dass Ablenkung ein Trick ist, wird der Widerstand größer. Ankündigen, mitmachen lassen, dann freundlich zu Ende führen.',
      'Zähneputzen ist nicht optional — aber wann, wo, welche Bürste und wer anfängt, darf sie bestimmen.',
    ],
    tools: [
      { id: 'montessori-selbst', name: 'Selbst-machen-dann-fertig-machen-Regel',
        wie: ['Sie putzt zuerst selbst (auch wenn es nur Kauen ist).',
              'Dann Papa: „Jetzt mache ich deine Zähne fertig-sauber.“ — kurz und sanft.',
              'Parallel die eigenen Zähne putzen und dabei das immer gleiche Lied singen.'],
        warum: 'Erst Autonomie, dann Gründlichkeit — die Reihenfolge nimmt den Machtkampf raus.' },
      { id: 'montessori-routine', name: 'Bilder-Ablaufkarte für den Abend',
        wie: ['Mit ihr 4–5 Fotos/Bilder machen: Essen → Zähne → Schlafanzug → Buch → Bett.',
              'Im Bad aufhängen; abends fragen: „Was kommt als Nächstes auf deiner Karte?“',
              'Die Karte entscheidet — Papa ist nur der Assistent.'],
        warum: 'Der Streit verlagert sich vom Kind-gegen-Papa auf Kind-liest-Plan. Berechenbarkeit beruhigt.' },
    ] },

  { id: 'elternkompass', emoji: '🔬', title: 'Der Elternkompass', src: 'Nicola Schmidt',
    kern: [
      'Studienlage statt Bauchgefühl-Panik: Entscheidend ist eine verlässliche, warme Bindung — nicht die perfekte Methode. Einzelne miese Abende schaden ihr nicht.',
      'Die Autonomiephase (~18–36 Monate) ist Hirnreifung, keine Erziehungsfehler-Folge. „Trotz“ ist ein unglücklicher Name für Wollen-ohne-Können.',
      'Am besten belegt: liebevoll UND klar (warme Grenzen). Reine Härte schadet, reines Gewährenlassen auch.',
      'Strafen, Schimpfen, Liebesentzug verschlechtern Verhalten langfristig — Co-Regulation (ruhiger Erwachsener) verbessert es.',
      'Vergleiche mit anderen Kindern sind wertlos: Entwicklungsspannen sind riesig, auch bei Sprache.',
    ],
    tools: [
      { id: 'elternkompass-repair', name: 'Reparieren statt perfekt sein',
        wie: ['Nach einem Ausraster (deinem oder ihrem): kurz benennen, entschuldigen, kuscheln — fertig.',
              'Merksatz: Nicht der Riss zählt, sondern die Reparatur. Kinder mit reparierenden Eltern sind langfristig sicherer gebunden.'],
        warum: 'Die Forschung ist hier eindeutig: Rupture & Repair schlägt Fehlerlosigkeit.' },
    ] },

  { id: 'juul', emoji: '👨', title: 'Mann und Vater sein', src: 'Jesper Juul',
    kern: [
      'Sei Vater auf deine Art — nicht die Assistenz-Mutter. Kinder brauchen den eigenen, echten Stil ihres Vaters, keine Kopie.',
      'Persönliche Autorität statt Rollenautorität: „Ich will nicht gekratzt werden“ wirkt — Papa-als-Amtsperson („Das macht man nicht!“) nicht.',
      'Kinder sind gleichwürdig, nicht gleichberechtigt: Ihre Gefühle zählen voll, die Führung liegt trotzdem bei dir.',
      'Ein Vater, der sich selbst und die Paarbeziehung pflegt, gibt dem Kind mehr als einer, der sich aufopfert und ausbrennt.',
      'Konflikte sind kein Unfall, sondern der Ort, wo Beziehung entsteht — Kinder brauchen Reibung an einem stabilen Gegenüber.',
    ],
    tools: [
      { id: 'juul-ich', name: 'Persönliche Sprache statt Erziehungssprache',
        wie: ['Statt „Das tut man nicht!“ → „Stopp. Ich will das nicht.“',
              'Statt „Sei lieb!“ → „Ich brauche kurz eine Pause, dann komme ich wieder.“',
              'Eigene Grenzen ernst nehmen und aussprechen — das ist Vorbild für ihre.'],
        warum: 'Kinder kooperieren mit echten Menschen, nicht mit Rollen. Ich-Sprache macht dich als Person sichtbar.' },
    ] },

  { id: 'napthali', emoji: '🧘', title: 'Buddhism for Mothers of Young Children', src: 'Sarah Napthali',
    kern: [
      'Der anstrengende Abend IST dein Leben — kein Hindernis davor. Der Widerstand gegen das Jetzt („es sollte anders sein“) erschöpft mehr als das Kind selbst.',
      'Wut wahrnehmen ohne sofort zu handeln: Zwischen Reiz (Kratzer) und Reaktion liegt ein Atemzug — der gehört dir.',
      'Selbstmitgefühl ist keine Ausrede, sondern Voraussetzung: Ein Vater, der sich selbst fertig macht, hat keine Geduld übrig.',
      'Gefühle sind Wetter: Auch die schlimmste Abend-Front zieht durch. Ihre und deine.',
      'Nicht das perfekte Kind, nicht der perfekte Papa — nur dieser eine Moment, so wie er ist.',
    ],
    tools: [
      { id: 'napthali-atem', name: 'Der Türrahmen-Atemzug',
        wie: ['Die Badezimmertür ist dein Achtsamkeits-Anker: Jedes Mal beim Durchgehen 1 bewusster, langsamer Atemzug.',
              'Dabei innerlich: „Müder Papa, müdes Kind. Wir schaffen 5 Minuten.“',
              'Nach schwierigen Abenden 1 Minute: drei Dinge benennen, die trotzdem ok waren.'],
        warum: 'Mini-Rituale wirken, weil sie im Alltag automatisch ausgelöst werden — genau am Brennpunkt.' },
    ] },

  { id: 'karp', emoji: '📋', title: 'Toddler Discipline & Development (2 in 1)', src: 'Jamie Karp',
    kern: [
      'Verhalten hat Muster: Wer Auslöser kennt (müde, hungrig, Übergänge), kann vorbeugen statt reagieren.',
      'Konsistenz beider Eltern ist wichtiger als die perfekte Technik — gleiche Regeln, gleiche Worte.',
      'Übergänge ankündigen („Noch einmal, dann…“) reduziert Widerstand messbar.',
      'Kurze Ansagen in Positiv-Form: „Sanfte Hände!“ statt „Nicht kratzen!“ — Kleinkinder überhören das „nicht“.',
    ],
    tools: [
      { id: 'karp-log', name: 'Mini-Trigger-Log (3 Tage)',
        wie: ['3 Abende notieren (Handy reicht): Uhrzeit, was lief davor, was hat das Kratzen ausgelöst.',
              'Muster suchen: Immer beim Zähneputzen? Immer nach 19 Uhr? Immer bei Übergängen?',
              'Einen Auslöser gezielt entschärfen (z. B. Routine 30 Min. vorziehen) und 3 Tage testen.'],
        warum: 'Aus „sie kratzt dauernd“ wird „sie kratzt bei X“ — und X kann man ändern.' },
    ] },
```

**Architektur-Vorgaben & Code-Skelett:** Nur diese Datei anfassen. Keine Umformulierungen, keine zusätzlichen Sektionen.

**Robustheit & Corner-Cases:** Nach dem Einfügen Syntax prüfen (`node --check`); auf Kommas zwischen den Sektionen achten.

**Abnahmekriterien (Definition of Done):**
- 1. Datei enthält jetzt genau 9 Sektionen (akut, lansbury, faber, siegel, montessori, elternkompass, juul, napthali, karp) mit insgesamt 18 Tools, alle IDs eindeutig.
- 2. Keine Syntaxfehler.
- 3. CHANGELOG-Eintrag unter `[Unreleased]/Added` als zweiter Code-Block.
