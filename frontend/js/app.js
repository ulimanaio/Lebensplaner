// Lebensplaner-Frontend — Vanilla DOM, kein Build-Schritt.
// Nachbau von design_reference/Lebensplaner.dc.html, Daten via /api statt localStorage.
import { getDoc, saveDoc, flushAll, sendEvent, setSaveListener } from './api.js';
import { CHALLENGES } from './challenges-data.js';

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
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'fokus', label: 'Fokus & Ziele' },
  { id: 'habits', label: 'Habit Tracker' },
  { id: 'frei', label: 'Freiheit' },
  { id: 'challenges', label: 'Challenges' },
];

const JAHR_DEFAULT = 2026;

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const state = {
  year: JAHR_DEFAULT,
  tab: 'dashboard',
  doc: null,      // Dokument 'year-<jahr>'
  uilog: [],      // Dokument 'uilog' (Anzeige-Verlauf, max. 400)
  global: null,   // Dokument 'global' (Habit Tracker, jahresübergreifend)
  logOpen: false,
  savedAt: null,
  saveFlash: false,
  saveError: false,
  commentTarget: null, // { habitId, idx, draft }
  urgeDraft: null,     // transientes Urge-Formular, nicht persistiert
};
const yearCache = new Map(); // jahr -> doc (vermeidet Races mit debounced Saves)
const refs = {};             // DOM-Referenzen für gezielte Updates (Slider-Live-Feedback)
let flashTimer = null;

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
function pressHandlers(habitId, idx, toggle) {
  return {
    onPointerDown: () => {
      lpFired = false;
      clearTimeout(lpTimer);
      lpTimer = setTimeout(() => {
        lpFired = true;
        try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
        openComment(habitId, idx);
      }, 450);
    },
    onPointerUp: () => clearTimeout(lpTimer),
    onPointerLeave: () => clearTimeout(lpTimer),
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
  state.saveFlash = true;
  state.saveError = false;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { state.saveFlash = false; updateSaveBtn(); }, 1800);
  updateSaveBtn();
  if (state.logOpen) renderOverlay();
}

function saveUilog() {
  saveDoc('uilog', state.uilog);
}

// ---------- Speicher-Indikator ----------
function updateSaveBtn() {
  const btn = refs.saveBtn;
  if (!btn) return;
  btn.className = 'save-btn' + (state.saveError ? ' error' : state.saveFlash ? ' flash' : '');
  if (state.saveError) btn.textContent = '⚠ Nicht gespeichert';
  else if (state.saveFlash) btn.textContent = '✓ Gespeichert';
  else if (state.savedAt) btn.textContent = '✓ ' + state.savedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  else btn.textContent = '🕘 Verlauf';
}

setSaveListener((ok) => {
  if (!ok) { state.saveError = true; updateSaveBtn(); }
});

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
  const showYearPicker = state.tab !== 'habits' && state.tab !== 'frei' && state.tab !== 'challenges';
  refs.saveBtn = el('button', { class: 'save-btn', title: 'Änderungsverlauf anzeigen', onClick: openLog });
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

