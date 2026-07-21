**Ziel-Modell & Konfiguration:**
- KI-Modell: Claude 3.5 Haiku
- Effort-Modus: Low

**Rolle:** Du bist ein Senior Entwickler für Vanilla-JS. Antworte AUSSCHLIESSLICH mit Code-Blöcken. Der Inhalt ist unten vollständig vorgegeben — deine Aufgabe ist reines, fehlerfreies Zusammensetzen (keine inhaltlichen Änderungen, keine Kürzungen, keine eigenen Ergänzungen).

**Kontext & Inline-Dateien:**
Projekt „Lebensplaner“ (Vanilla-JS, kein Build). Vorbild: `frontend/js/challenges-data.js` — eine Datei, eine `const`, klassisch per `<script>` eingebunden. Es entsteht die neue Datei `frontend/js/kleinkind-data.js` mit `const KLEINKIND_SECTIONS` (Array). Struktur je Sektion:

```js
{ id: 'kebab-id', emoji: '🌙', title: 'Titel', src: 'Quelle',
  kern: ['Kernaussage', …],                    // 3–7 Einträge
  tools: [{ id: 'sektion-tool', name: 'Name',  // Werkzeuge/Skripte
            wie: ['Schritt 1', …], warum: 'Ein Satz Begründung' }] }
```

**Präzise Aufgabe:**
Erstelle `frontend/js/kleinkind-data.js` mit Datei-Kopfkommentar (`// Kleinkind-Kompass — paraphrasierte Kernaussagen aus 8 Elternbüchern (Regal-Ordner Books/2026-07-18). Teil 1/2; Teil 2 ergänzt Prompt 007.`) und exakt diesen 4 Sektionen (wörtlich übernehmen):

