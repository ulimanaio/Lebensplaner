// Lebensplaner-Frontend — Vanilla DOM, kein Build-Schritt.
// Nachbau von design_reference/Lebensplaner.dc.html, Daten via /api statt localStorage.
import { getDoc, saveDoc, flushAll, sendEvent, setSaveListener, setPendingListener, pendingSaves } from './api.js';
import { CHALLENGES } from './challenges-data.js';
import { mdField, mdToHtml } from './markdown.js';

const AREAS = [
  { id: 'koerper', name: 'Körper & Geist', color: '#8AB4F8', placeholder: 'Ich fühle mich unbesiegbar. Nichts kann mir etwas anhaben, ich durchstehe jede Krise und jedes körperliche Gebrechen (Terminator-Modus).', goalPlaceholder: 'z. B. Zweimal die Woche Laufen, zweimal die Woche Fitnessstudio, einen Halbmarathon laufen, einen HYROX-Wettkampf absolvieren.' },
  { id: 'soziales', name: 'Soziales', color: '#81C995', placeholder: 'Ein enger Kreis echter Freunde, den ich regelmäßig sehe und auf den ich mich zu 100 % verlassen kann.', goalPlaceholder: 'z. B. Einmal im Monat ein Treffen mit Freunden organisieren, zwei alte Kontakte reaktivieren, einem Verein beitreten.' },
  { id: 'liebe', name: 'Liebe', color: '#F28B82', placeholder: 'Verheiratet, eine Frau, die mich unterstützt, wo man füreinander da ist.', goalPlaceholder: 'z. B. Jede Woche ein fester Date-Abend, einmal im Quartal ein Wochenendtrip zu zweit, jeden Tag ein ehrliches Gespräch ohne Handy.' },
  { id: 'finanzen', name: 'Finanzen', color: '#FDD663', placeholder: 'Ein spezifischer Bestand an Immobilien und Barvermögen, sodass ich nie wieder arbeiten muss und von meinem Leben zehren kann.', goalPlaceholder: 'z. B. Sparquote auf 30 % erhöhen, 12.000 € Notgroschen aufbauen, monatlich 500 € in ETFs investieren, erstes Immobilien-Exposé prüfen.' },
  { id: 'karriere', name: 'Karriere', color: '#C58AF9', placeholder: 'Ich arbeite an Projekten, die mich fordern, mit voller Autonomie — und werde dafür exzellent bezahlt.', goalPlaceholder: 'z. B. Gehaltsgespräch bis Q2 führen, eine Zertifizierung abschließen, ein eigenes Projekt verantworten, 2 Fachbücher lesen.' },
  { id: 'sinn', name: 'Sinn', color: '#78D9EC', placeholder: 'Mindestens für X Euro Futter an Tierheime spenden und diese aktiv besuchen.', goalPlaceholder: 'z. B. 500 € Futter an Tierheime spenden, viermal im Jahr persönlich ein Tierheim besuchen, einen monatlichen Spenden-Dauerauftrag einrichten.' },
];

const MAX_FOKUS = 2;

const TABS = [
  { id: 'heute', label: 'Heute' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'fokus', label: 'Fokus & Ziele' },
  { id: 'habits', label: 'Habit Tracker' },
  { id: 'frei', label: 'Freiheit' },
  { id: 'buecher', label: 'Bücher' },
];

// Bücher-Regal: jedes Buch bringt eigene Aufgaben mit. mode 'challenges' = feste
// Impulse aus challenges-data.js; mode 'tasks' = Aufgaben werden beim Lesen selbst
// festgehalten (global.bookTasks). Neue Bücher: einfach hier ergänzen.
const BOOKS = [
  {
    id: 'wehrle',
    title: 'Dieses Buch verändert dein Leben für immer',
    author: 'Martin Wehrle',
    emoji: '⚡',
    color: '#FDD663',
    mode: 'challenges',
  },
  {
    id: 'stahl-kind',
    title: 'Das Kind in dir muss Heimat finden',
    author: 'Stefanie Stahl',
    emoji: '🏠',
    color: '#8AB4F8',
    mode: 'tasks',
    intro: 'Schattenkind, Sonnenkind & Glaubenssätze — halte die Übungen und Reflexionsfragen aus dem Buch hier fest und bearbeite sie in deinem Tempo.',
  },
  {
    id: 'stahl-selbstwert',
    title: 'Leben kann auch einfach sein!',
    author: 'Stefanie Stahl',
    emoji: '🌱',
    color: '#81C995',
    mode: 'notes',
    intro: 'Hörbuch-Begleiter: Kapitel wählen, Typ antippen, Gedanken sofort festhalten — Kapitel und Typ bleiben für die nächste Notiz stehen.',
    chapters: [
      'Prolog',
      'Bewusst selbst sein',
      'Was bewirkt ein geringes Selbstwertgefühl?',
      'Auswirkungen auf das Miteinander',
      'Die Stärken von selbstunsicheren Menschen',
      'Warum bin ich nur so unsicher? (Ursachen)',
      'Das innere Kind',
      'So werde ich selbstbewusster: Selbstannahme',
      'Finden Sie zu sich selbst!',
      'Kommunikation',
      'Handeln',
      'Fühlen',
      'Wie Sie Ihr Leben verändern — Übungen',
      'Test & Tipps: Intro- und Extraversion',
      'Epilog',
    ],
  },
];

// Notiz-Typen für Bücher im mode 'notes' (Hörbuch-Begleiter) — schnelle Einordnung beim Hören.
const NOTE_TYPES = {
  gedanke: { label: 'Gedanke', emoji: '💭', ph: 'Was geht dir gerade durch den Kopf?' },
  aha:     { label: 'Aha-Moment', emoji: '⚡', ph: 'Was hat gerade Klick gemacht?' },
  zitat:   { label: 'Zitat', emoji: '📌', ph: 'Satz aus dem Buch, den du behalten willst …' },
  bezug:   { label: 'Ich-Bezug', emoji: '🪞', ph: 'Wo erkennst du dich wieder? Welche Situation fällt dir ein?' },
  todo:    { label: 'Umsetzen', emoji: '✅', ph: 'Übung oder Vorsatz, den du ausprobieren willst …' },
};

// Aufgaben-Typen für Bücher im mode 'tasks' — bestimmen das Antwort-Feld je Aufgabe.
const TASK_TYPES = {
  reflexion: {
    label: 'Reflexionsfrage', emoji: '💭',
    hint: 'Eine Frage aus dem Buch, die du schriftlich beantwortest.',
    answerLabel: 'Meine Antwort', answerPh: 'Meine Antwort in Ruhe aufschreiben …',
  },
  liste: {
    label: 'Liste', emoji: '📋',
    hint: 'Sammel-Aufgabe — z. B. Glaubenssätze, Stärken oder Schutzstrategien Punkt für Punkt sammeln.',
    answerLabel: 'Meine Einträge',
  },
  uebung: {
    label: 'Übung', emoji: '🧘',
    hint: 'Praktische oder Imaginations-Übung — Erfahrungen danach als Notiz festhalten.',
    answerLabel: 'Meine Erfahrungen', answerPh: 'Wie ist die Übung gelaufen? Was habe ich gespürt oder gelernt?',
  },
};

// Icon + Kurz-Label je Tab für die mobile Bottom-Nav (Reihenfolge wie TABS).
// Icons als Inline-SVG (Material-Symbols-Stil, 24x24, currentColor) — keine Icon-Fonts/CDNs.
const NAV_ICONS = {
  heute: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="8.5"/></svg>',
  dashboard: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="12" width="4" height="8" rx="1"/><rect x="10" y="7" width="4" height="13" rx="1"/><rect x="16" y="3" width="4" height="17" rx="1"/></svg>',
  fokus: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>',
  habits: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.3 2.3 4.7-4.9"/></svg>',
  frei: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15c3-6 8-9 13-9 2 0 4 1 5 2-3 1-4 3-4 5 0 3-3 6-7 6-2.5 0-4.5-1-6-2.5"/><path d="M3 15c1.5.5 3 .5 4.5 0"/></svg>',
  buecher: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
};
const BOTTOM_NAV = {
  heute: { icon: NAV_ICONS.heute, label: 'Heute' },
  dashboard: { icon: NAV_ICONS.dashboard, label: 'Dashboard' },
  fokus: { icon: NAV_ICONS.fokus, label: 'Fokus' },
  habits: { icon: NAV_ICONS.habits, label: 'Habits' },
  frei: { icon: NAV_ICONS.frei, label: 'Freiheit' },
  buecher: { icon: NAV_ICONS.buecher, label: 'Bücher' },
};

const JAHR_DEFAULT = 2026;

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const state = {
  year: JAHR_DEFAULT,
  tab: 'heute',
  doc: null,      // Dokument 'year-<jahr>'
  uilog: [],      // Dokument 'uilog' (Anzeige-Verlauf, max. 400)
  global: null,   // Dokument 'global' (Habit Tracker, jahresübergreifend)
  logOpen: false,
  savedAt: null,
  saveFlash: false,
  saveError: false,
  commentTarget: null, // { habitId, idx, draft }
  urgeDraft: null,     // transientes Urge-Formular, nicht persistiert
  urgeCelebration: null, // transient: Sieg-Overlay nach „Widerstanden", { n } — reines UI
  urgeGaveNote: false,   // transient: freundliche Karte nach „Nachgegeben" — reines UI
};
const yearCache = new Map(); // jahr -> doc (vermeidet Races mit debounced Saves)
const refs = {};             // DOM-Referenzen für gezielte Updates (Slider-Live-Feedback)
let flashTimer = null;
let habitFormOpen = false;

// ---------- DOM-Helfer ----------
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'style') node.style.cssText = v;
    else if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value' || k === 'checked' || k === 'placeholder' || k === 'title' || k === 'type' || k === 'rows' || k === 'min' || k === 'max' || k === 'step') node[k] = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

// Range-Slider mit gefülltem Track (--fill) für Webkit. min/max fest 1–10.
// Setzt --fill initial und live bei jeder Bewegung; onInput/onChange werden durchgereicht.
function rangeSlider({ value, min = 1, max = 10, onInput, onChange }) {
  const setFill = (node) => {
    const pct = ((Number(node.value) - min) / (max - min)) * 100;
    node.style.setProperty('--fill', pct + '%');
  };
  const input = el('input', {
    type: 'range', min: String(min), max: String(max), step: '1', value: String(value),
    onInput: (ev) => { setFill(ev.target); if (onInput) onInput(ev); },
    onChange: (ev) => { setFill(ev.target); if (onChange) onChange(ev); },
  });
  setFill(input);
  return input;
}

// Klappbare Info-Box: auf Mobile zugeklappt, auf Desktop (>720px) initial offen.
function collapsibleInfo(title, ...content) {
  return el('details', { class: 'info-collapse', open: window.innerWidth > 720 ? '' : null },
    el('summary', { class: 'info-collapse-summary' }, title),
    el('div', { class: 'info-collapse-body' }, ...content),
  );
}

// Wiederverwendbare Empty-State-Karte (gestrichelter Rahmen im .fokus-empty-Stil).
// icon = Emoji oder Inline-SVG-String; buttonLabel/onClick optional.
function emptyState(icon, title, text, buttonLabel, onClick) {
  return el('div', { class: 'empty-state' },
    el('div', { class: 'empty-state-icon' }, icon),
    el('div', { class: 'empty-state-title' }, title),
    el('div', { class: 'empty-state-text' }, text),
    buttonLabel && el('button', { class: 'btn-primary', onClick }, buttonLabel),
  );
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'style') node.style.cssText = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) if (c != null) node.append(c.nodeType ? c : document.createTextNode(c));
  return node;
}

// ---------- UI-Präferenzen (nur Navigation, keine Daten) ----------
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem('lebensplaner-ui')) || {}; } catch (e) { return {}; }
}
function savePrefs() {
  try { localStorage.setItem('lebensplaner-ui', JSON.stringify({ year: state.year, tab: state.tab })); } catch (e) {}
}

// ---------- Daten ----------
function freshYearDoc(y) {
  return {
    year: y,
    scores: { koerper: 5, soziales: 5, liebe: 5, finanzen: 5, karriere: 5, sinn: 5 },
    visions: {}, focus: [], goals: {}, goalStatus: {}, reflexions: {}, endScores: {},
  };
}

async function loadYearDoc(y) {
  if (yearCache.has(y)) return yearCache.get(y);
  const saved = await getDoc('year-' + y);
  const doc = Object.assign(freshYearDoc(y), saved || {});
  doc.year = y;
  yearCache.set(y, doc);
  return doc;
}

function persistYearDoc() {
  yearCache.set(state.year, state.doc);
  saveDoc('year-' + state.year, state.doc);
}

function setDoc(patch, logLabel) {
  Object.assign(state.doc, patch);
  persistYearDoc();
  if (logLabel) recordLog(logLabel);
}

// ---------- Globales Dokument (Habit Tracker, jahresübergreifend) ----------
function freshGlobalDoc() {
  return {
    habits: [],
    habitViewMode: 'streak',
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),
    newHabitName: '', newHabitWenn: '', newHabitDann: '',
    newHabitKurz: '', newHabitMittel: '', newHabitLang: '',
    overloadWarn: false,
    frei: freshFrei(),
    freiTab: 'tagebuch',
    freiSelDate: null,
    freiCalYear: null,
    freiCalMonth: null,
    challenges: {},          // <id>: { done, doneAt, note } — Mini-Challenges (Wehrle)
    challengeOpen: null,     // aufgeklappte Challenge-Karte
    challengeFilter: 'alle', // 'alle' | 'offen' | 'erledigt'
    bookOpen: null,          // geöffnetes Buch im Bücher-Tab (Buch-ID oder null = Übersicht)
    bookTasks: {},           // <bookId>: [{ id, type, title, page, prompt, answer, items, done, doneAt, createdAt }]
    bookTaskOpen: null,      // aufgeklappte Aufgaben-Karte
    bookTaskFilter: 'alle',  // 'alle' | 'offen' | 'erledigt'
  };
}

function persistGlobalDoc() {
  saveDoc('global', state.global);
}

function setGlobal(patch, logLabel) {
  Object.assign(state.global, patch);
  persistGlobalDoc();
  if (logLabel) recordLog(logLabel);
}

// ---------- Freiheit & Kontrolle (Teil des globalen Dokuments: global.frei) ----------
function freshFrei() {
  return {
    log: {}, urges: [], diary: {}, dank: {},
    inner: '', middle: '', outer: '', bookend: '', beast: '', kosten: '', gewinn: '',
    why: { hurt: '', morning: '', future: '', ripple: '' }, // geführte Warum-Fragen
    letter: '',   // Brief an mein Drang-Ich (erscheint in Sieg-/Nachgegeben-Overlay)
    values: [],   // ausgewählte Werte-Anker (Chips)
  };
}

