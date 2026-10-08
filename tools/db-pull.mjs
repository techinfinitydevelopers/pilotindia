// Copies the admin's production edits (Postgres, see store.mjs) into this working tree so they can be
// reviewed and committed. Database rows always win over git, so after committing them you may clear
// the rows (--clear) to make git the only copy again.
//
//   DATABASE_URL=... node tools/db-pull.mjs            write edited files, delete tombstoned ones
//   DATABASE_URL=... node tools/db-pull.mjs --list     only list what differs
//   DATABASE_URL=... node tools/db-pull.mjs --clear    after committing: remove the pulled rows from the database
//
// admin-backups/ rows (undo history) are skipped unless --backups is given.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
if (!process.env.DATABASE_URL) { console.error('set DATABASE_URL (Railway: Postgres service > Connect > public URL)'); process.exit(1); }
const ssl = /^(require|true|1)$/i.test(process.env.PGSSL || '') ? { rejectUnauthorized: false } : undefined;
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl });
await db.connect();
const { rows } = await db.query('select path, body, deleted, updated_at from site_files order by path');
const picked = rows.filter(r => args.has('--backups') || !r.path.startsWith('admin-backups/'));

if (args.has('--clear')) {
  const paths = picked.map(r => r.path);
  await db.query('delete from site_files where path = any($1)', [paths]);
  console.log(`cleared ${paths.length} row(s); the site now serves those files from git`);
  await db.end();
  process.exit(0);
}

let changed = 0;
for (const r of picked) {
  const abs = path.join(REPO, ...r.path.split('/'));
  const cur = fs.existsSync(abs) ? fs.readFileSync(abs) : null;
  const same = r.deleted ? cur === null : cur !== null && cur.equals(r.body);
  if (same) continue;
  changed++;
  console.log(`${r.deleted ? 'delete' : cur ? 'update' : 'add   '}  ${r.path}   (${new Date(r.updated_at).toISOString()})`);
  if (args.has('--list')) continue;
  if (r.deleted) fs.rmSync(abs, { force: true });
  else { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, r.body); }
}
console.log(`${picked.length} edited file(s) in the database, ${changed} differ from this tree${args.has('--list') ? '' : ' (written)'}`);
await db.end();
