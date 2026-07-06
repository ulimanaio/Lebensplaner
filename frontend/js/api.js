// Dünner Fetch-Wrapper für die JSON-API: Dokumente lesen, debounced speichern, Events melden.
const DEBOUNCE_MS = 1000;
const timers = new Map(); // key -> Timeout
const dirty = new Map();  // key -> noch nicht gespeicherter Wert
let saveListener = null;  // ok:boolean -> void, für den Speicher-Indikator

export function setSaveListener(fn) { saveListener = fn; }

export async function getDoc(key) {
  const r = await fetch('/api/doc/' + encodeURIComponent(key));
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('GET /api/doc/' + key + ' → ' + r.status);
  return r.json();
}

// Speichern mit ~1 s Debounce pro Dokument-Key (wie im Prototyp, nur gegen den Server).
export function saveDoc(key, value) {
  dirty.set(key, value);
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => flushKey(key), DEBOUNCE_MS));
}

async function flushKey(key, keepalive = false) {
  if (!dirty.has(key)) return;
  const value = dirty.get(key);
  dirty.delete(key);
  try {
    const r = await fetch('/api/doc/' + encodeURIComponent(key), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
      keepalive,
    });
    if (!r.ok) throw new Error(String(r.status));
    if (saveListener) saveListener(true);
  } catch (e) {
    // Wert behalten, damit der nächste Save/Flush ihn erneut versucht
    if (!dirty.has(key)) dirty.set(key, value);
    if (saveListener) saveListener(false);
  }
}

export function flushAll(keepalive = false) {
  for (const key of [...dirty.keys()]) {
    clearTimeout(timers.get(key));
    flushKey(key, keepalive);
  }
}

export function sendEvent(type, payload) {
  fetch('/api/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, payload: payload ?? null }),
    keepalive: true,
  }).catch(() => {});
}

// Beim Verlassen/Wechseln der Seite ausstehende Änderungen noch rausschicken
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushAll(true);
});
window.addEventListener('pagehide', () => flushAll(true));