function setFrei(patch, logLabel) {
  const frei = Object.assign({}, state.global.frei, patch);
  setGlobal({ frei }, logLabel);
}

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function dateFromStart(startDateISO, i) {
  const d = new Date((startDateISO || daysAgoISO(0)) + 'T00:00:00');
  d.setDate(d.getDate() + i);
  return d;
}

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonthCells(year, month) {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// Long-Press (450ms) öffnet das Kommentar-Sheet, normaler Klick togglet den Tag.
let lpTimer = null;
let lpFired = false;
let justDoneCell = null; // { habitId, idx } — kurzzeitig für Pop-Animation nach dem Abhaken

const MILESTONES = [7, 21, 33, 50, 66];

function showToast(text) {
  const toast = el('div', { class: 'habit-toast' }, text);
  document.body.append(toast);
  setTimeout(() => toast.remove(), 2500);
}
function pressHandlers(habitId, idx, toggle) {
  const clearPress = (ev) => {
    clearTimeout(lpTimer);
    if (ev && ev.currentTarget) ev.currentTarget.classList.remove('pressing');
  };
  return {
    onPointerDown: (ev) => {
      lpFired = false;
      clearTimeout(lpTimer);
      const cell = ev && ev.currentTarget;
      if (cell) cell.classList.add('pressing');
      lpTimer = setTimeout(() => {
        lpFired = true;
        if (cell) cell.classList.remove('pressing');
        try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
        openComment(habitId, idx);
      }, 450);
    },
    onPointerUp: clearPress,
    onPointerLeave: clearPress,
    onContextMenu: (ev) => ev.preventDefault(),
    onClick: () => {
      if (lpFired) { lpFired = false; return; }
      toggle();
    },
  };
}

function openComment(habitId, idx) {
  const h = state.global.habits.find((x) => x.id === habitId);
  if (!h) return;
  state.commentTarget = { habitId, idx, draft: ((h.comments || {})[idx]) || '' };
  render();
}

function closeComment() {
  state.commentTarget = null;
  render();
}

function saveComment(text) {
  const t = state.commentTarget;
  const h = state.global.habits.find((x) => x.id === t.habitId);
  if (h) {
    const comments = { ...(h.comments || {}) };
    if (text && text.trim()) comments[t.idx] = text.trim(); else delete comments[t.idx];
    setGlobal({ habits: state.global.habits.map((x) => (x.id === h.id ? { ...x, comments } : x)) }, 'Habit Tracker aktualisiert');
    sendEvent('habit_comment_saved', { habitId: h.id, idx: t.idx });
  }
  closeComment();
}

// ---------- Änderungsverlauf (Anzeige-Log wie im Prototyp, als Dokument 'uilog') ----------
function isoDay(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function recordLog(label) {
  const now = new Date();
  const day = isoDay(now);
  const last = state.uilog[0];
  if (last && last.day === day && last.label === label && last.year === state.year) {
    last.t = now.getTime();
    last.n = (last.n || 1) + 1;
  } else {
    state.uilog.unshift({ day, t: now.getTime(), label, year: state.year, n: 1 });
  }
  if (state.uilog.length > 400) state.uilog = state.uilog.slice(0, 400);
  saveDoc('uilog', state.uilog);
  state.savedAt = now;
  updateSaveBtn(); // zeigt sofort „Speichert …" (pendingSaves > 0)
  if (state.logOpen) renderOverlay();
}

function saveUilog() {
  saveDoc('uilog', state.uilog);
}

// ---------- Speicher-Status-Chip ----------
// Passiver Status (wie Google Docs). Klick öffnet weiterhin den Verlauf;
// im Fehlerzustand versucht der Klick zuerst erneut zu speichern (flushAll).
// 16px-Icons als Inline-SVG. Es werden nur statische Strings gesetzt (kein User-Input).
const SAVE_ICONS = {
  cloud: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 19a4.5 4.5 0 0 0 .5-8.98A6 6 0 0 0 6.34 9.5 3.5 3.5 0 0 0 7 19z"/><path d="m9 13 2 2 4-4"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 13 4 4 10-10"/></svg>',
  spinner: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9" opacity="0.9"/></svg>',
  warn: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
};

function updateSaveBtn() {
  const btn = refs.saveBtn;
  if (!btn) return;
  const saving = pendingSaves() > 0;
  const mode = state.saveError ? 'error' : saving ? 'saving' : state.saveFlash ? 'flash' : 'idle';
  btn.className = 'save-chip save-chip--' + mode;
  let icon, label, title;
  if (mode === 'error') {
    icon = SAVE_ICONS.warn; label = 'Offline — Änderungen lokal'; title = 'Erneut speichern';
  } else if (mode === 'saving') {
    icon = SAVE_ICONS.spinner; label = 'Speichert …'; title = 'Änderungsverlauf anzeigen';
  } else if (mode === 'flash') {
    icon = SAVE_ICONS.check; label = 'Gespeichert'; title = 'Änderungsverlauf anzeigen';
  } else {
    icon = SAVE_ICONS.cloud; label = 'Gespeichert'; title = 'Änderungsverlauf anzeigen';
  }
  btn.innerHTML = icon + '<span class="save-chip__label">' + label + '</span>';
  btn.title = title;
}

function onSaveChipClick() {
  if (state.saveError) { flushAll(); return; } // Retry, ohne den Verlauf zu öffnen
  openLog();
}

setSaveListener((ok) => {
  if (ok) {
    state.saveError = false;
    // Kurzes grünes Häkchen (0.8 s) nach erfolgreichem Save, danach zurück zu „Gespeichert".
    if (pendingSaves() === 0) {
      state.saveFlash = true;
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => { state.saveFlash = false; updateSaveBtn(); }, 800);
    }
  } else {
    state.saveError = true;
  }
  updateSaveBtn();
});
setPendingListener(() => updateSaveBtn());

// ---------- Jahreswechsel ----------
async function switchYear(delta) {
  const from = state.year;
  const y = from + delta;
  if (y < 2020 || y > 2100) return;
  persistYearDoc();
  let next;
  if (yearCache.has(y)) {
    next = yearCache.get(y);
  } else {
    let saved = null;
    try { saved = await getDoc('year-' + y); } catch (e) { saved = null; }
    if (saved) {
      next = Object.assign(freshYearDoc(y), saved, { year: y });
    } else {
      // Neues Jahr: Visionen, Bewertungen & Fokus als Startpunkt übernehmen (wie im Prototyp)
      next = freshYearDoc(y);
      next.scores = { ...state.doc.scores };
      next.visions = { ...state.doc.visions };
      next.focus = [...state.doc.focus];
    }
    yearCache.set(y, next);
  }
  state.year = y;
  state.doc = next;
  persistYearDoc();
  savePrefs();
  sendEvent('year_switched', { from, to: y });
  render();
}

function selectTab(id) {
  state.tab = id;
  savePrefs();
  sendEvent('tab_selected', { tab: id });
  render();
}

// ---------- Header ----------
function renderHeader() {
  const showYearPicker = state.tab !== 'heute' && state.tab !== 'habits' && state.tab !== 'frei' && state.tab !== 'buecher';
  refs.saveBtn = el('button', { class: 'save-chip save-chip--idle', title: 'Änderungsverlauf anzeigen', onClick: onSaveChipClick });
  const header = el('header', { class: 'header' },
    el('div', { class: 'header-left' },
      el('div', { class: 'logo' }, 'L'),
      el('div', {},
        el('div', { class: 'header-title-row' },
          el('div', { class: 'app-title' }, 'Lebensplaner'),
          showYearPicker && el('div', { class: 'year-pill' },
            el('button', { class: 'year-btn', title: 'Vorheriges Jahr', onClick: () => switchYear(-1) }, '‹'),
            el('span', { class: 'year-label' }, String(state.year)),
            el('button', { class: 'year-btn', title: 'Nächstes Jahr', onClick: () => switchYear(1) }, '›'),
          ),
        ),
        el('div', { class: 'app-subtitle' }, 'Das 6-Säulen-System · Machbar, messbar, verbindlich'),
      ),
    ),
    el('div', { class: 'header-right' },
      refs.saveBtn,
      el('nav', { class: 'tabs' },
        TABS.map((t) => el('button', {
          class: 'tab-btn' + (state.tab === t.id ? ' active' : ''),
          onClick: () => selectTab(t.id),
        }, t.label)),
      ),
    ),
  );
  updateSaveBtn();
  return header;
}

// ---------- Mobile Bottom-Nav (nur ≤720 px sichtbar, per CSS gesteuert) ----------
function renderBottomNav() {
  return el('nav', { class: 'bottom-nav' },
    TABS.map((t) => {
      const meta = BOTTOM_NAV[t.id];
      const iconWrap = el('span', { class: 'bottom-nav-icon' });
      iconWrap.innerHTML = meta.icon;
      return el('button', {
        class: 'bottom-nav-btn' + (state.tab === t.id ? ' active' : ''),
        onClick: () => selectTab(t.id),
      },
        el('span', { class: 'bottom-nav-pill' }, iconWrap),
        el('span', { class: 'bottom-nav-label' }, meta.label),
      );
    }),
  );
}

// ---------- Radar-Chart (SVG, Geometrie 1:1 aus dem Prototyp) ----------
function buildRadar(animate = false) {
  const scores = state.doc.scores;
  const cx = 170, cy = 160, R = 110, N = AREAS.length;
  const pt = (i, r) => {
    const ang = (Math.PI * 2 * i) / N - Math.PI / 2;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  };
  const rings = [2, 4, 6, 8, 10].map((lvl) => svg('polygon', {
    points: AREAS.map((_, i) => pt(i, (R * lvl) / 10).join(',')).join(' '),
    fill: 'none', stroke: '#3C4043', 'stroke-width': 1,
  }));
  const spokes = AREAS.map((_, i) => {
    const [x2, y2] = pt(i, R);
    return svg('line', { x1: cx, y1: cy, x2, y2, stroke: '#3C4043', 'stroke-width': 1 });
  });
  const dataPts = AREAS.map((a, i) => pt(i, (R * (scores[a.id] || 1)) / 10));
  // Aufbau-Animation nur beim Tab-Wechsel zum Dashboard (animate=true), nicht bei Slider-Updates.
  const polyAttrs = {
    points: dataPts.map((p) => p.join(',')).join(' '),
    fill: 'rgba(138,180,248,0.25)', stroke: '#8AB4F8', 'stroke-width': 2.5,
    'stroke-linejoin': 'round', style: 'transition:all .3s ease;transform-origin:center;',
  };
  if (animate) polyAttrs.class = 'radar-poly-build';
  const poly = svg('polygon', polyAttrs);
  const dots = dataPts.map((p, i) => svg('circle', {
    cx: p[0], cy: p[1], r: 4.5, fill: AREAS[i].color, stroke: '#1E1F20', 'stroke-width': 2,
  }));
  const labels = AREAS.map((a, i) => {
    const [x, y] = pt(i, R + 26);
    return svg('text', {
      x, y: y + 4, 'text-anchor': 'middle', fill: a.color,
      'font-size': 12, 'font-weight': 500, 'font-family': "'Google Sans',sans-serif",
    }, a.name);
  });
  return svg('svg', { width: 340, height: 320, viewBox: '0 0 340 320', style: 'max-width:100%;' },
    rings, spokes, poly, dots, labels);
}

function avgScoreText() {
  const scores = state.doc.scores;
  const avg = AREAS.reduce((sum, a) => sum + (scores[a.id] || 1), 0) / AREAS.length;
  return avg.toFixed(1).replace('.', ',');
}

function weakestArea() {
  const scores = state.doc.scores;
  return AREAS.reduce((w, a) => (scores[a.id] < scores[w.id] ? a : w), AREAS[0]);
}

// Gezieltes Update bei Slider-Bewegung (input), ohne Voll-Rerender — der Slider bleibt greifbar.
function updateScoreVisuals(area) {
  const scores = state.doc.scores;
  if (refs.areaCircles && refs.areaCircles[area.id]) refs.areaCircles[area.id].textContent = String(scores[area.id]);
  if (refs.radar) {
    const fresh = buildRadar();
    refs.radar.replaceWith(fresh);
    refs.radar = fresh;
  }
  if (refs.avg) refs.avg.textContent = avgScoreText();
  const weakest = weakestArea();
  if (refs.weakCircle) {
    refs.weakCircle.style.background = weakest.color;
    refs.weakCircle.textContent = String(scores[weakest.id]);
  }
  if (refs.weakName) refs.weakName.textContent = weakest.name;
}

// ---------- Dashboard ----------
// Tageszeit-abhängige Begrüßung (5–11 Morgen, 11–18 Tag, sonst Abend).
function greetingText() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'Guten Morgen ☀️';
  if (h >= 11 && h < 18) return 'Guten Tag 👋';
  return 'Guten Abend 🌙';
}

// ---------- Heute (Standard-Tab: Tages-Cockpit über bestehende Daten) ----------
function renderHeute() {
  const g = state.global;
  const now = new Date();
  const today = isoOf(now);
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);

  // 1) Begrüßung nach Uhrzeit + Datum
  const h = now.getHours();
  const greeting = h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend';
  const greetCard = el('div', { class: 'card p24 heute-greet' },
    el('div', { class: 'heute-greet-title' }, greeting),
    el('div', { class: 'heute-greet-date' },
      now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
  );

  // 2) Heutige Habits — Tag-Index = Tagesdifferenz seit startDate, gültig 0..65
  const habits = g.habits || [];
  const todaysHabits = habits
    .map((hab) => {
      const start = new Date((hab.startDate || today) + 'T00:00:00');
      const idx = Math.round((midnight - start) / 86400000);
      return { hab, idx };
    })
    .filter(({ idx }) => idx >= 0 && idx <= 65);

  function toggleHabitToday(hab, idx) {
    const next = g.habits.map((x) =>
      x.id === hab.id ? { ...x, days: x.days.map((v, j) => (j === idx ? !v : v)) } : x);
    setGlobal({ habits: next }, 'Habit Tracker aktualisiert');
    sendEvent('habit_checked', { habitId: hab.id, idx });
    render();
  }

  const habitsCard = el('div', { class: 'card p24' },
    el('div', { class: 'card-title' }, 'Heutige Habits'),
    todaysHabits.length === 0
      ? el('div', { class: 'card-sub', style: 'margin-top:8px;' }, 'Für heute stehen keine aktiven Habits an.')
      : el('div', { class: 'heute-habit-list' },
        todaysHabits.map(({ hab, idx }) => {
          const done = !!(hab.days && hab.days[idx]);
          return el('div', { class: 'heute-habit-row' },
            el('span', { class: 'heute-habit-name' }, hab.name || 'Habit'),
            el('button', {
              class: 'heute-check' + (done ? ' done' : ''),
              title: done ? 'Als offen markieren' : 'Als erledigt markieren',
              onClick: () => toggleHabitToday(hab, idx),
            }, done ? '✓' : ''),
          );
        }),
      ),
  );

  // 3) Heute clean? — dieselbe Logik wie im Frei-Tab
  const F = g.frei || {};
  const log = F.log || {};
  const cleanVal = log[today];
  function markToday(status) {
    const next = { ...log };
    if (log[today] === status) delete next[today]; else next[today] = status;
    setFrei({ log: next }, 'Freiheit & Kontrolle aktualisiert');
    sendEvent('frei_day_marked', { date: today, status: next[today] || null });
    render();
  }
  const cleanCard = el('div', { class: 'card p24' },
    el('div', { class: 'card-title' }, 'Heute clean?'),
    cleanVal
      ? el('div', { class: 'heute-clean-status' },
        el('span', { class: 'heute-clean-badge ' + cleanVal },
          cleanVal === 'clean' ? '✓ Heute clean' : 'Rückfall eingetragen'),
        el('button', { class: 'link-btn', onClick: () => markToday(cleanVal) }, 'Ändern'),
      )
      : el('div', { class: 'frei-checkin-row', style: 'margin-bottom:0;' },
        el('button', { class: 'frei-checkin-btn clean', onClick: () => markToday('clean') }, 'Clean ✓'),
        el('button', { class: 'frei-checkin-btn fall', onClick: () => markToday('fall') }, 'Rückfall'),
      ),
  );

  // 4) Aktuelle Challenge — die nächste offene in Reihenfolge (kein KW-Bezug)
  const weekCh = CHALLENGES.find((c) => c.id === currentChallengeId(g));
  const chState = weekCh && ((g.challenges || {})[weekCh.id] || { done: false });
  const challengeCard = weekCh && el('button', {
    class: 'card p24 heute-challenge' + (chState.done ? ' done' : ''),
    onClick: () => openBook('wehrle'),
  },
    el('div', { class: 'heute-challenge-label' }, 'AKTUELLE CHALLENGE'),
    el('div', { class: 'heute-challenge-title' }, weekCh.title),
    el('div', { class: 'heute-challenge-status' },
      chState.done ? '✓ Erledigt' : 'Noch offen — antippen zum Öffnen'),
  );

  // 4b) Bücher — nächste offene Buch-Aufgabe, bewusst dezent (nur wenn vorhanden)
  const openBookTasks = BOOKS.filter((b) => b.mode === 'tasks')
    .flatMap((b) => ((g.bookTasks || {})[b.id] || []).filter((t) => !t.done).map((t) => ({ b, t })));
  const bookCard = openBookTasks.length > 0 && el('button', {
    class: 'card p24 heute-challenge heute-book',
    onClick: () => openBook(openBookTasks[0].b.id),
  },
    el('div', { class: 'heute-challenge-label heute-book-label' }, 'AUS DEINEM BUCH'),
    el('div', { class: 'heute-challenge-title' }, openBookTasks[0].t.title),
    el('div', { class: 'heute-challenge-status' },
      openBookTasks[0].b.title + ' · ' + openBookTasks.length +
      (openBookTasks.length === 1 ? ' offene Aufgabe' : ' offene Aufgaben')),
  );

  // 5) Dankbarkeit — dieselbe Logik wie im Frei-Tab
  const dankCard = el('div', { class: 'card p24' },
    el('div', { class: 'card-title' }, 'Dankbarkeit'),
    el('input', {
      class: 'heute-dank-input', type: 'text',
      placeholder: 'Wofür bist du heute dankbar?',
      value: (F.dank || {})[today] || '',
      onChange: (ev) => {
        setFrei({ dank: { ...(F.dank || {}), [today]: ev.target.value } }, 'Dankbarkeit bearbeitet');
        sendEvent('frei_dank_edited', { date: today });
      },
    }),
  );

  return el('div', { class: 'heute-stack' },
    greetCard, habitsCard, cleanCard, challengeCard, bookCard, dankCard);
}