// ---------- Radar-Chart (SVG, Geometrie 1:1 aus dem Prototyp) ----------
function buildRadar() {
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
  const poly = svg('polygon', {
    points: dataPts.map((p) => p.join(',')).join(' '),
    fill: 'rgba(138,180,248,0.25)', stroke: '#8AB4F8', 'stroke-width': 2.5,
    'stroke-linejoin': 'round', style: 'transition:all .3s ease;',
  });
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
function renderDashboard() {
  const s = state.doc;
  const weakest = weakestArea();

  refs.radar = buildRadar();
  refs.avg = el('span', { class: 'avg-num' }, avgScoreText());

  const radarCard = el('div', { class: 'card p28 radar-card' },
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
        el('input', {
          type: 'range', min: '1', max: '10', step: '1', value: String(score),
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
        el('textarea', {
          class: 'input-area', rows: 4, placeholder: a.placeholder, value: s.visions[a.id] || '',
          onChange: (ev) => {
            s.visions[a.id] = ev.target.value;
            setDoc({ visions: s.visions }, '„10 von 10“-Vision bearbeitet');
            sendEvent('vision_edited', { year: state.year, area: a.id });
          },
        }),
      ),
    );
  });

  return el('div', { class: 'screen', 'data-screen-label': 'Dashboard' },
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
      el('textarea', {
        class: 'input-area', rows: 5, placeholder: a.goalPlaceholder, value: s.goals[a.id] || '',
        onChange: (ev) => {
          s.goals[a.id] = ev.target.value;
          setDoc({ goals: s.goals }, 'Jahresziel bearbeitet');
          sendEvent('goal_edited', { year: state.year, area: a.id });
        },
      }),
      el('div', { class: 'fokus-reflexion' },
        el('div', { class: 'fokus-reflexion-head' },
          el('div', { class: 'fokus-reflexion-title' }, 'Reflexion: Was lief wirklich?'),
          el('div', { class: 'fokus-endscore-row' },
            el('span', { class: 'range-end' }, '1'),
            el('input', {
              type: 'range', min: '1', max: '10', step: '1', value: String(endScore),
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
        el('textarea', {
          class: 'input-area', rows: 4, placeholder: 'Was hast du dir vorgenommen? Was ist tatsächlich passiert? Keine Ausreden.',
          value: (s.reflexions || {})[a.id] || '',
          onChange: (ev) => {
            s.reflexions = s.reflexions || {};
            s.reflexions[a.id] = ev.target.value;
            setDoc({ reflexions: s.reflexions }, 'Reflexion bearbeitet');
            sendEvent('reflexion_edited', { year: state.year, area: a.id });
          },
        }),
      ),
    );
  });

  const noFocus = s.focus.length === 0
    && el('div', { class: 'fokus-empty' }, 'Noch kein Fokus gewählt. Wähle oben 1–' + MAX_FOKUS + ' Bereiche, um Ziele zu definieren.');

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
  const selDate = g.freiSelDate || today;
  const dayMs = 86400000;

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
      onClick: () => { if (!isFuture) { g.freiSelDate = iso; render(); } },
    },
      String(date.getDate()),
      urgesByDate[iso] && el('span', { class: 'frei-cal-urge-dot' }),
    );
  });
  const weeks = [];
  for (let w = 0; w < cells.length; w += 7) weeks.push(el('div', { class: 'frei-cal-week' }, cells.slice(w, w + 7)));

  const calCard = el('div', { class: 'card p24 frei-cal-card' },
    el('div', { class: 'frei-cal-head' },
      el('div', { class: 'frei-cal-title' }, 'Verlauf — Tag antippen zum Zurückblättern'),
      el('div', { class: 'cal-nav' },
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
    el('div', { class: 'frei-cal-weekdays' }, WEEKDAYS.map((wd) => el('div', { class: 'frei-cal-weekday' }, wd))),
    el('div', { class: 'frei-cal-weeks' }, weeks),
    el('div', { class: 'frei-cal-legend' },
      el('span', {}, el('span', { class: 'frei-legend-dot', style: 'background:#81C995;' }), 'Clean'),
      el('span', {}, el('span', { class: 'frei-legend-dot', style: 'background:#FDD663;' }), 'Rückfall'),
      el('span', {}, el('span', { class: 'frei-legend-dot round', style: 'background:#C58AF9;' }), 'Urge gemeldet'),
    ),
  );

  // Ausgewählter Tag
  const selD = goodDate(selDate);
  const selVal = log[selDate];
  const selUrges = urgesByDate[selDate] || [];

  const dayCard = el('div', { class: 'card p24 frei-day-card' },
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
      el('textarea', {
        class: 'input-area', rows: 3, placeholder: '1. …\n2. …\n3. …',
        value: (F.dank || {})[selDate] || '',
        onChange: (ev) => {
          setFrei({ dank: { ...(F.dank || {}), [selDate]: ev.target.value } }, 'Dankbarkeit bearbeitet');
          sendEvent('frei_dank_edited', { date: selDate });
        },
      }),
    ),
    el('div', {},
      el('div', { class: 'frei-field-label', style: 'color:#8AB4F8;' }, 'TAGEBUCH — WIE WAR DER TAG?'),
      el('textarea', {
        class: 'input-area', rows: 5, placeholder: 'Was ist passiert? Wie ging es dir? Was hast du gelernt?',
        value: (F.diary || {})[selDate] || '',
        onChange: (ev) => {
          setFrei({ diary: { ...(F.diary || {}), [selDate]: ev.target.value } }, 'Tagebuch bearbeitet');
          sendEvent('frei_diary_edited', { date: selDate });
        },
      }),
    ),
    selUrges.length > 0 && el('div', { class: 'frei-day-urge-note' },
      '⚡ ' + selUrges.length + ' Urge(s) an diesem Tag gemeldet — Details im ',
      el('button', { class: 'link-btn', onClick: () => selectFreiTab('urge') }, 'Urge-Tracker')),
  );

  return el('div', {},
    el('div', { class: 'frei-stats-grid' },
      statCard(quote, 'Erfolgsquote', '#81C995'),
      statCard(String(run), 'Aktuelle Serie', '#8AB4F8'),
      statCard(String(best), 'Beste Serie', '#C58AF9'),
      statCard(String(total), 'Tage getrackt', '#E3E3E3'),
    ),
    calCard,
    dayCard,
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
    el('div', { class: 'frei-sos-text' },
      el('b', { style: 'color:#E3E3E3;' }, '3-Sekunden-Regel:'),
      ' Riskanter Gedanke oder Bild? Innerhalb von 3 Sekunden bewusst wegdrehen — danach hat der Autopilot übernommen. Dann Energie umleiten:'),
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
      el('div', {},
        el('div', { class: 'frei-field-label' }, 'INTENSITÄT DES DRANGS'),
        el('div', { class: 'frei-intensity-row' },
          el('span', { class: 'range-end' }, '1'),
          el('input', {
            type: 'range', min: '1', max: '10', step: '1', value: String(d.intensity),
            onChange: (ev) => setD({ intensity: Number(ev.target.value) }),
          }),
          el('span', { class: 'range-end' }, '10'),
          el('span', { class: 'frei-intensity-val' }, String(d.intensity)),
        ),
      ),
    ),
    el('div', { class: 'frei-grid-2' },
      el('div', {},
        el('div', { class: 'frei-field-label' }, 'SITUATION'),
        el('textarea', {
          class: 'input-area', rows: 2, placeholder: 'z. B. allein zuhause, gelangweilt', value: d.situation,
          onChange: (ev) => setD({ situation: ev.target.value }),
        }),
      ),
      el('div', {},
        el('div', { class: 'frei-field-label' }, 'GERÄT'),
        el('textarea', {
          class: 'input-area', rows: 2, placeholder: 'z. B. Handy im Bett', value: d.geraet,
          onChange: (ev) => setD({ geraet: ev.target.value }),
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
          el('textarea', {
            class: 'input-area', rows: 2, placeholder: 'z. B. gestresst, einsam, Streit gehabt', value: d.gefuehl,
            onChange: (ev) => setD({ gefuehl: ev.target.value }),
          }),
        ),
        el('div', {},
          el('div', { class: 'frei-field-label' }, 'WAS HÄTTE GEHOLFEN?'),
          el('textarea', {
            class: 'input-area', rows: 2, placeholder: 'z. B. Handy nicht mit ins Bett, früher schlafen', value: d.hilfe,
            onChange: (ev) => setD({ hilfe: ev.target.value }),
          }),
        ),
      ),
    ),
    d.outcome === 'res' && el('div', {},
      el('div', { class: 'frei-field-label', style: 'color:#81C995;' }, 'WAS HAT GEHOLFEN?'),
      el('textarea', {
        class: 'input-area', rows: 2, placeholder: 'z. B. kalte Dusche, rausgegangen, Buddy angerufen, 3-Sekunden-Regel', value: d.hilfe,
        onChange: (ev) => setD({ hilfe: ev.target.value }),
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
      el('textarea', {
        class: 'input-area', rows, placeholder, value: F[key] || '',
        onChange: (ev) => {
          setFrei({ [key]: ev.target.value }, 'Freiheit & Kontrolle bearbeitet');
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

  const warumCard = el('div', { class: 'card p24' },
    el('div', { class: 'frei-card-title' }, 'Mein Warum — in meinen eigenen Worten'),
    el('div', { class: 'frei-card-sub' }, 'Deine eigenen Gründe wirken stärker als jede fremde Liste. Schreib konkret und ehrlich.'),
    el('div', { class: 'frei-grid-2' },
      field('WAS ES MICH WIRKLICH KOSTET', '#F28B82', 'z. B. Distanz zu meiner Frau, Brain Fog, verschwendete Abende, Scham am nächsten Morgen …', 'kosten', 5),
      field('WAS ICH ZURÜCKGEWINNE', '#81C995', 'z. B. echte Nähe zu meiner Frau, klarer Kopf, Selbstrespekt, Zeit und Energie für meine Ziele …', 'gewinn', 5),
    ),
    el('div', { class: 'frei-bookend' },
      field('DAS „BEAST" ENTLARVEN — DIE SUCHTSTIMME BIN NICHT ICH', '#8AB4F8', 'Welche Lügen erzählt dir die Suchtstimme? ("Nur einmal noch", "Du hast es verdient", "Es merkt ja keiner") — und was ist die rationale Antwort darauf?', 'beast', 4),
    ),
  );

  return el('div', {}, circlesCard, warumCard);
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
    el('div', { class: 'frei-intro' }, 'Systeme statt Willenskraft. Die Quote zählt — nicht der Streak. Ein Rückfall ist ein Datenpunkt, kein Urteil. Alle Daten bleiben nur auf deinem Gerät.'),
    tabsRow,
    tab === 'tagebuch' ? renderFreiTagebuch()
      : tab === 'urge' ? renderFreiUrge()
      : renderFreiGenerell(),
  );
}

// ---------- Mini-Challenges (Martin Wehrle, 52 Wochen-Impulse) ----------
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
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
  const weekNr = ((isoWeek(new Date()) - 1) % 52) + 1;
  const filter = g.challengeFilter || 'alle';

  const filtered = CHALLENGES.filter((c) => {
    const done = all[c.id] && all[c.id].done;
    return filter === 'alle' || (filter === 'erledigt' ? done : !done);
  });

  function card(c) {
    const st = all[c.id] || { done: false, doneAt: null, note: '' };
    const open = g.challengeOpen === c.id;
    const isWeek = c.id === weekNr;

    const head = el('button', {
      class: 'ch-head', onClick: () => { setGlobal({ challengeOpen: open ? null : c.id }); render(); },
    },
      el('span', { class: 'ch-nr' + (st.done ? ' done' : '') }, st.done ? '✓' : String(c.id)),
      el('span', { class: 'ch-head-text' },
        el('span', { class: 'ch-title' }, c.title, isWeek && el('span', { class: 'ch-week-badge' }, 'Diese Woche')),
        el('span', { class: 'ch-sub' }, c.subtitle),
      ),
      el('span', { class: 'ch-chevron' + (open ? ' open' : '') }, '›'),
    );

    const body = open && el('div', { class: 'ch-body' },
      c.text.map((p) => el('p', { class: 'ch-text' }, p)),
      el('textarea', {
        class: 'input-area', rows: 3,
        placeholder: 'Meine Notizen, Prognose & Erfahrungsbericht …',
        value: st.note || '',
        onChange: (ev) => {
          setChallenge(c.id, { note: ev.target.value });
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

    return el('div', { class: 'card ch-card' + (isWeek ? ' ch-current' : '') }, head, body);
  }

  const filterRow = el('div', { class: 'frei-subtabs' },
    [['alle', 'Alle'], ['offen', 'Offen'], ['erledigt', 'Erledigt']].map(([id, label]) => el('button', {
      class: 'frei-subtab-btn' + (filter === id ? ' active' : ''),
      onClick: () => { setGlobal({ challengeFilter: id }); render(); },
    }, label + (id === 'erledigt' ? ' (' + doneCount + ')' : ''))),
  );

  return el('div', { class: 'screen', 'data-screen-label': 'Mini-Challenges' },
    el('h2', { class: 'section-h2', style: 'margin-top:0;' }, 'Mini-Challenges'),
    el('div', { class: 'frei-intro' }, '52 Wochen-Impulse aus »Dieses Buch verändert dein Leben für immer« (Martin Wehrle). Eine Challenge pro Woche reicht — klein anfangen, groß wirken.'),
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
    const habits = g.habits.map((x) =>
      x.id === h.id ? { ...x, days: x.days.map((v, j) => (j === i ? !v : v)) } : x);
    setGlobal({ habits }, 'Habit Tracker aktualisiert');
    sendEvent('habit_checked', { habitId: h.id, idx: i });
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

  const addCard = el('div', { class: 'habit-add-card' },
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

  const habitCards = g.habits.map((h) => {
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
        return el('button', {
          class: 'habit-day-btn' + (d ? ' done' : '') + (isToday ? ' today' : ''),
          title: WEEKDAYS[(date.getDay() + 6) % 7] + ', ' + date.toLocaleDateString('de-DE') + ' — Tag ' + (i + 1) + (hasComment ? ' · 💬 ' + (h.comments || {})[i] : ''),
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
      return el('button', {
        class: 'habit-month-cell' + (d ? ' done' : '') + (isToday ? ' today' : ''),
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
      disziplin && el('div', { class: 'habit-disziplin-note' },
        '⚡ ', el('b', {}, 'Tag 10 erreicht — das Motivations-Tal beginnt.'),
        ' Die Motivation lässt jetzt nach. Ab heute zählt nur noch Arbeitsmoral und Disziplin.'),
      done && el('div', { class: 'habit-done-note' }, '🏆 66 Tage geschafft — diese Gewohnheit gehört jetzt dir.'),
    );
  });

  return el('div', { class: 'screen habits-screen', 'data-screen-label': 'Habit Tracker' },
    el('h2', { class: 'section-h2', style: 'margin-top:0;' }, 'Der verbindliche Wochenplan'),
    el('div', { class: 'habits-intro' },
      'Motivation ist ein kurzfristiger Impuls — danach zählen Disziplin und Gewohnheit. Formuliere ',
      el('b', { style: 'color:#E3E3E3;' }, 'Wenn-Dann-Pläne'), ' (Implementation Intentions) und tracke ',
      el('b', { style: 'color:#E3E3E3;' }, '66 Tage'), '.'),
    el('div', { class: 'habits-why' },
      '🧪 ', el('b', { style: 'color:#81C995;' }, 'Warum 66 Tage (nicht 21)?'),
      ' Studien (Lally et al., 2009) zeigen: Es dauert im Schnitt 66 Tage, bis ein Verhalten automatisiert ist. Und: ',
      el('b', { style: 'color:#81C995;' }, 'Einzelne Aussetzer zerstören den Gewohnheitsaufbau nicht'),
      ' — dein Fortschritt wird hier nie auf null gesetzt.'),
    addCard,
    toolbar,
    habitCards,
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
      el('textarea', {
        class: 'sheet-textarea', rows: 3, placeholder: 'Notiz zu diesem Tag …', value: t.draft,
        onInput: (ev) => { t.draft = ev.target.value; },
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

// ---------- Render ----------
function render() {
  const root = document.getElementById('app');
  refs.overlay = null;
  const main = el('main', {},
    state.tab === 'dashboard' ? renderDashboard()
      : state.tab === 'fokus' ? renderFokus()
      : state.tab === 'habits' ? renderHabits()
      : state.tab === 'challenges' ? renderChallenges()
      : renderFrei(),
  );
  root.replaceChildren(renderHeader(), main);
  if (state.logOpen) renderOverlay();
  const sheet = renderCommentSheet();
  if (sheet) root.append(sheet);
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
  state.tab = TABS.some((t) => t.id === p.tab) ? p.tab : 'dashboard';
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
}

init();
