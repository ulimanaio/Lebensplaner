// Markdown-Basics für Textfelder: fett, kursiv, durchgestrichen, Überschriften, Listen.
// Bewusst minimal und ohne externes Paket — Frontend bleibt dependency-frei.
// mdField() ersetzt ein <textarea>: zeigt gerenderten Text, Tipp darauf = bearbeiten,
// dezenter ⛶-Button öffnet den Fullscreen-Editor mit Toolbar + Vorschau.

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s) {
  return s
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>');
}

export function mdToHtml(text) {
  const out = [];
  let list = null; // 'ul' | 'ol'
  const closeList = () => { if (list) { out.push('</' + list + '>'); list = null; } };
  for (const raw of esc(text || '').split('\n')) {
    const line = raw.trimEnd();
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      closeList();
      out.push('<div class="md-h md-h' + m[1].length + '">' + inline(m[2]) + '</div>');
    } else if ((m = line.match(/^[-*]\s+(.*)$/))) {
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
      out.push('<li>' + inline(m[1]) + '</li>');
    } else if ((m = line.match(/^\d+[.)]\s+(.*)$/))) {
      if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
      out.push('<li>' + inline(m[1]) + '</li>');
    } else if (line === '') {
      closeList();
      out.push('<div class="md-gap"></div>');
    } else {
      closeList();
      out.push('<div>' + inline(line) + '</div>');
    }
  }
  closeList();
  return out.join('');
}

function h(tag, cls, ...kids) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  for (const k of kids.flat()) {
    if (k == null || k === false) continue;
    n.append(k.nodeType ? k : document.createTextNode(k));
  }
  return n;
}

const EXPAND_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h4v4"/><path d="M14 10l6-6"/><path d="M8 20H4v-4"/><path d="M10 14l-6 6"/></svg>';

// Umschließt die Auswahl mit mark (bzw. entfernt es wieder).
function wrapSel(ta, mark) {
  const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
  const sel = v.slice(s, e);
  if (sel && v.slice(s - mark.length, s) === mark && v.slice(e, e + mark.length) === mark) {
    ta.value = v.slice(0, s - mark.length) + sel + v.slice(e + mark.length);
    ta.focus();
    ta.selectionStart = s - mark.length; ta.selectionEnd = e - mark.length;
    return;
  }
  const t = sel || 'Text';
  ta.value = v.slice(0, s) + mark + t + mark + v.slice(e);
  ta.focus();
  ta.selectionStart = s + mark.length; ta.selectionEnd = s + mark.length + t.length;
}

// Setzt/entfernt ein Zeilen-Präfix (z. B. '- ' oder '## ') für alle markierten Zeilen.
function toggleLines(ta, prefix) {
  const v = ta.value;
  const s = ta.selectionStart, e = ta.selectionEnd;
  const ls = v.lastIndexOf('\n', s - 1) + 1;
  let le = v.indexOf('\n', e); if (le === -1) le = v.length;
  const block = v.slice(ls, le);
  const lines = block.split('\n');
  const allOn = lines.every((l) => l.startsWith(prefix) || !l.trim());
  const next = lines.map((l) => {
    if (!l.trim()) return l;
    if (allOn) return l.slice(prefix.length);
    return l.startsWith(prefix) ? l : prefix + l;
  }).join('\n');
  ta.value = v.slice(0, ls) + next + v.slice(le);
  ta.focus();
  ta.selectionStart = ls; ta.selectionEnd = le + (next.length - block.length);
}

export function openMdEditor(opts) {
  const ta = h('textarea', 'mdfs-ta');
  ta.value = opts.value || '';
  ta.placeholder = opts.placeholder || '';
  const prev = h('div', 'mdfs-prev md-render');
  prev.style.display = 'none';
  let preview = false;

  function iconBtn(cls, label, aria, fn) {
    const b = h('button', cls, label);
    b.type = 'button';
    b.setAttribute('aria-label', aria);
    b.addEventListener('click', fn);
    return b;
  }

  const eye = iconBtn('mdfs-icon', '👁', 'Vorschau umschalten', () => {
    preview = !preview;
    prev.innerHTML = mdToHtml(ta.value);
    prev.style.display = preview ? '' : 'none';
    ta.style.display = preview ? 'none' : '';
    bar.style.visibility = preview ? 'hidden' : 'visible';
    eye.textContent = preview ? '✏️' : '👁';
    eye.classList.toggle('active', preview);
    if (!preview) ta.focus();
  });

  const bar = h('div', 'mdfs-bar',
    iconBtn('mdfs-btn mdfs-b', 'B', 'Fett', () => wrapSel(ta, '**')),
    iconBtn('mdfs-btn mdfs-i', 'I', 'Kursiv', () => wrapSel(ta, '*')),
    iconBtn('mdfs-btn mdfs-s', 'S', 'Durchgestrichen', () => wrapSel(ta, '~~')),
    iconBtn('mdfs-btn', 'H', 'Überschrift', () => toggleLines(ta, '## ')),
    iconBtn('mdfs-btn', '• Liste', 'Aufzählung', () => toggleLines(ta, '- ')),
  );

  const ov = h('div', 'mdfs',
    h('div', 'mdfs-head',
      iconBtn('mdfs-icon', '✕', 'Abbrechen', close),
      h('div', 'mdfs-title', opts.title || 'Bearbeiten'),
      eye,
      iconBtn('mdfs-icon mdfs-save', '✓', 'Speichern', () => { opts.onSave(ta.value); close(); }),
    ),
    ta, prev, bar,
  );
  ov.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') close(); });

  function close() {
    ov.remove();
    document.body.style.overflow = '';
  }

  document.body.append(ov);
  document.body.style.overflow = 'hidden';
  ta.focus();
}

// Drop-in-Ersatz für el('textarea', …): gerenderte Ansicht + Inline-Edit + Fullscreen.
// opts: { value, rows, placeholder, title, className ('input-area'), onCommit(text) }
export function mdField(opts) {
  const cls = opts.className || 'input-area';
  const ta = h('textarea', cls);
  ta.rows = opts.rows || 3;
  ta.placeholder = opts.placeholder || '';
  ta.value = opts.value || '';
  let committed = ta.value;

  const view = h('div', cls + ' md-render md-view');
  view.style.minHeight = ((opts.rows || 3) * 20 + 24) + 'px';

  function commit(v) {
    if (v === committed) return;
    committed = v;
    opts.onCommit(v);
  }
  function showView() {
    view.innerHTML = mdToHtml(ta.value);
    ta.style.display = 'none';
    view.style.display = '';
  }
  function showEdit() {
    view.style.display = 'none';
    ta.style.display = '';
    ta.focus();
  }

  ta.addEventListener('change', () => commit(ta.value));
  ta.addEventListener('blur', () => { if (ta.value.trim()) showView(); });
  view.addEventListener('click', showEdit);

  const ex = h('button', 'md-expand');
  ex.type = 'button';
  ex.setAttribute('aria-label', 'Im Fullscreen-Editor bearbeiten (Markdown)');
  ex.title = 'Fullscreen · Markdown';
  ex.innerHTML = EXPAND_ICON;
  ex.addEventListener('click', () => openMdEditor({
    title: opts.title,
    value: ta.value,
    placeholder: opts.placeholder,
    onSave: (v) => {
      ta.value = v;
      commit(v);
      if (v.trim()) showView(); else showEdit();
    },
  }));

  if (ta.value.trim()) showView(); else view.style.display = 'none';
  return h('div', 'md-field', ta, view, ex);
}