function renderDashboard() {
  const s = state.doc;
  const weakest = weakestArea();

  const greeting = el('div', { class: 'dash-greeting' },
    el('div', { class: 'dash-greeting-title' }, greetingText()),
    el('div', { class: 'dash-greeting-date' },
      new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
  );

  refs.radar = buildRadar(true);
  refs.avg = el('span', { class: 'avg-num' }, avgScoreText());

  const radarCard = el('div', { class: 'card p28 radar-card radar-card-slot' },
    el('div', { class: 'card-title' }, 'Wie rund läuft dein Leben?'),
    el('div', { class: 'card-sub' }, 'Dein Ist-Zustand auf einer Skala von 1–10'),
    refs.radar,
    el('div', { class: 'avg-row' },
      refs.avg,
      el('span', { class: 'avg-caption' }, 'Ø Gesamtzufriedenheit'),
    ),
  );

  refs.weakCircle = el('div', { class: 'weakest-circle', style: 'background:' + weakest.color + ';' }, String(s.scores[weakest.id]));
  refs.weakName = el('div', { class: 'weakest-name' }, weakest.name);

  const coachCard = el('div', { class: 'card p28 coach-card' },
    el('div', { class: 'card-title' }, 'Deine Baustelle'),
    el('div', { class: 'coach-text' }, 'Das Netzdiagramm zeigt dir gnadenlos, wo du hinterherhinkst. Ein Bereich auf 5 oder 6 zieht dein ganzes Leben nach unten — dort liegt dein größter Hebel.'),
    el('div', { class: 'weakest-box' },
      refs.weakCircle,
      el('div', {},
        refs.weakName,
        el('div', { class: 'weakest-sub' }, 'Dein aktuell schwächster Bereich — Kandidat für deinen Jahresfokus.'),
      ),
    ),
    el('button', { class: 'btn-primary', onClick: () => selectTab('fokus') }, 'Jahresfokus festlegen →'),
  );

  refs.areaCircles = {};
  const areaCards = AREAS.map((a) => {
    const score = s.scores[a.id] || 1;
    const circle = el('div', { class: 'area-circle', style: 'background:' + a.color + ';' }, String(score));
    refs.areaCircles[a.id] = circle;
    return el('div', { class: 'card p24 area-card' },
      el('div', { class: 'area-head' },
        circle,
        el('div', { class: 'area-name' }, a.name),
        s.focus.includes(a.id) && el('span', { class: 'fokus-badge', style: 'color:' + a.color + ';' }, 'FOKUS'),
      ),
      el('div', { class: 'range-row' },
        el('span', { class: 'range-end' }, '1'),
        rangeSlider({
          value: score,
          onInput: (ev) => {
            s.scores[a.id] = Number(ev.target.value);
            updateScoreVisuals(a);
          },
          onChange: (ev) => {
            s.scores[a.id] = Number(ev.target.value);
            setDoc({ scores: s.scores }, 'Lebensbereich-Bewertung geändert');
            sendEvent('score_changed', { year: state.year, area: a.id, value: s.scores[a.id] });
          },
        }),
        el('span', { class: 'range-end' }, '10'),
      ),
      el('div', {},
        el('div', { class: 'vision-label', style: 'color:' + a.color + ';' }, 'MEINE 10 VON 10'),
        mdField({
          rows: 4, placeholder: a.placeholder, value: s.visions[a.id] || '',
          title: 'Vision: ' + a.name,
          onCommit: (v) => {
            s.visions[a.id] = v;
            setDoc({ visions: s.visions }, '„10 von 10“-Vision bearbeitet');
            sendEvent('vision_edited', { year: state.year, area: a.id });
          },
        }),
      ),
    );
  });

  return el('div', { class: 'screen', 'data-screen-label': 'Dashboard' },
    greeting,
    el('div', { class: 'grid-top' }, radarCard, coachCard),
    el('h2', { class: 'section-h2' }, 'Die 6 Lebensbereiche'),
    el('div', { class: 'section-sub' }, 'Bewerte deinen Ist-Zustand und beschreibe ausführlich deine „10 von 10" — den absoluten Idealzustand.'),
    el('div', { class: 'grid-areas' }, areaCards),
  );
}

// ---------- Fokus & Ziele ----------
function renderFokus() {
  const s = state.doc;
  const focusChips = AREAS.map((a) => {
    const on = s.focus.includes(a.id);
    const full = !on && s.focus.length >= MAX_FOKUS;
    return el('button', {
      class: 'fokus-chip' + (on ? ' active' : '') + (full ? ' full' : ''),
      style: on ? 'background:' + a.color + ';border-color:' + a.color + ';' : '',
      onClick: () => {
        if (on) {
          s.focus = s.focus.filter((f) => f !== a.id);
        } else if (!full) {
          s.focus = [...s.focus, a.id];
        } else {
          return;
        }
        setDoc({ focus: s.focus }, 'Jahresfokus angepasst');
        sendEvent('focus_toggled', { year: state.year, area: a.id, on: !on });
        render();
      },
    }, (on ? '✓ ' : '') + a.name);
  });

  const atLimit = s.focus.length >= MAX_FOKUS;
  const hint = el('div', {
    class: 'fokus-hint',
    style: 'color:' + (atLimit ? '#81C995' : '#9AA0A6') + ';',
  }, atLimit
    ? 'Limit erreicht — mehr Fokus geht nicht. Genau richtig so.'
    : (s.focus.length + ' von ' + MAX_FOKUS + ' Fokus-Bereichen gewählt.'));

  const focusCards = AREAS.filter((a) => s.focus.includes(a.id)).map((a) => {
    const startScore = s.scores[a.id] ?? 5;
    const endScore = (s.endScores || {})[a.id] ?? startScore;
    return el('div', { class: 'card p28 fokus-goal-card' },
      el('div', { class: 'fokus-goal-head' },
        el('div', { class: 'fokus-goal-dot', style: 'background:' + a.color + ';' }),
        el('div', { class: 'fokus-goal-title' }, 'Ziele: ' + a.name),
      ),
      el('div', { class: 'fokus-goal-sub' }, 'Konkret, messbar, verbindlich. Keine Wünsche — Verpflichtungen.'),
      mdField({
        rows: 5, placeholder: a.goalPlaceholder, value: s.goals[a.id] || '',
        title: 'Ziele: ' + a.name,
        onCommit: (v) => {
          s.goals[a.id] = v;
          setDoc({ goals: s.goals }, 'Jahresziel bearbeitet');
          sendEvent('goal_edited', { year: state.year, area: a.id });
        },
      }),
      el('div', { class: 'fokus-reflexion' },
        el('div', { class: 'fokus-reflexion-head' },
          el('div', { class: 'fokus-reflexion-title' }, 'Reflexion: Was lief wirklich?'),
          el('div', { class: 'fokus-endscore-row' },
            el('span', { class: 'range-end' }, '1'),
            rangeSlider({
              value: endScore,
              onChange: (ev) => {
                s.endScores = s.endScores || {};
                s.endScores[a.id] = Number(ev.target.value);
                setDoc({ endScores: s.endScores }, 'Reflexions-Score geändert');
                sendEvent('end_score_changed', { year: state.year, area: a.id, value: s.endScores[a.id] });
                render();
              },
            }),
            el('span', { class: 'range-end' }, '10'),
            el('div', { class: 'fokus-endscore-val', style: 'color:' + a.color + ';' },
              String(endScore) + ' ',
              el('span', { class: 'fokus-startscore' }, '(' + startScore + ')'),
            ),
          ),
        ),
        el('div', { class: 'fokus-reflexion-hint' }, 'Sei ehrlicher zu dir, als dir lieb ist. Kein „Gescheitert" — nur „noch nicht erreicht".'),
        mdField({
          rows: 4, placeholder: 'Was hast du dir vorgenommen? Was ist tatsächlich passiert? Keine Ausreden.',
          value: (s.reflexions || {})[a.id] || '',
          title: 'Reflexion: ' + a.name,
          onCommit: (v) => {
            s.reflexions = s.reflexions || {};
            s.reflexions[a.id] = v;
            setDoc({ reflexions: s.reflexions }, 'Reflexion bearbeitet');
            sendEvent('reflexion_edited', { year: state.year, area: a.id });
          },
        }),
      ),
    );
  });

  const noFocus = s.focus.length === 0
    && emptyState(
      '🎯',
      'Wähle deine ' + MAX_FOKUS + ' Fokus-Bereiche',
      'Weniger ist mehr: Konzentriere dich dieses Jahr auf maximal zwei Lebensbereiche.',
    );

  return el('div', { class: 'screen fokus-screen', 'data-screen-label': 'Fokus und Jahresziele' },
    el('h2', { class: 'section-h2' }, 'Jahresfokus ' + state.year),
    el('div', { class: 'section-sub' },
      'Wer sechs Baustellen gleichzeitig angeht, schafft keine. Wähle maximal ' + MAX_FOKUS + ' Schwerpunkt-Bereiche für dieses Jahr — der Rest läuft im Erhaltungsmodus weiter.'),
    el('div', { class: 'fokus-chips' }, focusChips),
    hint,
    focusCards,
    noFocus,
  );
}

// ---------- Freiheit & Kontrolle (ersetzt den früheren Platzhalter-Tab) ----------
const FREI_SUBTABS = [
  { id: 'tagebuch', label: '📓 Tagebuch' },
  { id: 'urge', label: '⚡ Urge-Tracker' },
  { id: 'generell', label: '🧭 Generell' },
];
// Werte-Anker für „Mein Warum" (antippbare Chips)
const WHY_VALUES = [
  'Nähe zu meiner Frau', 'Ehrlichkeit', 'Selbstrespekt', 'Klarer Kopf',
  'Präsenz', 'Vertrauen', 'Energie für meine Ziele', 'Freiheit',
  'Stolz', 'Ruhiger Schlaf', 'Echte Verbindung', 'Selbstkontrolle',
  'Vorbild sein', 'Zeit', 'Innerer Frieden', 'Disziplin',
];
const HALT_ITEMS = [
  { k: 'h', label: 'Hungry — hungrig?' },
  { k: 'a', label: 'Angry — wütend?' },
  { k: 'l', label: 'Lonely — einsam?' },
  { k: 't', label: 'Tired — müde?' },
];

function isoOf(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function selectFreiTab(id) {
  state.global.freiTab = id;
  render();
}

function goodDate(iso) {
  return new Date(iso + 'T00:00:00');
}

function renderFreiTagebuch() {
  const g = state.global;
  const F = g.frei;
  const log = F.log || {};
  const urges = F.urges || [];
  const today = isoOf(new Date());
  // Nach einem Tageswechsel (00:00) immer automatisch auf den aktuellen Tag springen,
  // damit keine Einträge versehentlich beim gestrigen Datum landen. Zurückblättern in der
  // Vergangenheit bleibt möglich; über Mitternacht hinweg wird die Auswahl wieder auf heute gesetzt.
  if (g.freiSelDate && g.freiSelDate < today) g.freiSelDate = today;
  const selDate = g.freiSelDate || today;
  const dayMs = 86400000;

  // Kalender ein-/ausklappbar: Default offen auf Desktop, zugeklappt auf schmalen Screens
  if (g.freiCalOpen === undefined) g.freiCalOpen = window.innerWidth > 720;
  const calOpen = g.freiCalOpen;

  // Statistiken
  const dates = Object.keys(log).sort();
  const total = dates.length;
  const cleanCount = dates.filter((d) => log[d] === 'clean').length;
  const quote = total ? Math.round((cleanCount / total) * 100) + '%' : '—';
  let run = 0;
  for (let t = new Date(today).getTime(); ; t -= dayMs) {
    const k = new Date(t).toISOString().slice(0, 10);
    if (log[k] === 'clean') run++;
    else if (log[k] === 'fall') break;
    else if (k !== today) break;
  }
  let best = 0, cur = 0, prev = null;
  for (const d of dates) {
    if (log[d] === 'clean') {
      cur = prev && (new Date(d).getTime() - new Date(prev).getTime() === dayMs) && log[prev] === 'clean' ? cur + 1 : 1;
      if (cur > best) best = cur;
    } else cur = 0;
    prev = d;
  }
  if (run > best) best = run;

  const statCard = (val, label, color) => el('div', { class: 'frei-stat-card' },
    el('div', { class: 'frei-stat-val', style: 'color:' + color + ';' }, val),
    el('div', { class: 'frei-stat-label' }, label),
  );

  // Kalender
  const now = new Date();
  const calY = g.freiCalYear ?? now.getFullYear();
  const calM = g.freiCalMonth ?? now.getMonth();
  const urgesByDate = {};
  for (const u of urges) (urgesByDate[u.date] = urgesByDate[u.date] || []).push(u);
  const todayD = new Date(); todayD.setHours(0, 0, 0, 0);

  const cells = buildMonthCells(calY, calM).map((date) => {
    if (!date) return el('div', {});
    const iso = isoOf(date);
    const status = log[iso];
    const isFuture = date.getTime() > todayD.getTime();
    const isToday = isSameDate(date, todayD);
    const isSel = iso === selDate;
    return el('button', {
      class: 'frei-cal-cell'
        + (status === 'clean' ? ' clean' : status === 'fall' ? ' fall' : '')
        + (isFuture ? ' future' : '') + (isSel ? ' selected' : '') + (isToday ? ' today' : ''),
      title: date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
        + (status === 'clean' ? ' · clean' : status === 'fall' ? ' · Rückfall' : ''),
      onClick: () => {
        if (!isFuture) {
          g.freiSelDate = iso;
          render();
          // Nach dem Re-Render sanft zur Tageskarte scrollen, damit die Auswahl sofort sichtbar ist
          setTimeout(() => document.getElementById('frei-day-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
        }
      },
    },
      String(date.getDate()),
      urgesByDate[iso] && el('span', { class: 'frei-cal-urge-dot' }),
    );
  });
  const weeks = [];
  for (let w = 0; w < cells.length; w += 7) weeks.push(el('div', { class: 'frei-cal-week' }, cells.slice(w, w + 7)));

  const calCard = el('div', { class: 'card p24 frei-cal-card' },
    el('div', { class: 'frei-cal-head' },
      el('button', {
        class: 'frei-cal-title frei-cal-toggle' + (calOpen ? ' open' : ''),
        onClick: () => { g.freiCalOpen = !calOpen; render(); },
      }, el('span', { class: 'frei-cal-caret' }, calOpen ? '▾' : '▸'), 'Verlauf — Tag antippen zum Zurückblättern'),
      calOpen && el('div', { class: 'cal-nav' },
        el('button', {
          class: 'cal-nav-btn', onClick: () => {
            const m = calM - 1;
            g.freiCalMonth = (m + 12) % 12; g.freiCalYear = m < 0 ? calY - 1 : calY;
            render();
          },
        }, '‹'),
        el('div', { class: 'cal-nav-label' }, new Date(calY, calM, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })),
        el('button', {
          class: 'cal-nav-btn', onClick: () => {
            const m = calM + 1;
            g.freiCalMonth = m % 12; g.freiCalYear = m > 11 ? calY + 1 : calY;
            render();
          },
        }, '›'),
      ),
    ),
    calOpen && el('div', { class: 'frei-cal-weekdays' }, WEEKDAYS.map((wd) => el('div', { class: 'frei-cal-weekday' }, wd))),
    calOpen && el('div', { class: 'frei-cal-weeks' }, weeks),
    calOpen && el('div', { class: 'frei-cal-legend' },
      el('span', {}, el('span', { class: 'frei-legend-dot', style: 'background:#81C995;' }), 'Clean'),
      el('span', {}, el('span', { class: 'frei-legend-dot', style: 'background:#FDD663;' }), 'Rückfall'),
      el('span', {}, el('span', { class: 'frei-legend-dot round', style: 'background:#C58AF9;' }), 'Urge gemeldet'),
    ),
  );

  // Ausgewählter Tag
  const selD = goodDate(selDate);
  const selVal = log[selDate];
  const selUrges = urgesByDate[selDate] || [];

  const dayCard = el('div', { class: 'card p24 frei-day-card', id: 'frei-day-card' },
    el('div', { class: 'frei-day-head' },
      el('div', { class: 'frei-day-label' },
        selD.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + (selDate === today ? ' · Heute' : '')),
      selDate !== today && el('button', {
        class: 'frei-today-btn',
        onClick: () => { g.freiSelDate = today; g.freiCalYear = now.getFullYear(); g.freiCalMonth = now.getMonth(); render(); },
      }, 'Zu heute springen'),
    ),
    el('div', { class: 'frei-day-sub' }, 'Check-in, Dankbarkeit und Tagebuch für diesen Tag.'),
    el('div', { class: 'frei-checkin-row' },
      el('button', {
        class: 'frei-checkin-btn clean' + (selVal === 'clean' ? ' active' : ''),
        onClick: () => {
          const next = { ...log };
          if (selVal === 'clean') delete next[selDate]; else next[selDate] = 'clean';
          setFrei({ log: next }, 'Freiheit & Kontrolle aktualisiert');
          sendEvent('frei_day_marked', { date: selDate, status: next[selDate] || null });
          render();
        },
      }, '✓ Clean'),
      el('button', {
        class: 'frei-checkin-btn fall' + (selVal === 'fall' ? ' active' : ''),
        onClick: () => {
          const next = { ...log };
          if (selVal === 'fall') delete next[selDate]; else next[selDate] = 'fall';
          setFrei({ log: next }, 'Freiheit & Kontrolle aktualisiert');
          sendEvent('frei_day_marked', { date: selDate, status: next[selDate] || null });
          render();
        },
      }, 'Rückfall — ehrlich eintragen'),
    ),
    selVal === 'fall' && el('div', { class: 'frei-fall-hint' },
      'Ein Rückfall ist ein Datenpunkt, kein Urteil. Melde den Urge im ',
      el('button', { class: 'link-btn', onClick: () => selectFreiTab('urge') }, '⚡ Urge-Tracker'),
      ' — mit Situation, Uhrzeit, Gerät und Gefühl davor. So findest du die Lücke im System.'),
    el('div', { class: 'frei-field' },
      el('div', { class: 'frei-field-label', style: 'color:#81C995;' }, 'DANKBARKEIT — 3 DINGE, TÄGLICH'),
      mdField({
        rows: 3, placeholder: 'Drei Dinge, für die du heute dankbar bist …',
        value: (F.dank || {})[selDate] || '',
        title: 'Dankbarkeit · ' + selDate,
        onCommit: (v) => {
          setFrei({ dank: { ...(F.dank || {}), [selDate]: v } }, 'Dankbarkeit bearbeitet');
          sendEvent('frei_dank_edited', { date: selDate });
        },
      }),
    ),
    el('div', {},
      el('div', { class: 'frei-field-label', style: 'color:#8AB4F8;' }, 'TAGEBUCH — WIE WAR DER TAG?'),
      mdField({
        rows: 5, placeholder: 'Wie war dein Tag? Zwei Sätze reichen.',
        value: (F.diary || {})[selDate] || '',
        title: 'Tagebuch · ' + selDate,
        onCommit: (v) => {
          setFrei({ diary: { ...(F.diary || {}), [selDate]: v } }, 'Tagebuch bearbeitet');
          sendEvent('frei_diary_edited', { date: selDate });
        },
      }),
    ),
    selUrges.length > 0 && el('div', { class: 'frei-day-urge-note' },
      '⚡ ' + selUrges.length + ' Urge(s) an diesem Tag gemeldet — Details im ',
      el('button', { class: 'link-btn', onClick: () => selectFreiTab('urge') }, 'Urge-Tracker')),
  );

  return el('div', {},
    dayCard,
    el('div', { class: 'frei-stats-grid' },
      statCard(quote, 'Erfolgsquote', '#81C995'),
      statCard(String(run), 'Aktuelle Serie', '#8AB4F8'),
      statCard(String(best), 'Beste Serie', '#C58AF9'),
      statCard(String(total), 'Tage getrackt', '#E3E3E3'),
    ),
    calCard,
  );
}

function renderFreiUrge() {
  const g = state.global;
  const F = g.frei;
  const urges = F.urges || [];
  const today = isoOf(new Date());
  const d = state.urgeDraft;

  function setD(patch) {
    state.urgeDraft = Object.assign({}, state.urgeDraft, patch);
    render();
  }

  const soforthilfe = el('div', { class: 'card p24 frei-sos-card' },
    el('div', { class: 'frei-sos-title' }, '🚨 Bei akutem Drang — zuerst das'),
    collapsibleInfo('ℹ️ So funktioniert die 3-Sekunden-Regel',
      el('div', { class: 'frei-sos-text' },
        el('b', { style: 'color:#E3E3E3;' }, '3-Sekunden-Regel:'),
        ' Riskanter Gedanke oder Bild? Innerhalb von 3 Sekunden bewusst wegdrehen — danach hat der Autopilot übernommen. Dann Energie umleiten:')),
    el('div', { class: 'frei-sos-chips' },
      el('span', { class: 'frei-sos-chip' }, '🏋️ Sport / Liegestütze'),
      el('span', { class: 'frei-sos-chip' }, '🌲 Raus in die Natur'),
      el('span', { class: 'frei-sos-chip' }, '🚿 Kalte Dusche'),
      el('span', { class: 'frei-sos-chip' }, '📞 Buddy anrufen'),
    ),
  );

  const dHalt = (d && d.halt) || {};
  const haltOn = HALT_ITEMS.filter((x) => dHalt[x.k]);
  const haltRow = el('div', { class: 'frei-halt-row' },
    HALT_ITEMS.map((x) => el('button', {
      class: 'frei-halt-chip' + (dHalt[x.k] ? ' active' : ''),
      onClick: () => setD({ halt: { ...dHalt, [x.k]: !dHalt[x.k] } }),
    }, (dHalt[x.k] ? '✓ ' : '') + x.label)),
  );
  const haltHint = haltOn.length
    ? 'Der Drang ist oft nur ein verkleidetes Grundbedürfnis. Kümmere dich zuerst darum: ' + haltOn.map((x) => x.label.split(' — ')[0]).join(', ') + '.'
    : 'Alle vier verneint? Dann ist es die Suchtstimme — 3-Sekunden-Regel anwenden und Sofort-Aktion wählen.';

  const isEdit = d && urges.some((x) => x.id === d.id);

  const form = d && el('div', { class: 'card frei-urge-form' },
    el('div', { class: 'frei-urge-form-head' },
      el('div', { class: 'frei-urge-form-title' }, '⚡ ' + (isEdit ? 'Urge bearbeiten' : 'Urge protokollieren')),
      el('button', { class: 'icon-btn-round', onClick: () => { state.urgeDraft = null; render(); } }, '✕'),
    ),
    el('div', { class: 'frei-field-label' }, 'WIE IST ES AUSGEGANGEN?'),
    el('div', { class: 'frei-outcome-row' },
      el('button', {
        class: 'frei-checkin-btn clean' + (d.outcome === 'res' ? ' active' : ''),
        onClick: () => setD({ outcome: 'res' }),
      }, '✓ Widerstanden'),
      el('button', {
        class: 'frei-checkin-btn fall' + (d.outcome === 'gave' ? ' active' : ''),
        onClick: () => setD({ outcome: 'gave' }),
      }, 'Nachgegeben — ehrlich eintragen'),
    ),
    el('div', { class: 'frei-grid-2' },
      el('div', {},
        el('div', { class: 'frei-field-label' }, 'UHRZEIT'),
        el('input', {
          type: 'time', class: 'habit-input', value: d.time,
          onChange: (ev) => setD({ time: ev.target.value }),
        }),
      ),
      (() => {
        const intensityVal = el('span', { class: 'frei-intensity-val' }, String(d.intensity));
        return el('div', {},
          el('div', { class: 'frei-field-label' }, 'INTENSITÄT DES DRANGS'),
          el('div', { class: 'frei-intensity-row' },
            el('span', { class: 'range-end' }, '1'),
            rangeSlider({
              value: d.intensity,
              onInput: (ev) => { intensityVal.textContent = ev.target.value; },
              onChange: (ev) => setD({ intensity: Number(ev.target.value) }),
            }),
            el('span', { class: 'range-end' }, '10'),
            intensityVal,
          ),
        );
      })(),
    ),
    el('div', { class: 'frei-grid-2' },
      el('div', {},
        el('div', { class: 'frei-field-label' }, 'SITUATION'),
        mdField({
          rows: 2, placeholder: 'z. B. allein zuhause, gelangweilt', value: d.situation,
          title: 'Situation',
          onCommit: (v) => setD({ situation: v }),
        }),
      ),
      el('div', {},
        el('div', { class: 'frei-field-label' }, 'GERÄT'),
        mdField({
          rows: 2, placeholder: 'z. B. Handy im Bett', value: d.geraet,
          title: 'Gerät',
          onCommit: (v) => setD({ geraet: v }),
        }),
      ),
    ),
    el('div', { class: 'frei-field-label', style: 'color:#8AB4F8;' }, 'HALT-CHECK: WAS IST GERADE WIRKLICH LOS?'),
    haltRow,
    el('div', { class: 'frei-halt-hint', style: 'color:' + (haltOn.length ? '#FDD663' : '#9AA0A6') + ';' }, haltHint),
    el('label', { class: 'frei-umgebung-check' },
      el('input', {
        type: 'checkbox', checked: !!d.umgebung,
        onChange: (ev) => setD({ umgebung: ev.target.checked }),
      }),
      'Umgebungs-Check: Filter aktiv, Trigger minimiert (Handy nachts raus, kein zielloses Surfen)',
    ),
    d.outcome === 'gave' && el('div', { class: 'frei-rueckfall-box' },
      el('div', { class: 'frei-field-label', style: 'color:#FDD663;' }, 'RÜCKFALL-ANALYSE — NEUTRALER DATENPUNKT'),
      el('div', { class: 'frei-rueckfall-sub' }, 'Wo war die Lücke im System? Keine Selbstvorwürfe — nur Daten, die dir helfen, das System zu verbessern.'),
      el('div', { class: 'frei-grid-2' },
        el('div', {},
          el('div', { class: 'frei-field-label' }, 'GEFÜHL / KURZ DAVOR'),
          mdField({
            rows: 2, placeholder: 'z. B. gestresst, einsam, Streit gehabt', value: d.gefuehl,
            title: 'Gefühl kurz davor',
            onCommit: (v) => setD({ gefuehl: v }),
          }),
        ),
        el('div', {},
          el('div', { class: 'frei-field-label' }, 'WAS HÄTTE GEHOLFEN?'),
          mdField({
            rows: 2, placeholder: 'z. B. Handy nicht mit ins Bett, früher schlafen', value: d.hilfe,
            title: 'Was hätte geholfen?',
            onCommit: (v) => setD({ hilfe: v }),
          }),
        ),
      ),
    ),
    d.outcome === 'res' && el('div', {},
      el('div', { class: 'frei-field-label', style: 'color:#81C995;' }, 'WAS HAT GEHOLFEN?'),
      mdField({
        rows: 2, placeholder: 'z. B. kalte Dusche, rausgegangen, Buddy angerufen, 3-Sekunden-Regel', value: d.hilfe,
        title: 'Was hat geholfen?',
        onCommit: (v) => setD({ hilfe: v }),
      }),
    ),
    el('div', { class: 'frei-urge-actions' },
      el('button', {
        class: 'btn-primary', onClick: () => {
          const entryDate = isEdit ? d.date : today;
          const urgesNext = isEdit
            ? urges.map((x) => (x.id === d.id ? { ...d, date: entryDate } : x))
            : [...urges, { id: Date.now(), date: today, ...d }];
          const patch = { urges: urgesNext };
          if (d.outcome === 'gave') patch.log = { ...(F.log || {}), [entryDate]: 'fall' };
          state.urgeDraft = null;
          // Reines UI-Feedback nach dem Speichern (nichts Neues gespeichert):
          if (d.outcome === 'res') {
            state.urgeCelebration = { n: urgesNext.filter((x) => x.outcome === 'res').length };
            state.urgeGaveNote = false;
          } else {
            state.urgeGaveNote = true;
            state.urgeCelebration = null;
          }
          setFrei(patch, 'Urge protokolliert');
          sendEvent('urge_logged', { outcome: d.outcome, intensity: d.intensity, date: entryDate });
          render();
        },
      }, 'Speichern'),
      el('button', {
        class: 'sheet-btn-cancel frei-cancel-btn',
        onClick: () => { state.urgeDraft = null; render(); },
      }, 'Abbrechen'),
    ),
  );

  const openBtn = !d && el('button', {
    class: 'btn-primary frei-urge-open-btn',
    onClick: () => {
      state.urgeGaveNote = false;
      const n = new Date();
      state.urgeDraft = {
        outcome: 'res', intensity: 5, halt: {}, umgebung: false,
        time: String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'),
        situation: '', geraet: '', gefuehl: '', hilfe: '',
      };
      render();
    },
  }, '⚡ Urge melden');

  // Urge-Verlauf
  const fmtUrgeDay = (iso) => {
    const dd = goodDate(iso);
    const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
    const diff = Math.round((todayD - dd) / 86400000);
    const str = dd.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (diff === 0) return 'Heute · ' + str;
    if (diff === 1) return 'Gestern · ' + str;
    return str;
  };
  const sorted = [...urges].sort((a, b) => (b.date + 'T' + (b.time || '')).localeCompare(a.date + 'T' + (a.time || '')) || (b.id - a.id));
  const urgeDaysMap = [];
  for (const u of sorted) {
    let grp = urgeDaysMap.find((x) => x.date === u.date);
    if (!grp) { grp = { date: u.date, label: fmtUrgeDay(u.date), items: [] }; urgeDaysMap.push(grp); }
    const parts = [];
    if (u.situation) parts.push('Situation: ' + u.situation);
    if (u.geraet) parts.push('Gerät: ' + u.geraet);
    if (u.gefuehl) parts.push('Gefühl davor: ' + u.gefuehl);
    if (u.hilfe) parts.push((u.outcome === 'gave' ? 'Hätte geholfen: ' : 'Geholfen: ') + u.hilfe);
    const haltStr = ['h', 'a', 'l', 't'].filter((k) => (u.halt || {})[k]).map((k) => k.toUpperCase()).join('');
    grp.items.push({
      u,
      time: u.time || '—',
      badge: u.outcome === 'gave' ? 'Nachgegeben' : '✓ Widerstanden',
      meta: [
        u.intensity ? 'Intensität ' + u.intensity + '/10' : null,
        haltStr ? 'HALT: ' + haltStr : null,
        u.umgebung ? 'Umgebung ✓' : null,
      ].filter(Boolean).join(' · '),
      details: parts.join(' · '),
    });
  }

  const urgeList = urgeDaysMap.length === 0
    ? el('div', { class: 'log-empty' }, 'Noch keine Urges gemeldet. Jeder gemeldete Urge — widerstanden oder nicht — ist ein Datenpunkt, der dein System besser macht.')
    : urgeDaysMap.map((grp) => el('div', { class: 'frei-urge-day-group' },
        el('div', { class: 'frei-urge-day-label' }, grp.label),
        el('div', { class: 'frei-urge-items' },
          grp.items.map((it) => el('div', { class: 'frei-urge-item' },
            el('div', { class: 'frei-urge-item-row' },
              el('span', { class: 'frei-urge-time' }, it.time),
              el('span', { class: 'frei-urge-badge' + (it.u.outcome === 'gave' ? ' gave' : ' res') }, it.badge),
              el('span', { class: 'frei-urge-meta' }, it.meta),
              el('button', {
                class: 'frei-urge-icon-btn', title: 'Eintrag bearbeiten',
                onClick: () => { state.urgeDraft = { ...it.u }; render(); },
              }, '✎'),
              el('button', {
                class: 'frei-urge-icon-btn danger', title: 'Eintrag löschen',
                onClick: () => {
                  setFrei({ urges: urges.filter((x) => x.id !== it.u.id) }, 'Urge-Eintrag gelöscht');
                  sendEvent('urge_removed', { urgeId: it.u.id });
                  render();
                },
              }, '✕'),
            ),
            it.details && el('div', { class: 'frei-urge-details' }, it.details),
          )),
        ),
      ));

  return el('div', {},
    el('div', { class: 'frei-warn-banner' },
      el('b', {}, '„Nur ein kurzer Blick" ist eine Illusion.'),
      ' Er startet den gesamten Kreislauf neu. Es gibt keinen harmlosen Blick — nur die Entscheidung davor.'),
    soforthilfe,
    openBtn,
    form,
    (!d && state.urgeGaveNote) && el('div', { class: 'card frei-gave-note' },
      el('div', {}, 'Eingetragen. Ein Ausrutscher ist ein Datenpunkt, kein Urteil.'),
      (() => {
        const card = whyLetterCard();
        return card ? el('div', { class: 'frei-gave-why' }, card) : null;
      })()),
    el('div', { class: 'frei-urge-history-title' }, 'Gemeldete Urges'),
    urgeList,
  );
}

function renderFreiGenerell() {
  const g = state.global;
  const F = g.frei;

  function field(label, color, placeholder, key, rows) {
    return el('div', {},
      el('div', { class: 'frei-field-label', style: 'color:' + color + ';' }, label),
      mdField({
        rows, placeholder, value: F[key] || '',
        title: label,
        onCommit: (v) => {
          setFrei({ [key]: v }, 'Freiheit & Kontrolle bearbeitet');
          sendEvent('frei_field_edited', { field: key });
        },
      }),
    );
  }

  const circlesCard = el('div', { class: 'card p24' },
    el('div', { class: 'frei-card-title' }, 'Das 3-Kreise-Modell (Boundary-Planer)'),
    el('div', { class: 'frei-card-sub' }, 'Definiere deine Grenzen, solange du klar denkst — nicht erst im Drang.'),
    el('div', { class: 'frei-grid-3' },
      field('🔴 INNER CIRCLE — TABU', '#F28B82', 'z. B. Pornokonsum, bewusstes Suchen nach triggernden Inhalten', 'inner', 4),
      field('🟡 MIDDLE CIRCLE — VORSTUFEN', '#FDD663', 'z. B. zielloses Surfen spätabends, allein mit Laptop im Schlafzimmer, Social-Media-Doomscrolling', 'middle', 4),
      field('🟢 OUTER CIRCLE — STÄRKEND', '#81C995', 'z. B. Sport, Zeit mit meiner Frau, Lesen, früh schlafen, Hobbys', 'outer', 4),
    ),
    el('div', { class: 'frei-bookend' },
      field('BOOKENDING — RISKANTE SITUATIONEN VORAUSPLANEN', '#C58AF9', 'z. B. Geschäftsreise nächste Woche: Vorab-Check-in mit Buddy am Montag, Laptop bleibt abends im Koffer, Nachbesprechung am Freitag.', 'bookend', 3),
    ),
  );

  // ---- Werte-Anker (Chips) ----
  const selValues = Array.isArray(F.values) ? F.values : [];
  const toggleValue = (v) => {
    const next = selValues.includes(v) ? selValues.filter((x) => x !== v) : [...selValues, v];
    setFrei({ values: next }, 'Werte-Anker bearbeitet');
    sendEvent('frei_field_edited', { field: 'values' });
    render();
  };
  const valuesCard = el('div', { class: 'card p24' },
    el('div', { class: 'frei-card-title' }, 'Wofür ich das tue — meine Werte'),
    el('div', { class: 'frei-card-sub' }, 'Tippe an, was dir wirklich wichtig ist. Diese Anker erinnern dich im Drang daran, worum es eigentlich geht.'),
    el('div', { class: 'frei-chips' },
      WHY_VALUES.map((v) => el('button', {
        class: 'frei-chip' + (selValues.includes(v) ? ' active' : ''),
        onClick: () => toggleValue(v),
      }, v)),
    ),
  );

  // ---- Kosten ↔ Gewinn als Waage ----
  const scaleCard = el('div', { class: 'card p24' },
    el('div', { class: 'frei-card-title' }, 'Die Waage — was ich verliere gegen was ich gewinne'),
    el('div', { class: 'frei-card-sub' }, 'Zwei Seiten derselben Entscheidung. Schreib beide ehrlich voll — im Drang liest du hier, was auf dem Spiel steht.'),
    el('div', { class: 'frei-scale' },
      el('div', { class: 'frei-scale-pan cost' },
        el('div', { class: 'frei-scale-head' }, '⬇ Was mich Nachgeben kostet'),
        mdField({
          rows: 5, value: F.kosten || '',
          placeholder: 'z. B. Distanz zu meiner Frau, Brain Fog, verschwendete Abende, Scham am nächsten Morgen …',
          title: 'Was mich Nachgeben kostet',
          onCommit: (v) => { setFrei({ kosten: v }, 'Freiheit & Kontrolle bearbeitet'); sendEvent('frei_field_edited', { field: 'kosten' }); },
        }),
      ),
      el('div', { class: 'frei-scale-vs' }, 'vs.'),
      el('div', { class: 'frei-scale-pan gain' },
        el('div', { class: 'frei-scale-head' }, '⬆ Was ich zurückgewinne'),
        mdField({
          rows: 5, value: F.gewinn || '',
          placeholder: 'z. B. echte Nähe zu meiner Frau, klarer Kopf, Selbstrespekt, Zeit und Energie für meine Ziele …',
          title: 'Was ich zurückgewinne',
          onCommit: (v) => { setFrei({ gewinn: v }, 'Freiheit & Kontrolle bearbeitet'); sendEvent('frei_field_edited', { field: 'gewinn' }); },
        }),
      ),
    ),
  );

  // ---- Geführte Warum-Fragen ----
  const why = (F.why && typeof F.why === 'object') ? F.why : {};
  const whyField = (label, key, placeholder) => el('div', { class: 'frei-why-q' },
    el('div', { class: 'frei-why-q-label' }, label),
    mdField({
      rows: 2, value: why[key] || '', placeholder, title: label,
      onCommit: (v) => {
        setFrei({ why: { ...why, [key]: v } }, 'Warum-Frage beantwortet');
        sendEvent('frei_field_edited', { field: 'why.' + key });
      },
    }),
  );
  const questionsCard = el('div', { class: 'card p24' },
    el('div', { class: 'frei-card-title' }, 'Wenn der Drang kommt — frag dich das'),
    el('div', { class: 'frei-card-sub' }, 'Konkrete Fragen wirken stärker als ein leeres Feld. Beantworte sie jetzt, in Ruhe — dann sind die Antworten da, wenn du sie brauchst.'),
    whyField('Wer wird verletzt, wenn ich nachgebe — und wie merkt diese Person es?', 'hurt',
      'z. B. Meine Frau spürt die Distanz, auch wenn sie nicht weiß warum …'),
    whyField('Wie fühle ich mich morgen früh, wenn ich heute widerstanden habe?', 'morning',
      'z. B. Stolz, klar im Kopf, ich kann ihr in die Augen sehen …'),
    whyField('Was möchte mein Ich in 5 Jahren, dass ich jetzt tue?', 'future',
      'z. B. dass ich diesen Kampf ernst genommen und durchgezogen habe …'),
    whyField('Ein „nur einmal" — was löst es in Wahrheit aus?', 'ripple',
      'z. B. Es startet den ganzen Kreislauf neu: Scham, Verstecken, nächster Drang …'),
  );

  // ---- Brief an mein Drang-Ich ----
  const letterCard = el('div', { class: 'card p24 frei-letter-card' },
    el('div', { class: 'frei-card-title' }, '✉️ Brief an mein Drang-Ich'),
    el('div', { class: 'frei-card-sub' }, 'Schreib deinem schwächsten Moment eine Nachricht aus einem starken. Dieser Brief erscheint automatisch, wenn du einen Urge einträgst — beim Widerstehen und beim Nachgeben.'),
    mdField({
      rows: 6, value: F.letter || '',
      placeholder: 'z. B. Hey. Wenn du das liest, ist es gerade schwer. Aber du kennst das Gefühl danach — und das willst du nicht. Atme. Steh auf. Ruf sie an. In 20 Minuten ist der Drang vorbei und du bist stolz. Ich glaube an dich.',
      title: 'Brief an mein Drang-Ich',
      onCommit: (v) => { setFrei({ letter: v }, 'Brief ans Drang-Ich bearbeitet'); sendEvent('frei_field_edited', { field: 'letter' }); },
    }),
  );

  // ---- Beast entlarven (bleibt als eigenes Feld) ----
  const beastCard = el('div', { class: 'card p24' },
    el('div', { class: 'frei-card-title' }, 'Das „Beast" entlarven'),
    el('div', { class: 'frei-card-sub' }, 'Die Suchtstimme bin nicht ich. Schreib ihre Lügen auf — und deine rationale Antwort darauf.'),
    field('DIE LÜGE → MEINE ANTWORT', '#8AB4F8', '("Nur einmal noch" → Es gibt kein einmal. / "Du hast es verdient" → Ich verdiene Selbstrespekt, nicht das.)', 'beast', 4),
  );

  return el('div', {}, renderFreiStats(), circlesCard, valuesCard, scaleCard, questionsCard, letterCard, beastCard);
}

// Statistik-Karten für Freiheit → generell. Rein lesend aus global.frei — speichert nichts.
function renderFreiStats() {
  const F = state.global.frei || {};
  const log = F.log || {};
  const urges = F.urges || [];

  // ---- Karte 1: Jahres-Heatmap (GitHub-Contribution-Stil) ----
  const now = new Date();
  const year = now.getFullYear();
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayStr = fmt(now);

  // Erste Spalte beginnt am Montag der Woche des 1. Januar.
  const jan1 = new Date(year, 0, 1);
  const startOffset = (jan1.getDay() + 6) % 7; // Mo=0 … So=6
  const gridStart = new Date(year, 0, 1 - startOffset);

  const CELL = 10, GAP = 2, STEP = CELL + GAP, COLS = 53;
  const svgW = COLS * STEP - GAP;
  const svgH = 7 * STEP - GAP;
  const COLORS = { clean: '#81C995', fall: '#F28B82' };

  const cells = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < 7; r++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + c * 7 + r);
      let fill;
      if (d.getFullYear() > year || (d.getFullYear() === year && fmt(d) > todayStr)) fill = 'transparent';
      else if (d.getFullYear() < year) fill = 'transparent';
      else fill = COLORS[log[fmt(d)]] || '#2A2B2C';
      cells.push(svg('rect', {
        x: c * STEP, y: r * STEP, width: CELL, height: CELL, rx: 2, ry: 2, fill,
      }, svg('title', {}, `${fmt(d)}${log[fmt(d)] ? ' — ' + (log[fmt(d)] === 'clean' ? 'clean' : 'Rückfall') : ''}`)));
    }
  }
  const heatSvg = svg('svg', { width: svgW, height: svgH, viewBox: `0 0 ${svgW} ${svgH}`, style: 'display:block;' }, cells);

  const scroller = el('div', { style: 'overflow-x:auto;' }, heatSvg);
  // Aktuellen Monat initial sichtbar: nach rechts scrollen bis heute.
  const daysFromStart = Math.floor((now - gridStart) / 86400000);
  const curCol = Math.floor(daysFromStart / 7);
  requestAnimationFrame(() => { scroller.scrollLeft = Math.max(0, (curCol - 6) * STEP); });

  const heatCard = el('div', { class: 'card p24' },
    el('div', { class: 'frei-card-title' }, 'Statistik'),
    el('div', { class: 'frei-card-sub' }, `Jahres-Übersicht ${year} — grün = clean, rot = Rückfall.`),
    scroller,
  );

  // ---- Karte 2: Sieg-Quote ----
  const res = urges.filter((u) => u.outcome === 'res').length;
  const gave = urges.filter((u) => u.outcome === 'gave').length;
  const total = res + gave;
  let quoteBody;
  if (total === 0) {
    quoteBody = el('div', { class: 'frei-card-sub', style: 'margin-top:0;' }, 'Noch keine Urges protokolliert.');
  } else {
    const pct = Math.round((res / total) * 100);
    quoteBody = el('div', {},
      el('div', { style: 'margin-bottom:10px;' }, `${res} von ${total} Urges widerstanden — ${pct} %`),
      el('div', { style: 'display:flex;height:12px;border-radius:100px;overflow:hidden;background:#2A2B2C;' },
        el('div', { style: `width:${pct}%;background:#81C995;` }),
        el('div', { style: `width:${100 - pct}%;background:#F28B82;` }),
      ),
    );
  }
  const quoteCard = el('div', { class: 'card p24' },
    el('div', { class: 'frei-card-title' }, 'Sieg-Quote'),
    quoteBody,
  );

  // ---- Karte 3: Muster ----
  const counts = {};
  for (const u of urges) {
    const s = (u.situation || '').trim();
    if (s) counts[s] = (counts[s] || 0) + 1;
  }
  const topTriggers = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]);
  const intensities = urges.map((u) => Number(u.intensity)).filter((n) => !Number.isNaN(n));
  const avgInt = intensities.length ? (intensities.reduce((a, b) => a + b, 0) / intensities.length).toFixed(1) : null;

  const musterCard = el('div', { class: 'card p24' },
    el('div', { class: 'frei-card-title' }, 'Muster'),
    el('div', { style: 'margin-bottom:6px;' },
      'Häufigste Auslöser: ' + (topTriggers.length ? topTriggers.join(', ') : '—')),
    el('div', {}, 'Ø Intensität: ' + (avgInt != null ? avgInt : '—')),
  );

  return el('div', {}, heatCard, quoteCard, musterCard);
}