```js
const KLEINKIND_SECTIONS = [
  { id: 'akut', emoji: '🌙', title: 'Akut: Kratzen, Zähneputzen, müde Abende', src: 'Destillat aus allen 8 Büchern',
    kern: [
      'Kratzen/Hauen mit ~2 Jahren ist entwicklungsnormal — Impulskontrolle reift erst ab ~3. Es ist kein Angriff auf dich und sagt nichts über deine Tochter oder dein Vatersein aus.',
      'Ohne Sprache entlädt sich Frust über den Körper. Kratzen ist ihre lauteste verfügbare Botschaft: „Ich kann nicht mehr, hilf mir.“',
      'Abends ist ihr Selbststeuerungs-Akku leer — und deiner auch. Die Kollision ist planbar, also lässt sie sich entschärfen: Anforderungen vorziehen, Programm eindampfen.',
      'Zwei Reaktionen verstärken das Kratzen: großes Drama (spannend!) und Nachgeben (verunsichernd). Ruhig stoppen + freundlich durchziehen schwächt es ab.',
      'Ziel ist nicht, dass sie nie ausrastet — sondern dass du der ruhige Anker bleibst, während sie es tut.',
    ],
    tools: [
      { id: 'akut-stoppen', name: 'Kratzen stoppen: Hand ruhig festhalten',
        wie: ['Im Moment des Kratzens ihre Hand sanft, aber bestimmt festhalten (nicht wegschleudern).',
              'Kurz und ruhig: „Ich lass dich nicht kratzen. Das tut weh.“ — ein Satz, keine Predigt.',
              'Auf Armlänge gehen oder sie kurz absetzen: „Ich helfe dir und halte deine Hände.“',
              'Praktisch: Fingernägel freitags routinemäßig kurz schneiden.'],
        warum: 'Grenze + Hilfe statt Strafe: Sie KANN noch nicht anders — du übernimmst die Impulskontrolle, die ihr fehlt (Lansbury).' },
      { id: 'akut-boring', name: 'Kein Drama draus machen',
        wie: ['Auf ein lautes „AUA!“-Theater verzichten — die große Reaktion ist für sie hochspannend und lädt zur Wiederholung ein.',
              'Innerlich „laaangweilig“ denken, neutral blocken, weitermachen.',
              'Wenn es wirklich weh tat: einmal ruhig „Aua, das tat weh“ — ohne Show.'],
        warum: 'Kinder wiederholen, was Wirkung zeigt. Unaufgeregtheit nimmt dem Kratzen die Bühne (Lansbury: „unruffled“).' },
      { id: 'akut-benennen', name: 'Ihr Gefühl aussprechen (sie kann es nicht)',
        wie: ['Vor oder nach dem Stoppen ihr Gefühl in einfache Worte fassen: „Du bist sooo müde. Du willst nicht Zähne putzen. Das macht dich wütend.“',
              'Stimme mitfühlend, Grenze bleibt stehen.',
              'Danach Brücke bauen: „Komm, wir machen es schnell zusammen fertig.“'],
        warum: 'Benennen beruhigt das Alarmzentrum im Gehirn und ersetzt langfristig das Kratzen durch Sprache (Siegel: „Name it to tame it“).' },
      { id: 'akut-zaehne-spiel', name: 'Zähneputzen: Spiel schlägt Befehl',
        wie: ['Die Zahnbürste sprechen lassen (Quäk-Stimme): „Lass mich rein! Ich glaub, da versteckt sich ein Krümel hinterm Backenzahn!“',
              'Oder Krümel-Suchspiel: „Ohh, da ist noch ein Stück Banane von heute Mittag — hab ich es gleich…“',
              'Immer dasselbe kurze Zahnputzlied singen — Ritual statt Diskussion.'],
        warum: 'Direkte Befehle erzeugen bei Kleinkindern automatisch Widerstand; Spiel umgeht ihn komplett (Faber/King).' },
      { id: 'akut-zaehne-wahl', name: 'Zähneputzen: kleine Wahlmöglichkeiten geben',
        wie: ['Im Laden zwei Zahnbürsten von ihr selbst aussuchen lassen — abends darf sie wählen: „Rote oder gelbe Bürste?“',
              '„Erst du bei Papa, dann Papa bei dir?“ oder „Putzen wir im Bad oder auf dem Hocker?“',
              'Parallel selbst putzen: Sie sieht Papa machen es auch — Nachahmung ist ihr stärkster Antrieb.',
              'Regel bleibt fix: OB geputzt wird, ist nicht verhandelbar — nur WIE.'],
        warum: 'Autonomie ist DAS Thema mit 2. Wer bei den Details mitentscheiden darf, kämpft seltener gegen die Sache selbst (Montessori, Faber/King).' },
      { id: 'akut-zaehne-klar', name: 'Wenn nichts hilft: freundlich-klar zu Ende bringen',
        wie: ['Ankündigen statt austricksen: „Jetzt helfe ich dir. Ich putze deine Zähne fertig. Mund auf…“',
              'Sanft festhalten, zügig fertig putzen (30–45 s), dabei ruhig sprechen.',
              'Danach sofort Nähe anbieten: kuscheln, Buch — kein Groll, kein Nachkarten.'],
        warum: 'Kurz und berechenbar ist für sie leichter als 10 Minuten Kampf. Klarheit ohne Wut ist Fürsorge, keine Härte (Montessori: „kind and clear“).' },
      { id: 'akut-abendsetup', name: 'Den Abend entschärfen (bevor er eskaliert)',
        wie: ['Zähneputzen vorziehen: direkt nach dem Abendessen, wenn ihr Akku noch nicht leer ist — nicht als letzte Hürde vor dem Bett.',
              'Abendablauf immer gleich + als Bilder-Karte im Bad: „Was kommt auf deiner Karte als Nächstes?“ — die Karte ist der Chef, nicht Papa.',
              'Zwischen Abendessen und Bett: Reize runter (kein Toben, kein Bildschirm), Übergänge ankündigen („Noch einmal rutschen, dann Bad“).'],
        warum: 'Die meisten Abend-Kämpfe entstehen durch Timing und Übergänge, nicht durch das Zähneputzen selbst (Montessori, Karp).' },
      { id: 'akut-papa-akku', name: 'Papa-Notfallplan: dein eigener Akku',
        wie: ['HALT-Check vor dem Abendprogramm: Bin ich hungrig / aufgebraucht / einsam / müde? Vorher essen, kurz durchatmen.',
              'An zähen Tagen mit deiner Frau tauschen oder abwechseln — Zähneputzen muss nicht immer Papas Job sein.',
              'Wenn die Wut hochkocht: laut werden ist ok, aber ohne Angriff — ein Wort („ZÄHNE!“) oder Ich-Satz („ICH will nicht gekratzt werden!“), nie „du bist…“.',
              'Danach immer wieder verbinden: „Das war doof für uns beide. Ich hab dich lieb.“ Rückkehr ist wichtiger als Perfektion.'],
        warum: 'Dieselbe HALT-Logik wie in deinem Freiheit-Tab: Ausrasten ist fast immer ein Akku-Problem, kein Charakter-Problem (Faber/King, Napthali).' },
    ] },

  { id: 'lansbury', emoji: '🧸', title: 'No Bad Kids', src: 'Janet Lansbury',
    kern: [
      'Es gibt keine bösen Kleinkinder — schwieriges Verhalten ist immer ein Hilferuf eines überforderten kleinen Menschen.',
      'Kleinkinder testen Grenzen, um sich sicher zu fühlen. Eine ruhig gehaltene Grenze beruhigt; eine wacklige Grenze erzwingt weiteres Testen.',
      'Disziplin heißt helfen, nicht strafen: Du übernimmst die Kontrolle, die sie noch nicht hat — so wie man einen Schlafwandler sanft zurück ins Bett bringt.',
      'Gefühle immer erlauben, Verhalten begrenzen: Der Wutanfall nach der Grenze ist gesund — er braucht deinen ruhigen Beistand, keinen Abbruch.',
      'Nimm nichts persönlich. Sie ist winzig, du bist der Erwachsene — Augenrollen über einen Zwerg, der dich „ärgert“, ist absurd.',
      'Nach dem Sturm: vergeben, abhaken, weitermachen — ohne Groll. So lernt sie: Papa hält mich aus.',
    ],
    tools: [
      { id: 'lansbury-satz', name: 'Der „Ich lass das nicht zu“-Baukasten',
        wie: ['„Ich lass dich nicht kratzen. Das tut weh. Ich halte deine Hände.“',
              '„Du bist so wütend, dass Papa das Handy weggelegt hat. Ich weiß.“ (Grenze + Gefühl anerkennen)',
              '„Kommst du selbst ins Bad oder trage ich dich? … Sieht aus, als brauchst du Hilfe — ich trage dich.“ (Wahl + Durchziehen)'],
        warum: 'Kurz, ehrlich, ohne Strafe — und immer mit Umsetzung. Worte allein reichen bei Kleinkindern nie.' },
      { id: 'lansbury-anzug', name: 'Der Superhelden-Anzug (Kopf-Trick für den Moment)',
        wie: ['Beim ersten Anzeichen von Eskalation innerlich den „Anzug“ anziehen: Ich bin groß, sie ist klein, das hier ist ihr Notruf.',
              'Denken: „Das ist ein wichtiger Eltern-Moment — sie darf sich bei mir entladen.“',
              'Grenzen früh setzen, bevor du genervt bist — dann klappt es noch ruhig.',
              'Hinterher dich selbst loben statt zerfleischen: Du warst der Anker.'],
        warum: 'Lansburys eigener Trick gegen das Explodieren: Perspektivwechsel VOR der Reaktion — Gelassenheit lässt sich nicht faken, aber herbeidenken.' },
    ] },

  { id: 'faber', emoji: '🗣️', title: 'How to Talk so Little Kids Will Listen', src: 'Joanna Faber & Julie King',
    kern: [
      'Niemand — auch kein Kleinkind — mag Befehle. Direkte Anweisungen erzeugen automatisch Widerstand („irresistible contrariness“).',
      'Erst das Gefühl anerkennen, dann kommt Kooperation. Ein Kind, das sich verstanden fühlt, kann zuhören.',
      '„Ein Mensch, der schubst, kneift und beißt, um zu bekommen, was er will: entweder ein Gewaltverbrecher — oder ein völlig normales 2-jähriges Kind“ (Tremblay).',
      'Eltern DÜRFEN wütend werden. Kunst ist: laut ohne Beleidigung — Ich-Sätze, ein Wort, Werte benennen. Nie „du bist…“.',
      'Nach jedem Knall: wieder verbinden und für nächstes Mal gemeinsam eine Lösung finden. Wiedergutmachung statt Schuld.',
    ],
    tools: [
      { id: 'faber-toolbox', name: 'Die 9 Kooperations-Werkzeuge (Kurzliste)',
        wie: ['1 Spielerisch: Gegenstände sprechen lassen, Aufgabe zum Spiel machen („Schaffst du den Schlafanzug mit geschlossenen Augen?“).',
              '2 Wahl anbieten: „Hüpfst du ins Bad oder krabbelst du?“ — beide Optionen müssen ok sein.',
              '3 Kind zum Chef machen: Bilder-Ablaufkarte, Sanduhr — die Karte sagt, was kommt.',
              '4 Information statt Befehl: „Zahnbürsten brauchen Wasser.“',
              '5 Ein Wort: „Zähne!“ statt Vortrag.',
              '6 Beschreiben, was du siehst: „Ich sehe ein Mädchen, das fast im Schlafanzug ist!“',
              '7 Eigenes Gefühl sagen (Ich-Satz): „Ich mag nicht gekratzt werden.“',
              '8 Zettel/Symbol schreiben — geschriebene Worte haben Magie, auch für Nichtleser.',
              '9 Handeln ohne Kränkung: „Ich nehme dich jetzt hoch. Ich weiß, du hasst das.“'],
        warum: 'Jedes Werkzeug umgeht den Machtkampf, statt ihn zu gewinnen. Reihenfolge egal — was heute passt, zählt.' },
      { id: 'faber-hauen', name: 'Nach dem Kratzen: Werte + Wiedergutmachung',
        wie: ['Schützen ohne Attacke: „Papas sind nicht zum Kratzen!“ (statt „böses Mädchen“).',
              'Sich selbst als „Opfer“ kurz versorgen (Creme, kaltes Wasser) — sie darf helfen: „Holst du Papa das Kühlkissen?“',
              'Später (bei Ruhe) 1 Satz Vorbeugung: „Wenn du wütend bist, kannst du in das Kissen brüllen / stampfen.“ Alternative anbieten, nicht nur verbieten.'],
        warum: 'Wiedergutmachen statt bestrafen erhält die Verbindung und gibt ihr eine Handlung, die das schlechte Gefühl auflöst.' },
    ] },

  { id: 'siegel', emoji: '🧠', title: 'No-Drama Discipline', src: 'Daniel Siegel & Tina Payne Bryson',
    kern: [
      'Disziplin heißt wörtlich „lehren“ — nicht strafen. Frage vor jeder Reaktion: Was will ich ihr gerade beibringen, und kann sie das JETZT aufnehmen?',
      'Ihr „Obergeschoss“-Gehirn (Impulskontrolle, Vernunft) ist eine Baustelle bis weit ins Kindergartenalter. Müde + 23 Monate = das „Untergeschoss“ (Alarm, Angriff) regiert.',
      'Connect & Redirect: erst emotional andocken (Nähe, tiefe Stimme, Gefühl benennen), DANN umlenken. Ein Gehirn im Alarmmodus kann nicht lernen.',
      'Immer nach dem Warum fischen: Verhalten ist Kommunikation. Kratzen abends = „mein Tank ist leer“, nicht „ich bin frech“.',
      'Warte, bis die Welle durch ist. Erklärungen und Regeln erst, wenn beide ruhig sind — vorher ist es Lärm.',
    ],
    tools: [
      { id: 'siegel-connect', name: 'Connect & Redirect in 3 Schritten',
        wie: ['1 Andocken: runter auf ihre Höhe, ruhige Stimme, Berührung, Gefühl benennen („Du bist wütend. Zähneputzen nervt dich.“).',
              '2 Grenze halten: „Kratzen stoppe ich.“ (Hand halten, Körper wegdrehen.)',
              '3 Umlenken, sobald sie weicher wird: „Komm, die Bürste wartet — machen wir es zusammen schnell fertig.“'],
        warum: 'Verbindung beruhigt ihr Alarmsystem messbar — erst dann ist Verhaltenslenkung überhaupt möglich.' },
    ] },
];
```

**Architektur-Vorgaben & Code-Skelett:** Kein `export`, kein `let`, keine Funktionen — nur `const KLEINKIND_SECTIONS`. Datei UTF-8. Apostrophe innerhalb der Strings ggf. escapen, sodass die Datei syntaktisch valide bleibt.

**Robustheit & Corner-Cases:** JS-Syntax gegenprüfen (Kommas, Quotes, Umlaute). Die Sektionen aus Prompt 007 werden später VOR der schließenden `];` ergänzt — Datei so formatieren, dass das ein sauberer Anhang ist (letzte Sektion endet mit `},`).

**Abnahmekriterien (Definition of Done):**
- 1. `node --check frontend/js/kleinkind-data.js` (oder Konsolen-Load) ohne Syntaxfehler.
- 2. Alle 4 Sektionen vollständig und wörtlich wie vorgegeben; 12 Tools mit eindeutigen IDs.
- 3. CHANGELOG-Eintrag unter `[Unreleased]/Added` als zweiter Code-Block.
