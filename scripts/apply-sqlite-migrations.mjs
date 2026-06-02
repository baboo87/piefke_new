import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import 'dotenv/config';

const cwd = process.cwd();
const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';

if (!databaseUrl.startsWith('file:')) {
  throw new Error(`Dieses Script unterstützt nur SQLite file:-URLs. Aktuell: ${databaseUrl}`);
}

const dbPath = databaseUrl.replace(/^file:/, '');
const resolvedPath = path.resolve(cwd, dbPath);
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const db = new Database(resolvedPath);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS _manual_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  );
`);

const migrationsDir = path.resolve(cwd, 'prisma', 'migrations');
if (!fs.existsSync(migrationsDir)) {
  // eslint-disable-next-line no-console
  console.log('Keine Migrations gefunden.');
  process.exit(0);
}

const applied = new Set(
  db.prepare('SELECT id FROM _manual_migrations').all().map((row) => String(row.id)),
);

const folders = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const folder of folders) {
  if (applied.has(folder)) {
    continue;
  }

  const migrationFile = path.join(migrationsDir, folder, 'migration.sql');
  if (!fs.existsSync(migrationFile)) {
    continue;
  }

  const sql = fs.readFileSync(migrationFile, 'utf-8');
  const tx = db.transaction(() => {
    db.exec(sql);
    db.prepare('INSERT INTO _manual_migrations (id, applied_at) VALUES (?, ?)').run(
      folder,
      new Date().toISOString(),
    );
  });
  tx();
  // eslint-disable-next-line no-console
  console.log(`Migration angewendet: ${folder}`);
}

db.close();
// eslint-disable-next-line no-console
console.log('SQLite-Migrationen erfolgreich angewendet.');