function renderFrei() {
  const g = state.global;
  const tab = g.freiTab || 'tagebuch';
  const tabsRow = el('div', { class: 'frei-subtabs' },
    FREI_SUBTABS.map((t) => el('button', {
      class: 'frei-subtab-btn' + (tab === t.id ? ' active' : ''),
      onClick: () => selectFreiTab(t.id),
    }, t.label)),
  );

  return el('div', { class: 'screen frei-screen', 'data-screen-label': 'Freiheit und Kontrolle' },
    el('h2', { class: 'section-h2', style: 'margin-top:0;' }, 'Freiheit & Kontrolle'),
    collapsibleInfo('ℹ️ Warum das Ganze?',
      el('div', { class: 'frei-intro' }, 'Systeme statt Willenskraft. Die Quote zählt — nicht der Streak. Ein Rückfall ist ein Datenpunkt, kein Urteil. Alle Daten bleiben nur auf deinem Gerät.')),
    tabsRow,
    tab === 'tagebuch' ? renderFreiTagebuch()
      : tab === 'urge' ? renderFreiUrge()
      : renderFreiGenerell(),
  );
}

// ---------- Bücher (Regal + Aufgaben pro Buch) ----------
// Übersicht → Buch antippen → Aufgaben. Wehrle = feste Mini-Challenges,
// Task-Bücher (z. B. Stahl) = selbst festgehaltene Aufgaben mit Typ.
let bookTaskForm = null; // transient: { type, title, page, prompt } — Formular „Neue Aufgabe“, nicht persistiert
let bookNoteDraft = null; // transient: { type, chapter, text } — Schnell-Erfassung im Notiz-Modus; Typ+Kapitel bleiben nach dem Speichern stehen

