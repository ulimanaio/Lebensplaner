// Lebensplaner — Single-Container-Server
// Statisches Frontend + JSON-API + verschlüsselte SQLite in einem Prozess.
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import Database from 'better-sqlite3-multiple-ciphers';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || '/data';
const DB_PATH = path.join(DATA_DIR, 'lebensplaner.db');
const PASSPHRASE = process.env.DB_PASSPHRASE;
const PIN = process.env.APP_PIN || null;
const PORT = Number(process.env.PORT) || 8484;

if (!PASSPHRASE) {
  console.error('FEHLER: Env-Variable DB_PASSPHRASE ist nicht gesetzt.');
  process.exit(1);
}
fs.mkdirSync(DATA_DIR, { recursive: true });

// --- Datenbank öffnen (SQLCipher-Verschlüsselung) ---
const db = new Database(DB_PATH);
db.pragma(`key='${PASSPHRASE.replace(/'/g, "''")}'`);
db.pragma('journal_mode = WAL');

// --- Migrationen anwenden (db/migrations/NNN_*.sql, aufsteigend) ---
db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)');
const row = db.prepare('SELECT version FROM schema_version').get();
let version = row ? row.version : 0;
if (!row) db.prepare('INSERT INTO schema_version VALUES (0)').run();

const migDir = path.join(__dirname, '..', 'db', 'migrations');
const migrations = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
for (const file of migrations) {
  const num = parseInt(file, 10);
  if (Number.isNaN(num) || num <= version) continue;
  console.log('Migration:', file);
  db.exec(fs.readFileSync(path.join(migDir, file), 'utf8'));
  db.prepare('UPDATE schema_version SET version = ?').run(num);
  version = num;
}

// --- Prepared Statements ---
const getDoc = db.prepare('SELECT json FROM documents WHERE key = ?');
const putDoc = db.prepare(`
  INSERT INTO documents (key, json, updated_at) VALUES (?, ?, datetime('now'))
  ON CONFLICT(key) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`);
const addEvent = db.prepare("INSERT INTO events (ts, type, payload) VALUES (datetime('now'), ?, ?)");

// --- Server ---
const app = Fastify({ logger: true });
app.register(fastifyStatic, { root: path.join(__dirname, '..', 'frontend') });

// Optionaler PIN-Schutz (Header x-pin) für alle API-Routen
app.addHook('onRequest', (req, reply, done) => {
  if (PIN && req.url.startsWith('/api/') && req.headers['x-pin'] !== PIN) {
    reply.code(401).send({ error: 'PIN erforderlich' });
    return;
  }
  done();
});

app.get('/api/doc/:key', (req, reply) => {
  const r = getDoc.get(req.params.key);
  if (!r) return reply.code(404).send({ error: 'not found' });
  reply.type('application/json').send(r.json);
});

app.put('/api/doc/:key', (req) => {
  const json = JSON.stringify(req.body);
  putDoc.run(req.params.key, json);
  addEvent.run('doc_saved:' + req.params.key, json);
  return { ok: true };
});

app.post('/api/event', (req) => {
  const { type, payload } = req.body || {};
  if (!type) return { error: 'type fehlt' };
  addEvent.run(String(type), JSON.stringify(payload ?? null));
  return { ok: true };
});

app.get('/api/events', (req) => {
  const { type, from, to, limit } = req.query;
  let sql = 'SELECT id, ts, type, payload FROM events WHERE 1=1';
  const args = [];
  if (type) { sql += ' AND type = ?'; args.push(type); }
  if (from) { sql += ' AND ts >= ?'; args.push(from); }
  if (to) { sql += ' AND ts <= ?'; args.push(to); }
  sql += ' ORDER BY id DESC LIMIT ?';
  args.push(Math.min(Number(limit) || 1000, 10000));
  return db.prepare(sql).all(...args).map((e) => ({ ...e, payload: JSON.parse(e.payload) }));
});

// Komplett-Export (Backup) und Import (z. B. localStorage-Dump des Prototyps)
app.get('/api/export', () => ({
  exportedAt: new Date().toISOString(),
  documents: Object.fromEntries(
    db.prepare('SELECT key, json FROM documents').all().map((d) => [d.key, JSON.parse(d.json)])
  ),
  events: db.prepare('SELECT id, ts, type, payload FROM events ORDER BY id').all(),
}));

app.post('/api/import', (req) => {
  const docs = (req.body && req.body.documents) || {};
  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(docs)) putDoc.run(key, JSON.stringify(value));
  });
  tx();
  addEvent.run('import', JSON.stringify({ keys: Object.keys(docs) }));
  return { ok: true, imported: Object.keys(docs).length };
});

app.listen({ port: PORT, host: '0.0.0.0' });
