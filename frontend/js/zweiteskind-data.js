// Statische Inhalte für den geführten Reflexions-Guide „Ein zweites Kind?"
// (Buch im mode 'guide' im Bücher-Tab). Antworten liegen in global.bookGuide['zweites-kind'].
// Die Forschungs-Absätze fassen echte Studienlage bewusst knapp zusammen (Quelle in Klammern) —
// sie sollen Denkanstoß sein, kein medizinischer Rat.

export const KIND2_GEBURT_TOCHTER = '2024-09-03';

// Frage-Typen: 'text' (Markdown-Feld), 'scale' (Slider 1–10 mit Pol-Beschriftung),
// 'choice' (Chips, eine Auswahl). Die Timing-Etappe (timing: true) rendert zusätzlich
// den Abstands-Rechner in app.js.
export const KIND2_SECTIONS = [
  {
    id: 'anker',
    emoji: '🧭',
    title: 'Standort: Wo stehst du heute?',
    sub: 'Erst der ehrliche Ist-Zustand, dann die große Frage.',
    science: [
      'Entscheidungsforschung zeigt: Große Lebensentscheidungen werden besser, wenn man den Ausgangszustand schriftlich festhält, statt ihn im Rückblick zu verklären (Hindsight-Bias). Dein Bauchgefühl ist dabei ein echter Datenpunkt — Intuition verdichtet Erfahrung (Gigerenzer) —, aber erst der Vergleich „Anker am Anfang vs. Bilanz am Ende" macht sichtbar, ob die Reflexion etwas verschoben hat.',
    ],
    questions: [
      { id: 'anker-bauch', type: 'scale', left: 'gar kein Wunsch', right: 'sehr starker Wunsch', q: 'Bauchgefühl-Anker: Wie stark ist dein Wunsch nach einem zweiten Kind — spontan, ohne Nachdenken?' },
      { id: 'anker-energie', type: 'scale', left: 'am Limit', right: 'Reserven da', q: 'Wie viel Energie hast du aktuell im Alltag mit eurer Tochter?' },
      { id: 'anker-schlaf', type: 'scale', left: 'chronisch müde', right: 'erholt', q: 'Wie erholt seid ihr körperlich? (Nächte, Schlaf eurer Tochter, deine Akkus)' },
      { id: 'anker-moment', type: 'text', q: 'Beschreibe den Moment, in dem der Gedanke ans zweite Kind zuletzt stark war. Was war da gerade los — und was hat er in dir ausgelöst?', ph: 'z. B. Als sie zum ersten Mal einem Baby zugewinkt hat … / Als Freunde ihr zweites bekamen …' },
      { id: 'anker-rueckblick', type: 'text', q: 'Zurück ins erste Jahr mit deiner Tochter: Was war schöner als erwartet — und was härter?', ph: 'Beides ehrlich aufschreiben; genau diese zwei Listen kommen wieder.' },
    ],
  },
  {
    id: 'motive',
    emoji: '💛',
    title: 'Motive: Warum (k)ein zweites Kind?',
    sub: 'Eigener Wunsch, Erwartung von außen — oder beides?',
    science: [
      'Längsschnittstudien zum Elternglück (Myrskylä & Margolis 2014, ~200.000 Personenjahre) zeigen: Die Lebenszufriedenheit steigt rund um die Geburt des ersten Kindes deutlich und pendelt danach zur Baseline zurück. Beim zweiten Kind ist dieser Glücks-Schub im Schnitt nur noch halb so groß, beim dritten kaum messbar. Heißt nicht „lass es" — heißt: Das zweite Kind macht das Leben voller, aber selten glücklicher im Messbaren. Der Grund dafür sollte also woanders liegen als in erhoffter Zufriedenheit.',
      'Motivationsforschung unterscheidet intrinsische Gründe (eigener Wunsch, Familienbild) von extrinsischen (sozialer Druck, Normen). Entscheidungen aus extrinsischen Motiven werden später häufiger bereut.',
    ],
    questions: [
      { id: 'motiv-fuer-wen', type: 'text', q: 'Für wen wünschst du dir das zweite Kind — für dich? Für deine Frau? Für eure Tochter? Für das Bild „richtiger Familie"? Sortiere schonungslos ehrlich.', ph: 'Reihenfolge mit Prozenten schätzen: 40 % für mich, weil … / 30 % für …' },
      { id: 'motiv-druck', type: 'text', q: 'Welche Sätze von außen hallen nach („Wann kommt das zweite?", „Einzelkinder sind doch …")? Und was davon glaubst du selbst wirklich?', ph: 'Satz aufschreiben → dahinter: glaube ich / glaube ich nicht, weil …' },
      { id: 'motiv-dienstag', type: 'text', q: 'Der Dienstag-Test: Ein ganz normaler Dienstagabend in 5 Jahren, zwei Kinder (ca. 8 und 3). Beschreibe die Szene konkret — und fühlt sie sich nach Wunsch oder nach Pflicht an?', ph: '18:30 Uhr, Küche … wer macht was, wie klingt es, wie fühlst du dich mittendrin?' },
      { id: 'motiv-dagegen', type: 'text', q: 'Was spricht in dir gegen ein zweites Kind? Auch die leisen, „verbotenen" Stimmen zählen — gerade die.', ph: 'z. B. Angst, die Nähe zur Tochter zu verlieren / endlich wieder Luft / Sorge um die Ehe …' },
    ],
  },
  {
    id: 'tochter',
    emoji: '👧',
    title: 'Blick auf eure Tochter',
    sub: 'Was gewinnt sie, was verliert sie — jenseits der Mythen.',
    science: [
      'Der größte Mythos zuerst: „Einzelkinder werden egoistisch und einsam." Die Meta-Analyse von Falbo & Polit (1986, über 100 Studien) und viele Folgestudien finden keine Nachteile von Einzelkindern bei Persönlichkeit, Sozialverhalten oder Beziehungsfähigkeit — teils sogar leichte Vorteile bei Leistungsmotivation und Selbstwert. Ein Geschwister ist also kein „Muss" für ihre Entwicklung.',
      'Umgekehrt gilt: Geschwisterbeziehungen gehören zu den längsten Beziehungen des Lebens und können ein enormes Geschenk sein — ihre Qualität hängt aber laut Forschung (Buhrmester & Furman 1990; Dirks et al. 2015) vor allem vom Familienklima und der elterlichen Fairness ab, nicht vom bloßen Vorhandensein oder dem Altersabstand. Ein Geschwister zu „liefern" garantiert keine enge Bindung.',
    ],
    questions: [
      { id: 'tochter-geschenk', type: 'text', q: '„Ein Geschwister wäre ein Geschenk für sie" — die Forschung stützt das nicht automatisch (siehe oben). Wenn du dieses Argument streichst: Was bleibt dann von deinem Wunsch übrig?', ph: 'Ehrlich prüfen: Trägt der Wunsch auch ohne dieses Argument?' },
      { id: 'tochter-veraendert', type: 'text', q: 'Was würde sich für eure Tochter konkret ändern — in den ersten 2 Jahren mit Baby, mit 10 Jahren, mit 40 (wenn ihr alt seid)?', ph: 'Drei Zeitpunkte, drei ehrliche Antworten — Gewinn UND Verlust je Zeitpunkt.' },
      { id: 'tochter-heute', type: 'text', q: 'Wie erlebst du sie heute mit anderen Kindern — sucht sie Gesellschaft, teilt sie gern, wie viel „Rudel" hat sie schon (Kita, Cousins, Freunde)?', ph: 'Ihr echtes Sozialleben beschreiben, nicht das befürchtete.' },
    ],
  },
  {
    id: 'paar',
    emoji: '💑',
    title: 'Partnerschaft & Teamwork',
    sub: 'Das zweite Kind bekommt nicht ein Elternteil — es bekommt euer Team.',
    science: [
      'Rund zwei Drittel der Paare erleben nach der Geburt eines Kindes einen deutlichen Einbruch der Beziehungszufriedenheit (Gottman; Doss et al. 2009, 8-Jahres-Längsschnitt). Der stärkste Schutzfaktor ist nicht Verliebtheit, sondern erlebte Fairness: Paare, die Care-Arbeit, Nächte und Mental Load als gerecht verteilt empfinden, erholen sich am besten. Ein zweites Kind verdoppelt nicht die Arbeit — es verdoppelt die Koordination.',
      'Praktisch heißt das: Die beste Vorhersage, wie es euch mit Kind 2 gehen wird, ist ein ehrlicher Blick darauf, wie euer Team heute unter Last funktioniert.',
    ],
    questions: [
      { id: 'paar-zufrieden', type: 'scale', left: 'angespannt', right: 'sehr gut', q: 'Wie geht es eurer Partnerschaft gerade wirklich?' },
      { id: 'paar-fair', type: 'text', q: 'Wie fair ist eure Aufteilung heute — Nächte, Care-Arbeit, Haushalt, Mental Load? Und was davon würde mit Kind 2 zuerst kippen?', ph: 'Konkret: Wer steht nachts auf? Wer denkt an Kita-Termine? Wer würde bei Kind 2 was übernehmen?' },
      { id: 'paar-wort', type: 'text', q: 'Was sagt deine Frau zu der Frage — möglichst wörtlich? Falls ihr noch nicht offen gesprochen habt: Was hält euch davon ab?', ph: 'Ihr O-Ton. Wenn es den nicht gibt, ist DAS die erste Aufgabe.' },
      { id: 'paar-krise', type: 'text', q: 'Denk an eure härteste Phase seit der Geburt eurer Tochter. Was hat euch da herausgezogen — und wäre diese Ressource mit zwei Kindern noch verfügbar?', ph: 'z. B. Oma ist eingesprungen / wir hatten noch Abende zu zweit / …' },
    ],
  },
  {
    id: 'ressourcen',
    emoji: '🔋',
    title: 'Ressourcen: Kraft, Geld, Dorf',
    sub: 'Belastung minus Ressourcen — die Burnout-Gleichung.',
    science: [
      'Die Forschung zu elterlichem Burnout (Mikolajczak & Roskam) bringt es auf eine einfache Formel: Burnout-Risiko = dauerhafte Belastung minus verfügbare Ressourcen. Entscheidend sind nicht perfekte Umstände, sondern ein tragfähiges Unterstützungsnetz und die Bereitschaft, Ansprüche zu senken. Eltern ohne „Dorf" haben das höchste Risiko.',
      'Zahlen zum Geld: Das Statistische Bundesamt beziffert die Konsumausgaben für ein Kind auf grob 800 € pro Monat (bis 18: rund 165.000 €) — beim zweiten Kind sinken die Zusatzkosten durch geteilte Ausstattung etwas. Ökonomisch gut belegt ist außerdem die „Child Penalty" (Kleven et al.): Einkommenseinbußen nach Kindern treffen langfristig fast ausschließlich die Mütter — ein Punkt, der offen aufs Papier gehört, nicht ins Ungesagte.',
    ],
    questions: [
      { id: 'res-grenze', type: 'scale', left: 'entspannt', right: 'am Anschlag', q: 'Wie nah bist du heute — ein Kind, normaler Alltag — an deiner Belastungsgrenze?' },
      { id: 'res-dorf', type: 'text', q: 'Euer „Dorf": Wer würde bei Kind 2 konkret helfen — mit Namen, wie oft, wie verlässlich?', ph: 'Namen + Frequenz: z. B. Oma M. (1×/Woche, verlässlich), Freundin S. (Notfall) …' },
      { id: 'res-geld', type: 'text', q: 'Grobe Rechnung: Wohnung (reicht der Platz?), Betreuungskosten, Elterngeld-Phase, evtl. reduziertes Gehalt. Geht sich das entspannt aus — oder nur mit Zähneknirschen?', ph: 'Überschlag reicht: + / − pro Monat in der Elternzeit und danach.' },
      { id: 'res-karriere', type: 'text', q: 'Was bedeutet Kind 2 für deine Karriere und die deiner Frau? Wer steckt wie lange zurück — und ist das ausgesprochen und für beide okay (Stichwort Child Penalty)?', ph: 'Elternzeit-Aufteilung, Teilzeit, Aufstiegschancen — für BEIDE durchdenken.' },
    ],
  },
  {
    id: 'timing',
    emoji: '⏱️',
    title: 'Timing: Wann wäre es klug?',
    sub: 'Medizinischer Abstand, Altersabstand, euer Lebensfenster.',
    timing: true,
    science: [
      'Medizinisch: Die WHO empfiehlt mindestens 24 Monate zwischen Geburt und nächster Empfängnis. Große Meta-Analysen (Conde-Agudelo et al. 2006, JAMA) fanden bei Abständen unter 18 Monaten erhöhte Raten von Frühgeburt und niedrigem Geburtsgewicht; neuere Studien mit besserer Kontrolle (u. a. Hanley et al. 2017) zeigen, dass diese Risiken in gut versorgten Ländern deutlich kleiner sind als lange gedacht. Kurz: ab ~18 Monaten okay, ab 24 Monaten entspannt — euer Fenster ist also praktisch offen.',
      'Fruchtbarkeit: Ab etwa 35 sinkt die Empfängniswahrscheinlichkeit pro Zyklus spürbar und die Wartezeit steigt (ESHRE). Wer noch deutlich unter 35 ist, kann sich Zeit lassen; darüber wird Warten teurer.',
      'Geschwisterabstand psychologisch: Kleine Abstände (< 2 Jahre) bedeuten mehr Nähe im Spiel, aber auch mehr Konflikt und maximale Elternlast am Stück; 2–4 Jahre gelten im Alltag oft als Sweet Spot (Tochter versteht schon viel, Kindergartenplatz entlastet); ab 4+ Jahren entzerrt sich alles, dafür schrumpft das gemeinsame Spielalter. Für die Beziehungsqualität der Geschwister ist der Abstand laut Forschung aber weniger wichtig als das Familienklima.',
    ],
    questions: [
      { id: 'timing-fixpunkte', type: 'text', q: 'Welche äußeren Fixpunkte setzen euch ein Fenster — euer Alter, Job-Situationen, Wohnung, Elternzeit-Regeln, Kita-Platz?', ph: 'Alles auflisten, was den Zeitraum real begrenzt oder begünstigt.' },
      { id: 'timing-warten', type: 'text', q: 'Angenommen ihr wartet bewusst 12 Monate länger: Was würde dadurch besser — und was ginge verloren?', ph: 'Beide Spalten füllen; oft ist die „besser"-Spalte überraschend lang (oder kurz).' },
    ],
  },
  {
    id: 'szenarien',
    emoji: '🔮',
    title: 'Zukunfts-Test: Beide Leben probewohnen',
    sub: 'Premortem, 10/10/10 und die Probe-Entscheidung.',
    science: [
      'Wir sind schlechte Propheten unserer eigenen Gefühle: Die Forschung zum Affective Forecasting (Gilbert & Wilson) zeigt, dass wir Intensität und Dauer künftiger Emotionen systematisch überschätzen — in beide Richtungen. Gegenmittel sind konkrete Techniken: das Premortem (Gary Klein — vom gescheiterten Ergebnis rückwärts erzählen), die 10/10/10-Frage (Suzy Welch) und die Probe-Entscheidung, bei der man einige Tage innerlich mit jeweils einer Option lebt und das Körpergefühl protokolliert.',
    ],
    questions: [
      { id: 'szen-premortem-ja', type: 'text', q: 'Premortem JA: Es ist 2029, Kind 2 ist da — und es ist richtig schwer geworden. Erzähle rückwärts: Was genau ist passiert?', ph: 'Als Geschichte schreiben, nicht als Liste. Was ist gekippt: Schlaf, Ehe, Geld, Geduld …?' },
      { id: 'szen-premortem-nein', type: 'text', q: 'Premortem NEIN: Ihr habt euch dagegen entschieden — und mit 60 tut es dir weh. Was genau fehlt in diesem Leben?', ph: 'Auch als Geschichte: Der Esstisch mit 60, wer sitzt da, was fühlst du?' },
      { id: 'szen-101010', type: 'text', q: '10/10/10: Wie fühlt sich ein JA in 10 Wochen, 10 Monaten, 10 Jahren an? Und ein NEIN in denselben drei Horizonten?', ph: '6 kurze Antworten: Ja/10W, Ja/10M, Ja/10J — Nein/10W, Nein/10M, Nein/10J.' },
      { id: 'szen-probe', type: 'text', q: 'Probe-Entscheidung: Lebe 3 Tage innerlich fest mit „Wir bekommen ein zweites" — dann 3 Tage mit „Wir bleiben zu dritt". Notiere nach jeder Phase dein Körpergefühl (kannst du hier nachtragen).', ph: 'Phase JA: … / Phase NEIN: … — welcher Modus fühlte sich nach Weite an, welcher nach Enge?' },
    ],
  },
  {
    id: 'fazit',
    emoji: '⚖️',
    title: 'Bilanz: Wo zeigt der Kompass hin?',
    sub: 'Anker vergleichen, Erkenntnisse sichern, nächsten Schritt festlegen.',
    science: [
      'Eine so große Entscheidung muss nicht heute fallen — aber sie sollte einen Prozess haben: Tendenz festhalten, mit dem Anker vom Anfang vergleichen, konkreten nächsten Schritt definieren und ein Wiedervorlage-Datum setzen. Offene Entscheidungen ohne Termin werden laut Entscheidungsforschung am häufigsten einfach vertagt — und Nicht-Entscheiden ist beim Thema Kinderwunsch faktisch auch eine Entscheidung.',
    ],
    questions: [
      { id: 'fazit-tendenz', type: 'choice', q: 'Deine ehrliche Tendenz heute:', options: ['Klares Ja', 'Eher Ja', 'Unentschieden', 'Eher Nein', 'Klares Nein'] },
      { id: 'fazit-bauch', type: 'scale', left: 'gar kein Wunsch', right: 'sehr starker Wunsch', q: 'Bauchgefühl JETZT, nach allen Etappen — vergleiche mit deinem Anker aus Etappe 1: Hat sich etwas bewegt?' },
      { id: 'fazit-erkenntnisse', type: 'text', q: 'Deine drei wichtigsten Erkenntnisse aus dieser Reise?', ph: '1. … 2. … 3. — was wusstest du vorher noch nicht über dich?' },
      { id: 'fazit-schritt', type: 'text', q: 'Der nächste konkrete Schritt — mit Datum: Gespräch mit deiner Frau, Zahlen rechnen, Arzttermin, bewusst wieder hinschauen am …?', ph: 'z. B. Samstagvormittag ohne Handy: ihr beide + diese Seite. Wiedervorlage: TT.MM.JJJJ' },
    ],
  },
];