function openBook(id) {
  setGlobal({ bookOpen: id });
  sendEvent('book_opened', { bookId: id });
  if (state.tab !== 'buecher') selectTab('buecher'); else render();
}

function bookBackRow() {
  return el('button', {
    class: 'bk-back',
    onClick: () => { bookTaskForm = null; bookNoteDraft = null; setGlobal({ bookOpen: null }); render(); },
  }, '‹ Alle Bücher');
}

function bookProgress(book, g) {
  if (book.mode === 'challenges') {
    const all = g.challenges || {};
    const done = CHALLENGES.filter((c) => all[c.id] && all[c.id].done).length;
    return { done, total: CHALLENGES.length, label: done + ' / ' + CHALLENGES.length + ' Challenges erledigt' };
  }
  if (book.mode === 'notes') {
    const notes = (g.bookNotes || {})[book.id] || [];
    const openTodos = notes.filter((n) => n.type === 'todo' && !n.done).length;
    return {
      done: 0, total: 0,
      label: notes.length === 0 ? 'Noch keine Notizen'
        : notes.length + ' Notiz' + (notes.length === 1 ? '' : 'en') + (openTodos > 0 ? ' · ' + openTodos + ' offen umzusetzen' : ''),
    };
  }
  const tasks = (g.bookTasks || {})[book.id] || [];
  const done = tasks.filter((t) => t.done).length;
  return {
    done, total: tasks.length,
    label: tasks.length === 0 ? 'Noch keine Aufgaben festgehalten' : done + ' / ' + tasks.length + ' Aufgaben erledigt',
  };
}

