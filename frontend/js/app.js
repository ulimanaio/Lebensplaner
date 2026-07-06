// Lebensplaner-Frontend — Vanilla DOM, kein Build-Schritt.
// Nachbau von design_reference/Lebensplaner.dc.html, Daten via /api statt localStorage.
import { getDoc, saveDoc, flushAll, sendEvent, setSaveListener } from './api.js';

const AREAS = [
  { id: 'koerper', name: 'Körper & Geist', color: '#8AB4F8', placeholder: 'Ich fühle mich unbesiegbar. Nichts kann mir etwas anhaben, ich durchstehe jede Krise und jedes körperliche Gebrechen (Terminator-Modus).' },
  { id: 'soziales', name: 'Soziales', color: '#81C995', placeholder: 'Ein enger Kreis echter Freunde, den ich regelmäßig sehe und auf den ich mich zu 100 % verlassen kann.' },
  { id: 'liebe', name: 'Liebe', color: '#F28B82', placeholder: 'Verheiratet, eine Frau, die mich unterstützt, wo man füreinander da ist.' },
  { id: 'finanzen', name: 'Finanzen', color: '#FDD663', placeholder: 'Ein spezifischer Bestand an Immobilien und Barvermögen, sodass ich nie wieder arbeiten muss und von meinem Leben zehren kann.' },
  { id: 'karriere', name: 'Karriere', color: '#C58AF9', placeholder: 'Ich arbeite an Projekten, die mich fordern, mit voller Autonomie — und werde dafür exzellent bezahlt.' },
  { id: 'sinn', name: 'Sinn', color: '#78D9EC', placeholder: 'Mindestens für X Euro Futter an Tierheime spenden und diese aktiv besuchen.' },
];

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'fokus', label: 'Fokus & Ziele' },
  { id: 'habits', label: 'Habit Tracker' },
  { id: 'frei', label: 'Freiheit' },
];

const JAHR_DEFAULT = 2026;

const state = {
  year: JAHR_DEFAULT,
  tab: 'dashboard',
  doc: null,      // Dokument 'year-<jahr>'
  uilog: [],      // Dokument 'uilog' (Anzeige-Verlauf, max. 400)
  logOpen: false,
  savedAt: null,
  saveFlash: false,
  saveError: false,
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
  const showYearPicker = state.tab !== 'habits' && state.tab !== 'frei';
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

// ---------- Platzhalter für noch nicht umgesetzte Tabs ----------
function renderPlaceholder(label) {
  return el('div', { class: 'screen' },
    el('div', { class: 'placeholder-card' },
      label + ' wird als Nächstes nach der Design-Referenz umgesetzt.'),
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
      : state.tab === 'fokus' ? renderPlaceholder('„Fokus & Ziele"')
      : state.tab === 'habits' ? renderPlaceholder('Der Habit Tracker')
      : renderPlaceholder('„Freiheit & Kontrolle"'),
  );
  root.replaceChildren(renderHeader(), main);
  if (state.logOpen) renderOverlay();
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
    const [doc, uilog] = await Promise.all([
      loadYearDoc(state.year),
      getDoc('uilog').then((l) => (Array.isArray(l) ? l : [])),
    ]);
    state.doc = doc;
    state.uilog = uilog;
  } catch (e) {
    renderBoot('Die API antwortet nicht. Läuft der Server? (' + e.message + ')', true, init);
    return;
  }
  render();
}

init();