function renderBuecher() {
  const g = state.global;
  const open = BOOKS.find((b) => b.id === g.bookOpen);
  if (open && open.mode === 'challenges') return renderChallenges();
  if (open && open.mode === 'notes') return renderBookNotes(open);
  if (open) return renderBookTasks(open);
  return renderBookShelf();
}

function renderBookShelf() {
  const g = state.global;
  const cards = BOOKS.map((book) => {
    const p = bookProgress(book, g);
    return el('button', { class: 'bk-card', onClick: () => openBook(book.id) },
      el('span', {
        class: 'bk-cover',
        style: 'background:linear-gradient(160deg,' + book.color + '33,' + book.color + '14);border:1px solid ' + book.color + '55;',
      }, book.emoji),
      el('span', { class: 'bk-card-text' },
        el('span', { class: 'bk-card-title' }, book.title),
        el('span', { class: 'bk-card-author' }, book.author),
        el('span', { class: 'bk-card-progress' },
          p.total > 0 && el('span', { class: 'bk-card-bar' },
            el('span', { class: 'bk-card-fill', style: 'width:' + Math.round((p.done / p.total) * 100) + '%;background:' + book.color + ';' })),
          el('span', { class: 'bk-card-label' }, p.label),
        ),
      ),
      el('span', { class: 'ch-chevron' }, '›'),
    );
  });

  return el('div', { class: 'screen', 'data-screen-label': 'Bücher' },
    el('h2', { class: 'section-h2', style: 'margin-top:0;' }, 'Bücher'),
    el('div', { class: 'frei-intro' }, 'Dein Arbeitsregal: Jedes Buch bringt eigene Aufgaben und Impulse mit — ein Buch antippen, um daran zu arbeiten.'),
    el('div', { class: 'bk-shelf' }, cards),
  );
}

function setBookTask(bookId, taskId, patch) {
  const g = state.global;
  const tasks = ((g.bookTasks || {})[bookId] || []).map((t) => (t.id === taskId ? { ...t, ...patch } : t));
  setGlobal({ bookTasks: { ...(g.bookTasks || {}), [bookId]: tasks } }, 'Buch-Aufgabe aktualisiert');
}

function renderBookTasks(book) {
  const g = state.global;
  const tasks = (g.bookTasks || {})[book.id] || [];
  const doneCount = tasks.filter((t) => t.done).length;
  const filter = g.bookTaskFilter || 'alle';
  const filtered = tasks.filter((t) => (filter === 'alle' ? true : filter === 'erledigt' ? t.done : !t.done));

  function addTask() {
    const f = bookTaskForm;
    const title = (f.title || '').trim();
    if (!title) return;
    const task = {
      id: Date.now(), type: f.type, title,
      page: (f.page || '').trim(), prompt: (f.prompt || '').trim(),
      answer: '', items: [], done: false, doneAt: null,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    const cur = (state.global.bookTasks || {})[book.id] || []; // frisch lesen, nie Closure-Stand
    setGlobal({
      bookTasks: { ...(state.global.bookTasks || {}), [book.id]: [...cur, task] },
      bookTaskOpen: task.id,
    }, 'Buch-Aufgabe hinzugefügt');
    sendEvent('book_task_added', { bookId: book.id, taskId: task.id, type: task.type });
    bookTaskForm = null;
    render();
  }

  function taskForm() {
    const f = bookTaskForm;
    const tt = TASK_TYPES[f.type];
    return el('div', { class: 'habit-add-card', style: 'margin-bottom:0;' },
      el('div', { class: 'habit-add-title' }, 'Neue Aufgabe aus dem Buch'),
      el('div', { class: 'bt-type-chips' },
        Object.entries(TASK_TYPES).map(([id, t]) => el('button', {
          class: 'bt-chip' + (f.type === id ? ' active' : ''),
          onClick: () => { bookTaskForm = { ...bookTaskForm, type: id }; render(); },
        }, t.emoji + ' ' + t.label)),
      ),
      el('div', { class: 'bt-type-hint' }, tt.hint),
      el('div', { class: 'habit-grid-2', style: 'grid-template-columns:1fr 110px;' },
        el('input', {
          class: 'habit-input', value: f.title, placeholder: 'Titel, z. B. Meine Glaubenssätze finden',
          onInput: (ev) => { bookTaskForm.title = ev.target.value; },
        }),
        el('input', {
          class: 'habit-input', value: f.page, placeholder: 'Seite',
          onInput: (ev) => { bookTaskForm.page = ev.target.value; },
        }),
      ),
      el('textarea', {
        class: 'habit-input', rows: 3, value: f.prompt,
        placeholder: 'Aufgabenstellung aus dem Buch (optional) — was genau sollst du tun?',
        onInput: (ev) => { bookTaskForm.prompt = ev.target.value; },
      }),
      el('div', { class: 'ch-actions', style: 'margin-top:0;' },
        el('button', { class: 'btn-primary', onClick: addTask }, '+ Hinzufügen'),
        el('button', { class: 'btn-ghost', onClick: () => { bookTaskForm = null; render(); } }, 'Abbrechen'),
      ),
    );
  }

  const addCard = bookTaskForm ? taskForm() : el('button', {
    class: 'btn-ghost', style: 'width:100%;',
    onClick: () => { bookTaskForm = { type: 'reflexion', title: '', page: '', prompt: '' }; render(); },
  }, '+ Aufgabe aus dem Buch festhalten');

  // Listen-Editor für Typ „liste": nummerierte Einträge, hinzufügen/entfernen.
  // Wichtig: Einträge immer frisch aus state lesen — Feld-Commits re-rendern nicht,
  // Closure-Stände wären beim nächsten Klick veraltet und würden Getipptes überschreiben.
  function listEditor(t) {
    const freshItems = () => {
      const cur = ((state.global.bookTasks || {})[book.id] || []).find((x) => x.id === t.id);
      return (cur && cur.items) || [];
    };
    const commit = (arr) => {
      setBookTask(book.id, t.id, { items: arr });
      sendEvent('book_task_edited', { bookId: book.id, taskId: t.id, field: 'items' });
    };
    return el('div', { class: 'bk-items' },
      (t.items || []).map((it, i) => el('div', { class: 'bk-item-row' },
        el('span', { class: 'bk-item-nr' }, (i + 1) + '.'),
        el('input', {
          class: 'bk-item-input', value: it, placeholder: 'Eintrag …',
          onChange: (ev) => commit(freshItems().map((x, j) => (j === i ? ev.target.value : x))),
        }),
        el('button', {
          class: 'bk-item-remove', title: 'Eintrag entfernen',
          onClick: () => { commit(freshItems().filter((_, j) => j !== i)); render(); },
        }, '×'),
      )),
      el('button', {
        class: 'bk-add-item',
        onClick: () => {
          commit([...freshItems(), '']);
          render();
          const inputs = document.querySelectorAll('.bk-item-input');
          if (inputs.length) inputs[inputs.length - 1].focus();
        },
      }, '+ Eintrag'),
    );
  }

  function card(t) {
    const tt = TASK_TYPES[t.type] || TASK_TYPES.reflexion;
    const open = g.bookTaskOpen === t.id;

    const head = el('button', {
      class: 'ch-head', onClick: () => { setGlobal({ bookTaskOpen: open ? null : t.id }); render(); },
    },
      el('span', { class: 'ch-nr' + (t.done ? ' done' : '') }, t.done ? '✓' : tt.emoji),
      el('span', { class: 'ch-head-text' },
        el('span', { class: 'ch-title' }, t.title),
        el('span', { class: 'ch-sub' }, tt.label + (t.page ? ' · Seite ' + t.page : '')),
      ),
      el('span', { class: 'ch-chevron' + (open ? ' open' : '') }, '›'),
    );

    const body = open && el('div', { class: 'ch-body' },
      el('div', { class: 'bt-label' }, 'Aufgabe aus dem Buch'),
      mdField({
        rows: 2,
        placeholder: 'Aufgabenstellung aus dem Buch …',
        value: t.prompt || '',
        title: 'Aufgabe: ' + t.title,
        onCommit: (v) => {
          setBookTask(book.id, t.id, { prompt: v });
          sendEvent('book_task_edited', { bookId: book.id, taskId: t.id, field: 'prompt' });
        },
      }),
      el('div', { class: 'bt-label' }, tt.answerLabel),
      t.type === 'liste' ? listEditor(t) : mdField({
        rows: 4,
        placeholder: tt.answerPh,
        value: t.answer || '',
        title: t.title,
        onCommit: (v) => {
          setBookTask(book.id, t.id, { answer: v });
          sendEvent('book_task_edited', { bookId: book.id, taskId: t.id, field: 'answer' });
        },
      }),
      el('div', { class: 'ch-actions' },
        el('button', {
          class: t.done ? 'btn-ghost' : 'btn-primary',
          onClick: () => {
            const done = !t.done;
            setBookTask(book.id, t.id, { done, doneAt: done ? new Date().toISOString().slice(0, 10) : null });
            sendEvent('book_task_toggled', { bookId: book.id, taskId: t.id, done });
            render();
          },
        }, t.done ? 'Als offen markieren' : '✓ Erledigt'),
        t.done && t.doneAt && el('span', { class: 'ch-done-at' }, 'Erledigt am ' + new Date(t.doneAt).toLocaleDateString('de-DE')),
        el('button', {
          class: 'bt-delete',
          onClick: () => {
            const cur = (state.global.bookTasks || {})[book.id] || []; // frisch lesen, nie Closure-Stand
            setGlobal({ bookTasks: { ...(state.global.bookTasks || {}), [book.id]: cur.filter((x) => x.id !== t.id) } }, 'Buch-Aufgabe gelöscht');
            sendEvent('book_task_removed', { bookId: book.id, taskId: t.id });
            render();
          },
        }, 'Löschen'),
      ),
    );

    return el('div', { class: 'card ch-card' }, head, body);
  }

  const filterRow = tasks.length > 0 && el('div', { class: 'frei-subtabs', style: 'margin-bottom:0;' },
    [['alle', 'Alle'], ['offen', 'Offen'], ['erledigt', 'Erledigt']].map(([id, label]) => el('button', {
      class: 'frei-subtab-btn' + (filter === id ? ' active' : ''),
      onClick: () => { setGlobal({ bookTaskFilter: id }); render(); },
    }, label + (id === 'erledigt' ? ' (' + doneCount + ')' : ''))),
  );

  const progress = tasks.length > 0 && el('div', { class: 'ch-progress' },
    el('div', { class: 'ch-progress-bar' }, el('div', { class: 'ch-progress-fill', style: 'width:' + Math.round((doneCount / tasks.length) * 100) + '%;' })),
    el('span', { class: 'ch-progress-label' }, doneCount + ' / ' + tasks.length + ' erledigt'),
  );

  const empty = tasks.length === 0 && !bookTaskForm && emptyState('📖',
    'Noch keine Aufgaben festgehalten',
    'Wenn dir beim Lesen eine Übung oder Reflexionsfrage begegnet, halte sie hier fest — mit passendem Typ, damit du sie direkt bearbeiten kannst.',
    '+ Erste Aufgabe festhalten',
    () => { bookTaskForm = { type: 'reflexion', title: '', page: '', prompt: '' }; render(); });

  return el('div', { class: 'screen', 'data-screen-label': book.title },
    bookBackRow(),
    el('h2', { class: 'section-h2', style: 'margin-top:0;' }, book.title),
    el('div', { class: 'frei-intro' }, book.intro || ('Aufgaben aus »' + book.title + '« (' + book.author + ').')),
    progress,
    empty || el('div', { class: 'bk-stack' },
      tasks.length > 0 ? addCard : (bookTaskForm ? taskForm() : null),
      filterRow,
      el('div', { class: 'ch-list', style: 'margin-top:0;' }, filtered.map(card)),
    ),
  );
}

// ---------- Hörbuch-Notizen (Bücher im mode 'notes') ----------
// Schnell-Erfassung oben (immer sichtbar), Verlauf darunter (neueste zuerst).
// Kapitel und Typ bleiben nach dem Speichern stehen — beim Hören notiert man
// meist mehrere Gedanken hintereinander im selben Kapitel.
function setBookNote(bookId, noteId, patch) {
  const g = state.global;
  const notes = ((g.bookNotes || {})[bookId] || []).map((n) => (n.id === noteId ? { ...n, ...patch } : n));
  setGlobal({ bookNotes: { ...(g.bookNotes || {}), [bookId]: notes } }, 'Buch-Notiz aktualisiert');
}

function renderBookNotes(book) {
  const g = state.global;
  const notes = (g.bookNotes || {})[book.id] || [];
  if (!bookNoteDraft) bookNoteDraft = { type: 'gedanke', chapter: '', text: '' };
  const draft = bookNoteDraft;
  const filter = g.bookNoteFilter || 'alle';
  const filtered = notes.filter((n) => (filter === 'alle' ? true : filter === 'todo-offen' ? (n.type === 'todo' && !n.done) : n.type === filter));

  function chapterSelect(value, onChange, extraClass) {
    return el('select', {
      class: 'habit-input bn-chapter' + (extraClass || ''),
      onChange: (ev) => onChange(ev.target.value),
    },
      el('option', { value: '', selected: value === '' || null }, 'Kapitel (optional)'),
      (book.chapters || []).map((c) => el('option', { value: c, selected: value === c || null }, c)),
    );
  }

  function saveNote() {
    const text = (draft.text || '').trim();
    if (!text) return;
    const note = {
      id: Date.now(), type: draft.type, chapter: draft.chapter, text,
      done: false, doneAt: null, createdAt: new Date().toISOString(),
    };
    const cur = (state.global.bookNotes || {})[book.id] || []; // frisch lesen, nie Closure-Stand
    setGlobal({ bookNotes: { ...(state.global.bookNotes || {}), [book.id]: [note, ...cur] } }, 'Buch-Notiz gespeichert');
    sendEvent('book_note_added', { bookId: book.id, noteId: note.id, type: note.type, chapter: note.chapter });
    bookNoteDraft = { ...draft, text: '' }; // Kapitel + Typ stehen lassen
    render();
    const ta = document.querySelector('.bn-capture textarea');
    if (ta) ta.focus();
  }

  const nt = NOTE_TYPES[draft.type];
  const capture = el('div', { class: 'habit-add-card bn-capture', style: 'margin-bottom:0;' },
    chapterSelect(draft.chapter, (v) => { bookNoteDraft.chapter = v; }),
    el('div', { class: 'bt-type-chips' },
      Object.entries(NOTE_TYPES).map(([id, t]) => el('button', {
        class: 'bt-chip' + (draft.type === id ? ' active' : ''),
        onClick: () => { bookNoteDraft = { ...bookNoteDraft, type: id }; render(); },
      }, t.emoji + ' ' + t.label)),
    ),
    el('textarea', {
      class: 'habit-input', rows: 3, value: draft.text, placeholder: nt.ph,
      onInput: (ev) => { bookNoteDraft.text = ev.target.value; },
      onKeyDown: (ev) => { if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { bookNoteDraft.text = ev.target.value; saveNote(); } },
    }),
    el('button', { class: 'btn-primary', style: 'width:100%;', onClick: saveNote }, nt.emoji + ' Notiz speichern'),
  );

  function noteCard(n) {
    const t = NOTE_TYPES[n.type] || NOTE_TYPES.gedanke;
    const open = g.bookNoteOpen === n.id;
    const when = new Date(n.createdAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const firstLine = (n.text || '').split('\n')[0];

    const head = el('button', {
      class: 'ch-head', onClick: () => { setGlobal({ bookNoteOpen: open ? null : n.id }); render(); },
    },
      el('span', { class: 'ch-nr' + (n.type === 'todo' && n.done ? ' done' : '') }, n.type === 'todo' && n.done ? '✓' : t.emoji),
      el('span', { class: 'ch-head-text' },
        el('span', { class: 'ch-title bn-note-title' }, firstLine),
        el('span', { class: 'ch-sub' }, t.label + (n.chapter ? ' · ' + n.chapter : '') + ' · ' + when),
      ),
      el('span', { class: 'ch-chevron' + (open ? ' open' : '') }, '›'),
    );

    const body = open && el('div', { class: 'ch-body' },
      mdField({
        rows: 3, placeholder: t.ph, value: n.text || '', title: t.label,
        onCommit: (v) => {
          setBookNote(book.id, n.id, { text: v });
          sendEvent('book_note_edited', { bookId: book.id, noteId: n.id });
        },
      }),
      el('div', { class: 'bt-label' }, 'Kapitel'),
      chapterSelect(n.chapter || '', (v) => { setBookNote(book.id, n.id, { chapter: v }); render(); }),
      el('div', { class: 'ch-actions' },
        n.type === 'todo' && el('button', {
          class: n.done ? 'btn-ghost' : 'btn-primary',
          onClick: () => {
            const done = !n.done;
            setBookNote(book.id, n.id, { done, doneAt: done ? new Date().toISOString().slice(0, 10) : null });
            sendEvent('book_note_toggled', { bookId: book.id, noteId: n.id, done });
            render();
          },
        }, n.done ? 'Als offen markieren' : '✓ Umgesetzt'),
        el('button', {
          class: 'bt-delete',
          onClick: () => {
            const cur = (state.global.bookNotes || {})[book.id] || []; // frisch lesen, nie Closure-Stand
            setGlobal({ bookNotes: { ...(state.global.bookNotes || {}), [book.id]: cur.filter((x) => x.id !== n.id) } }, 'Buch-Notiz gelöscht');
            sendEvent('book_note_removed', { bookId: book.id, noteId: n.id });
            render();
          },
        }, 'Löschen'),
      ),
    );

    return el('div', { class: 'card ch-card' }, head, body);
  }

  const openTodos = notes.filter((n) => n.type === 'todo' && !n.done).length;
  const filterRow = notes.length > 0 && el('div', { class: 'frei-subtabs', style: 'margin-bottom:0;' },
    [['alle', 'Alle (' + notes.length + ')'],
     ['todo-offen', '✅ Offen' + (openTodos > 0 ? ' (' + openTodos + ')' : '')],
     ['aha', '⚡ Aha'], ['zitat', '📌 Zitate'], ['bezug', '🪞 Ich']].map(([id, label]) => el('button', {
      class: 'frei-subtab-btn' + (filter === id ? ' active' : ''),
      onClick: () => { setGlobal({ bookNoteFilter: id }); render(); },
    }, label)),
  );

  return el('div', { class: 'screen', 'data-screen-label': book.title },
    bookBackRow(),
    el('h2', { class: 'section-h2', style: 'margin-top:0;' }, book.title),
    el('div', { class: 'frei-intro' }, book.intro),
    el('div', { class: 'bk-stack' },
      capture,
      filterRow,
      notes.length === 0
        ? el('div', { class: 'frei-intro', style: 'text-align:center;' }, '🎧 Drück Play und halte oben fest, was hängen bleibt — jede Notiz landet hier im Verlauf.')
        : el('div', { class: 'ch-list', style: 'margin-top:0;' },
            filtered.length === 0 ? el('div', { class: 'frei-intro' }, 'Keine Notizen in diesem Filter.') : filtered.map(noteCard)),
    ),
  );
}

// ---------- Mini-Challenges (Martin Wehrle, 52 Impulse) ----------
// Aktuelle Challenge = erste noch nicht erledigte in Reihenfolge (kein Kalenderwochen-Bezug).
function currentChallengeId(g) {
  const all = (g && g.challenges) || {};
  const next = CHALLENGES.find((c) => !(all[c.id] && all[c.id].done));
  return next ? next.id : CHALLENGES[CHALLENGES.length - 1].id;
}

function setChallenge(id, patch) {
  const g = state.global;
  const cur = (g.challenges && g.challenges[id]) || { done: false, doneAt: null, note: '' };
  setGlobal({ challenges: { ...(g.challenges || {}), [id]: { ...cur, ...patch } } }, 'Mini-Challenge aktualisiert');
}

function renderChallenges() {
  const g = state.global;
  const all = g.challenges || {};
  const doneCount = CHALLENGES.filter((c) => all[c.id] && all[c.id].done).length;
  const currentId = currentChallengeId(g);
  const filter = g.challengeFilter || 'alle';

  const filtered = CHALLENGES.filter((c) => {
    const done = all[c.id] && all[c.id].done;
    return filter === 'alle' || (filter === 'erledigt' ? done : !done);
  });

  function card(c) {
    const st = all[c.id] || { done: false, doneAt: null, note: '' };
    const open = g.challengeOpen === c.id;
    const isWeek = c.id === currentId;

    const head = el('button', {
      class: 'ch-head', onClick: () => { setGlobal({ challengeOpen: open ? null : c.id }); render(); },
    },
      el('span', { class: 'ch-nr' + (st.done ? ' done' : '') }, st.done ? '✓' : String(c.id)),
      el('span', { class: 'ch-head-text' },
        el('span', { class: 'ch-title' }, c.title, isWeek && el('span', { class: 'ch-week-badge' }, 'Aktuell')),
        el('span', { class: 'ch-sub' }, c.subtitle),
      ),
      el('span', { class: 'ch-chevron' + (open ? ' open' : '') }, '›'),
    );

    const body = open && el('div', { class: 'ch-body' },
      c.text.map((p) => el('p', { class: 'ch-text' }, p)),
      mdField({
        rows: 3,
        placeholder: 'Meine Notizen, Prognose & Erfahrungsbericht …',
        value: st.note || '',
        title: 'Notiz: ' + c.title,
        onCommit: (v) => {
          setChallenge(c.id, { note: v });
          sendEvent('challenge_note_edited', { challengeId: c.id });
        },
      }),
      el('div', { class: 'ch-actions' },
        el('button', {
          class: st.done ? 'btn-ghost' : 'btn-primary',
          onClick: () => {
            const done = !st.done;
            setChallenge(c.id, { done, doneAt: done ? new Date().toISOString().slice(0, 10) : null });
            sendEvent('challenge_toggled', { challengeId: c.id, done });
            render();
          },
        }, st.done ? 'Als offen markieren' : '✓ Erledigt'),
        st.done && st.doneAt && el('span', { class: 'ch-done-at' }, 'Erledigt am ' + new Date(st.doneAt).toLocaleDateString('de-DE')),
      ),
    );

    return el('div', { class: 'card ch-card' }, head, body);
  }

  function heroCard() {
    const c = CHALLENGES.find((x) => x.id === currentId);
    if (!c) return null;
    const st = all[c.id] || { done: false, doneAt: null, note: '' };
    const toggle = () => {
      const done = !st.done;
      setChallenge(c.id, { done, doneAt: done ? new Date().toISOString().slice(0, 10) : null });
      sendEvent('challenge_toggled', { challengeId: c.id, done });
      render();
    };

    return el('div', { class: 'ch-hero' + (st.done ? ' done' : '') },
      el('span', { class: 'ch-hero-label' }, 'AKTUELLE CHALLENGE'),
      el('span', { class: 'ch-hero-title' }, c.title),
      el('p', { class: 'ch-hero-text' }, c.text[0] || ''),
      el('div', { class: 'ch-hero-actions' },
        st.done
          ? [
              el('span', { class: 'ch-hero-done' }, '✓ Geschafft'),
              el('button', { class: 'btn-ghost', onClick: toggle }, 'Rückgängig'),
            ]
          : el('button', { class: 'btn-primary', onClick: toggle }, 'Erledigt ✓'),
      ),
    );
  }

  const filterRow = el('div', { class: 'frei-subtabs' },
    [['alle', 'Alle'], ['offen', 'Offen'], ['erledigt', 'Erledigt']].map(([id, label]) => el('button', {
      class: 'frei-subtab-btn' + (filter === id ? ' active' : ''),
      onClick: () => { setGlobal({ challengeFilter: id }); render(); },
    }, label + (id === 'erledigt' ? ' (' + doneCount + ')' : ''))),
  );

  return el('div', { class: 'screen', 'data-screen-label': 'Mini-Challenges' },
    bookBackRow(),
    el('h2', { class: 'section-h2', style: 'margin-top:0;' }, 'Mini-Challenges'),
    el('div', { class: 'frei-intro' }, '52 Impulse aus »Dieses Buch verändert dein Leben für immer« (Martin Wehrle). Eine nach der anderen im eigenen Tempo — klein anfangen, groß wirken.'),
    heroCard(),
    el('div', { class: 'ch-progress' },
      el('div', { class: 'ch-progress-bar' }, el('div', { class: 'ch-progress-fill', style: 'width:' + Math.round((doneCount / CHALLENGES.length) * 100) + '%;' })),
      el('span', { class: 'ch-progress-label' }, doneCount + ' / ' + CHALLENGES.length + ' erledigt'),
    ),
    filterRow,
    el('div', { class: 'ch-list' }, filtered.map(card)),
  );
}

// ---------- Habit Tracker ----------
function renderHabits() {
  const g = state.global;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const calYear = g.calYear ?? today.getFullYear();
  const calMonth = g.calMonth ?? today.getMonth();
  const isStreak = (g.habitViewMode || 'streak') === 'streak';

  function toggleIndex(h, i) {
    const nowDone = !h.days[i];
    const habits = g.habits.map((x) =>
      x.id === h.id ? { ...x, days: x.days.map((v, j) => (j === i ? !v : v)) } : x);
    setGlobal({ habits }, 'Habit Tracker aktualisiert');
    sendEvent('habit_checked', { habitId: h.id, idx: i });
    if (nowDone) {
      justDoneCell = { habitId: h.id, idx: i };
      try { if ('vibrate' in navigator) navigator.vibrate(10); } catch (e) {}
      const doneCount = habits.find((x) => x.id === h.id).days.filter(Boolean).length;
      if (MILESTONES.includes(doneCount)) {
        if (doneCount === 66) {
          showToast('🏆 66 Tage — Gewohnheit verankert!');
          try { if ('vibrate' in navigator) navigator.vibrate([30, 50, 30]); } catch (e) {}
        } else {
          showToast('🎉 ' + doneCount + ' Tage geschafft!');
        }
      }
    } else {
      justDoneCell = null;
    }
    render();
  }

  function addHabit() {
    if (!g.newHabitName.trim()) return;
    const active = g.habits.filter((h) => h.days.filter(Boolean).length < 66).length;
    if (active >= 3) { setGlobal({ overloadWarn: true }); render(); return; }
    setGlobal({
      habits: [...g.habits, {
        id: Date.now(),
        startDate: daysAgoISO(0),
        name: g.newHabitName.trim(),
        wenn: g.newHabitWenn.trim() || '…',
        dann: g.newHabitDann.trim() || '…',
        kurz: (g.newHabitKurz || '').trim(),
        mittel: (g.newHabitMittel || '').trim(),
        lang: (g.newHabitLang || '').trim(),
        days: Array(66).fill(false),
      }],
      newHabitName: '', newHabitWenn: '', newHabitDann: '',
      newHabitKurz: '', newHabitMittel: '', newHabitLang: '',
      overloadWarn: false,
    }, 'Habit Tracker aktualisiert');
    sendEvent('habit_added', { name: g.newHabitName.trim() });
    render();
  }

  const noHabits = g.habits.length === 0;
  const formOpen = noHabits || habitFormOpen;

  const addForm = el('div', { class: 'habit-add-card', id: 'habit-add-card' },
    el('div', { class: 'habit-add-title' }, 'Neue Gewohnheit anlegen'),
    el('input', {
      class: 'habit-input', value: g.newHabitName, placeholder: 'Gewohnheit, z. B. Fitnessstudio',
      onChange: (ev) => setGlobal({ newHabitName: ev.target.value }),
    }),
    el('div', { class: 'habit-grid-2' },
      el('input', {
        class: 'habit-input', value: g.newHabitWenn, placeholder: 'WENN … (z. B. Montag 19:00 Uhr ist)',
        onChange: (ev) => setGlobal({ newHabitWenn: ev.target.value }),
      }),
      el('input', {
        class: 'habit-input', value: g.newHabitDann, placeholder: 'DANN … (z. B. bin ich im Fitnessstudio)',
        onChange: (ev) => setGlobal({ newHabitDann: ev.target.value }),
      }),
    ),
    el('div', { class: 'habit-why-hint' },
      'Dein „Warum": Entscheide dich bewusst zwischen dem ',
      el('b', { style: 'color:#F28B82;' }, 'Schmerz der Disziplin'),
      ' und dem ',
      el('b', { style: 'color:#F28B82;' }, 'Schmerz der Reue'),
      '.'),
    el('div', { class: 'habit-grid-3' },
      el('input', {
        class: 'habit-input habit-input-small', value: g.newHabitKurz, placeholder: 'Kurzfristig (z. B. Anstrengend, keine Lust)',
        onChange: (ev) => setGlobal({ newHabitKurz: ev.target.value }),
      }),
      el('input', {
        class: 'habit-input habit-input-small', value: g.newHabitMittel, placeholder: 'Mittelfristig (z. B. Besseres Körpergefühl)',
        onChange: (ev) => setGlobal({ newHabitMittel: ev.target.value }),
      }),
      el('input', {
        class: 'habit-input habit-input-small', value: g.newHabitLang, placeholder: 'Langfristig (z. B. Energiegeladenes Leben)',
        onChange: (ev) => setGlobal({ newHabitLang: ev.target.value }),
      }),
    ),
    g.overloadWarn && el('div', { class: 'habit-overload-warn' },
      '⚠️ ', el('b', {}, 'Überladungs-Gefahr!'),
      ' Du hast bereits 3 aktive Gewohnheiten in den ersten 66 Tagen. Konzentriere dich auf die Basics. Setze maximal 1–2 Gewohnheiten um, bevor du neue hinzufügst.'),
    el('button', { class: 'btn-primary', onClick: addHabit }, '+ Hinzufügen'),
  );

  const addCard = formOpen ? addForm : el('button', {
    class: 'btn-ghost',
    style: 'width:100%;',
    onClick: () => { habitFormOpen = true; render(); },
  }, '+ Neue Gewohnheit');

  const toolbar = el('div', { class: 'habits-toolbar' },
    el('div', { class: 'habits-view-toggle' },
      el('button', {
        class: 'view-btn' + (isStreak ? ' active' : ''),
        onClick: () => { setGlobal({ habitViewMode: 'streak' }); render(); },
      }, 'Streak-Ansicht'),
      el('button', {
        class: 'view-btn' + (!isStreak ? ' active' : ''),
        onClick: () => { setGlobal({ habitViewMode: 'month' }); render(); },
      }, 'Monatsansicht'),
    ),
    !isStreak && el('div', { class: 'cal-nav' },
      el('button', {
        class: 'cal-nav-btn', onClick: () => {
          const m = calMonth - 1, y = m < 0 ? calYear - 1 : calYear;
          setGlobal({ calMonth: (m + 12) % 12, calYear: y });
          render();
        },
      }, '‹'),
      el('div', { class: 'cal-nav-label' },
        new Date(calYear, calMonth, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })),
      el('button', {
        class: 'cal-nav-btn', onClick: () => {
          const m = calMonth + 1, y = m > 11 ? calYear + 1 : calYear;
          setGlobal({ calMonth: m % 12, calYear: y });
          render();
        },
      }, '›'),
    ),
  );

  // Einmaliger Hinweis auf die versteckte Long-Press-Notiz — verschwindet dauerhaft,
  // sobald irgendein Habit mindestens einen Kommentar hat.
  const anyComment = g.habits.some((h) => Object.keys(h.comments || {}).length > 0);

  const habitCards = g.habits.map((h, hi) => {
    const doneCount = h.days.filter(Boolean).length;
    const startDate = h.startDate || daysAgoISO(0);
    const hasWhy = !!(h.kurz || h.mittel || h.lang);
    const disziplin = doneCount >= 10 && doneCount < 40;
    const done = doneCount >= 66;
    const pct = Math.round((doneCount / 66) * 100) + '%';

    const streakGrid = el('div', { class: 'habit-streak-grid' },
      h.days.map((d, i) => {
        const date = dateFromStart(startDate, i);
        const isToday = isSameDate(date, today);
        const hasComment = !!((h.comments || {})[i]);
        const ph = pressHandlers(h.id, i, () => toggleIndex(h, i));
        const isJustDone = !!(d && justDoneCell && justDoneCell.habitId === h.id && justDoneCell.idx === i);
        if (isJustDone) justDoneCell = null;
        return el('button', {
          class: 'habit-day-btn' + (d ? ' done' : '') + (isToday ? ' today' : '') + (isJustDone ? ' just-done' : ''),
          title: WEEKDAYS[(date.getDay() + 6) % 7] + ', ' + date.toLocaleDateString('de-DE') + ' — Tag ' + (i + 1) + (hasComment ? ' · 💬 ' + (h.comments || {})[i] : ''),
          onAnimationend: (ev) => { if (ev.animationName === 'pop') ev.target.classList.remove('just-done'); },
          ...ph,
        },
          WEEKDAYS[(date.getDay() + 6) % 7][0],
          hasComment && el('span', { class: 'habit-day-comment-dot' }),
        );
      }),
    );

    const monthCells = buildMonthCells(calYear, calMonth).map((date, ci) => {
      if (!date) return el('div', { key: 'e' + ci });
      const idx = Math.round((date - new Date(startDate + 'T00:00:00')) / 86400000);
      const inRange = idx >= 0 && idx < h.days.length;
      const d = inRange && h.days[idx];
      const isToday = isSameDate(date, today);
      const hasComment = inRange && !!((h.comments || {})[idx]);
      if (!inRange) {
        return el('div', { class: 'habit-month-cell out-of-range' }, String(date.getDate()));
      }
      const ph = pressHandlers(h.id, idx, () => toggleIndex(h, idx));
      const isJustDone = !!(d && justDoneCell && justDoneCell.habitId === h.id && justDoneCell.idx === idx);
      if (isJustDone) justDoneCell = null;
      return el('button', {
        class: 'habit-month-cell' + (d ? ' done' : '') + (isToday ? ' today' : '') + (isJustDone ? ' just-done' : ''),
        onAnimationend: (ev) => { if (ev.animationName === 'pop') ev.target.classList.remove('just-done'); },
        ...ph,
      },
        String(date.getDate()),
        hasComment && el('span', { class: 'habit-month-cell-comment-dot' }),
      );
    });
    const monthWeeks = [];
    for (let w = 0; w < monthCells.length; w += 7) {
      monthWeeks.push(el('div', { class: 'habit-month-week' }, monthCells.slice(w, w + 7)));
    }

    return el('div', { class: 'habit-card' },
      el('div', { class: 'habit-head' },
        el('div', { style: 'flex:1;' },
          el('div', { class: 'habit-name' }, h.name),
          el('div', { class: 'habit-wenn-dann' },
            el('b', { style: 'color:#FDD663;' }, 'Wenn'), ' ' + h.wenn + ', ',
            el('b', { style: 'color:#81C995;' }, 'dann'), ' ' + h.dann + '.'),
          hasWhy && el('div', { class: 'habit-why-chips' },
            el('span', { class: 'habit-why-chip', style: 'color:#F28B82;' }, 'Kurzfristig: ' + (h.kurz || '—')),
            el('span', { class: 'habit-why-chip', style: 'color:#FDD663;' }, 'Mittelfristig: ' + (h.mittel || '—')),
            el('span', { class: 'habit-why-chip', style: 'color:#81C995;' }, 'Langfristig: ' + (h.lang || '—')),
          ),
        ),
        el('div', {},
          el('div', { class: 'habit-count' }, String(doneCount), el('span', { class: 'habit-count-total' }, ' / 66')),
          el('button', {
            class: 'habit-delete-btn',
            onClick: () => {
              setGlobal({ habits: g.habits.filter((x) => x.id !== h.id) }, 'Habit Tracker aktualisiert');
              sendEvent('habit_removed', { habitId: h.id });
              render();
            },
          }, 'Löschen'),
        ),
      ),
      el('div', { class: 'habit-progress' },
        el('div', { class: 'habit-progress-fill', style: 'width:' + pct + ';' })),
      isStreak ? streakGrid : el('div', { class: 'habit-month-grid' },
        el('div', { class: 'habit-month-weekdays' },
          WEEKDAYS.map((wd) => el('div', { class: 'habit-month-weekday' }, wd))),
        monthWeeks,
      ),
      (hi === 0 && !anyComment) && el('div', { class: 'habit-tip' },
        '💡 Tipp: Tag lange gedrückt halten, um eine Notiz zu speichern.'),
      disziplin && el('div', { class: 'habit-disziplin-note' },
        '⚡ ', el('b', {}, 'Tag 10 erreicht — das Motivations-Tal beginnt.'),
        ' Die Motivation lässt jetzt nach. Ab heute zählt nur noch Arbeitsmoral und Disziplin.'),
      done && el('div', { class: 'habit-done-note' }, '🏆 66 Tage geschafft — diese Gewohnheit gehört jetzt dir.'),
    );
  });

  const introText = el('div', { class: 'habits-intro' },
    'Motivation ist ein kurzfristiger Impuls — danach zählen Disziplin und Gewohnheit. Formuliere ',
    el('b', { style: 'color:#E3E3E3;' }, 'Wenn-Dann-Pläne'), ' (Implementation Intentions) und tracke ',
    el('b', { style: 'color:#E3E3E3;' }, '66 Tage'), '.');
  const whyBox = collapsibleInfo('🧪 Warum 66 Tage (nicht 21)?',
    el('div', { class: 'habits-why' },
      'Studien (Lally et al., 2009) zeigen: Es dauert im Schnitt 66 Tage, bis ein Verhalten automatisiert ist. Und: ',
      el('b', { style: 'color:#81C995;' }, 'Einzelne Aussetzer zerstören den Gewohnheitsaufbau nicht'),
      ' — dein Fortschritt wird hier nie auf null gesetzt.'));

  const heading = el('h2', { class: 'section-h2', style: 'margin-top:0;' }, 'Der verbindliche Wochenplan');

  if (noHabits) {
    // Leerer Zustand: einladende Empty-State-Karte + Intro-Texte, Formular aufgeklappt.
    const empty = emptyState(
      '🌱',
      'Starte deine erste Gewohnheit',
      '66 Tage machen aus einem Vorsatz eine Routine. Klein anfangen zählt.',
      'Gewohnheit anlegen',
      () => {
        document.getElementById('habit-add-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => document.querySelector('#habit-add-card .habit-input')?.focus(), 300);
      },
    );
    return el('div', { class: 'screen habits-screen', 'data-screen-label': 'Habit Tracker' },
      heading,
      introText,
      whyBox,
      empty,
      addCard,
      toolbar,
      habitCards,
    );
  }

  return el('div', { class: 'screen habits-screen', 'data-screen-label': 'Habit Tracker' },
    heading,
    toolbar,
    habitCards,
    addCard,
    introText,
    whyBox,
  );
}

// ---------- Kommentar-Bottom-Sheet (Long-Press auf einen Tag) ----------
function renderCommentSheet() {
  const t = state.commentTarget;
  if (!t) return null;
  const h = state.global.habits.find((x) => x.id === t.habitId);
  if (!h) return null;
  const startDate = h.startDate || daysAgoISO(0);
  const date = dateFromStart(startDate, t.idx);
  const hasExisting = !!((h.comments || {})[t.idx]);

  return el('div', {},
    el('div', { class: 'sheet-backdrop', onClick: closeComment }),
    el('div', { class: 'sheet' },
      el('div', { class: 'sheet-handle' }),
      el('div', {},
        el('div', { class: 'sheet-title' }, '💬 ' + h.name),
        el('div', { class: 'sheet-sub' },
          date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · Tag ' + (t.idx + 1)),
      ),
      mdField({
        className: 'sheet-textarea', rows: 3, placeholder: 'Notiz zu diesem Tag …', value: t.draft,
        title: 'Notiz: ' + h.name,
        onCommit: (v) => { t.draft = v; },
      }),
      el('div', { class: 'sheet-actions' },
        hasExisting && el('button', { class: 'sheet-btn sheet-btn-danger', onClick: () => saveComment('') }, 'Löschen'),
        el('button', { class: 'sheet-btn sheet-btn-cancel', onClick: closeComment }, 'Abbrechen'),
        el('button', { class: 'sheet-btn sheet-btn-save', onClick: () => saveComment(t.draft) }, 'Speichern'),
      ),
    ),
  );
}

// ---------- Änderungsverlauf-Drawer ----------
function openLog() { state.logOpen = true; renderOverlay(); }
function closeLog() { state.logOpen = false; renderOverlay(); }

function fmtLogDay(dayISO) {
  const d = new Date(dayISO + 'T00:00:00');
  const now = new Date();
  const diff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - d) / 86400000);
  const dateStr = d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (diff === 0) return 'Heute · ' + dateStr;
  if (diff === 1) return 'Gestern · ' + dateStr;
  return dateStr;
}

function renderOverlay() {
  if (refs.overlay) { refs.overlay.remove(); refs.overlay = null; }
  if (!state.logOpen) return;

  const groups = [];
  for (const e of state.uilog) {
    let g = groups.find((x) => x.day === e.day);
    if (!g) { g = { day: e.day, entries: [] }; groups.push(g); }
    g.entries.push(e);
  }

  const body = groups.length === 0
    ? el('div', { class: 'log-empty' }, 'Noch keine Änderungen aufgezeichnet. Sobald du etwas bearbeitest, erscheint es hier.')
    : groups.map((g) => el('div', { class: 'log-day' },
        el('div', { class: 'log-day-label' }, fmtLogDay(g.day)),
        el('div', { class: 'log-entries' },
          g.entries.map((e) => el('div', { class: 'log-entry' },
            el('span', { class: 'log-entry-time' }, new Date(e.t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })),
            el('span', { class: 'log-entry-label' }, e.label + (e.year !== state.year ? ' (' + e.year + ')' : '')),
            el('span', { class: 'log-entry-count' }, (e.n || 1) > 1 ? e.n + '×' : ''),
            el('button', {
              class: 'log-entry-remove', title: 'Eintrag entfernen',
              onClick: () => {
                state.uilog = state.uilog.filter((x) => x !== e);
                saveUilog();
                sendEvent('history_entry_removed', { label: e.label, day: e.day });
                renderOverlay();
              },
            }, '✕'),
          )),
        ),
      ));

  refs.overlay = el('div', {},
    el('div', { class: 'overlay-backdrop', onClick: closeLog }),
    el('div', { class: 'log-drawer', 'data-screen-label': 'Änderungsverlauf' },
      el('div', { class: 'log-head' },
        el('div', {},
          el('div', { class: 'log-head-title' }, 'Änderungsverlauf'),
          el('div', { class: 'log-head-sub' }, 'Alles wird automatisch gespeichert — hier siehst du wann.'),
        ),
        el('button', { class: 'icon-btn-round', onClick: closeLog }, '✕'),
      ),
      el('div', { class: 'log-body' }, body),
      el('div', { class: 'log-foot' },
        el('button', {
          class: 'btn-danger-outline',
          onClick: () => {
            state.uilog = [];
            saveUilog();
            sendEvent('history_cleared', null);
            renderOverlay();
          },
        }, 'Verlauf löschen'),
      ),
    ),
  );
  document.getElementById('app').append(refs.overlay);
}

// Gemeinsame „Dein Warum"-Karte für Sieg-Overlay + Nachgegeben-Karte.
// Zeigt den Brief ans Drang-Ich; fällt auf „Gewinn" zurück, falls noch kein Brief geschrieben.
function whyLetterCard() {
  const F = state.global.frei || {};
  const text = ((F.letter || '').trim()) || ((F.gewinn || '').trim());
  if (!text) return null;
  const body = el('div', { class: 'urge-win-why-text' });
  body.innerHTML = mdToHtml(text);
  return el('div', { class: 'card urge-win-why' },
    el('div', { class: 'urge-win-why-head' }, F.letter && F.letter.trim() ? 'Brief an dich:' : 'Dein Warum:'),
    body,
  );
}

// Sieg-Overlay nach „Widerstanden" — reines UI, speichert nichts.
function renderUrgeCelebration() {
  const c = state.urgeCelebration;
  if (!c) return null;
  const close = () => { state.urgeCelebration = null; render(); };
  const whyCard = whyLetterCard();
  return el('div', { class: 'urge-win-overlay', 'data-screen-label': 'Sieg' },
    el('div', { class: 'urge-win-inner' },
      el('div', { class: 'urge-win-title' }, 'Du hast widerstanden 💪'),
      el('div', { class: 'urge-win-count' }, 'Das war Sieg Nr. ' + c.n),
      whyCard,
      el('button', { class: 'urge-win-btn', onClick: close }, 'Weiter'),
    ),
  );
}

// ---------- Render ----------
function render() {
  const root = document.getElementById('app');
  refs.overlay = null;
  const main = el('main', {},
    state.tab === 'heute' ? renderHeute()
      : state.tab === 'dashboard' ? renderDashboard()
      : state.tab === 'fokus' ? renderFokus()
      : state.tab === 'habits' ? renderHabits()
      : state.tab === 'buecher' ? renderBuecher()
      : renderFrei(),
  );
  root.replaceChildren(renderHeader(), main, renderBottomNav());
  if (state.logOpen) renderOverlay();
  const sheet = renderCommentSheet();
  if (sheet) root.append(sheet);
  const win = renderUrgeCelebration();
  if (win) root.append(win);
}

function renderBoot(text, isError, retry) {
  const root = document.getElementById('app');
  root.replaceChildren(el('div', { class: 'boot-screen' },
    el('div', { class: 'boot-inner' },
      el('div', { class: 'logo' }, 'L'),
      el('h1', { class: 'boot-title' }, isError ? 'Server nicht erreichbar' : 'Lebensplaner'),
      el('p', { class: 'boot-text' }, text),
      isError && el('button', { class: 'btn-primary', style: 'margin-top:16px;', onClick: retry }, 'Erneut versuchen'),
    ),
  ));
}

// ---------- Start ----------
async function init() {
  const p = loadPrefs();
  state.year = Number(p.year) || JAHR_DEFAULT;
  const prefTab = p.tab === 'challenges' ? 'buecher' : p.tab; // alter Tab „Challenges" lebt jetzt im Bücher-Regal
  state.tab = TABS.some((t) => t.id === prefTab) ? prefTab : 'heute';
  renderBoot('Lade Daten …');
  try {
    const [doc, uilog, global] = await Promise.all([
      loadYearDoc(state.year),
      getDoc('uilog').then((l) => (Array.isArray(l) ? l : [])),
      getDoc('global'),
    ]);
    state.doc = doc;
    state.uilog = uilog;
    state.global = Object.assign(freshGlobalDoc(), global || {});
  } catch (e) {
    renderBoot('Die API antwortet nicht. Läuft der Server? (' + e.message + ')', true, init);
    return;
  }
  render();
  scheduleMidnightRefresh();
}

// Beim Tageswechsel (00:00) neu rendern, damit die Freiheit-Tagesauswahl auch bei
// dauerhaft geöffneter App automatisch auf den neuen Tag springt (siehe renderFreiTagebuch).
function scheduleMidnightRefresh() {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5, 0);
  setTimeout(() => {
    const g = state.global;
    if (g) {
      const today = isoOf(new Date());
      if (g.freiSelDate && g.freiSelDate < today) g.freiSelDate = today;
      // Kalenderansicht auf den aktuellen Monat nachziehen, falls sie noch auf gestern steht
      const nowD = new Date();
      if (g.freiCalYear === now.getFullYear() && g.freiCalMonth === now.getMonth()) {
        g.freiCalYear = nowD.getFullYear();
        g.freiCalMonth = nowD.getMonth();
      }
      render();
    }
    scheduleMidnightRefresh();
  }, Math.max(1000, nextMidnight.getTime() - now.getTime()));
}

// Beim Zurückkehren zur App (z. B. Handy morgens entsperren) sofort prüfen, ob ein Tageswechsel
// stattgefunden hat — der setTimeout oben feuert bei ausgesetzten/gethrottelten Tabs evtl. nicht.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !state.global) return;
  const today = isoOf(new Date());
  if (state.global.freiSelDate && state.global.freiSelDate < today) render();
});

init();
