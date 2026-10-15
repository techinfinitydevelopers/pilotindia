// Durable file layer for production (Railway).
//
// Railway's disk is rebuilt from git on every deploy, so anything the admin writes to disk would be
// lost. When DATABASE_URL is set, every file the admin creates, changes or deletes is kept in one
// Postgres table (site_files) instead, and the database copy wins over the copy in git:
//
//   read   -> the database row if there is one, otherwise the file from the repo
//   write  -> the database row (the repo file is never touched)
//   delete -> a tombstone row, so the repo copy is hidden too
//
// The table is loaded into memory at startup (it only holds edited files), and Node's fs functions
// are wrapped for paths inside the repo, so serve.mjs, admin/server.mjs and the tools they run work
// unchanged. Writes go to Postgres in the background; flush() waits for them, and the admin only
// answers "saved" after flush() succeeds.
//
// Without DATABASE_URL nothing is wrapped and everything works on plain files, as before.
//
//   node tools/db-pull.mjs   copies the database edits into the working tree so they can be committed.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const orig = {
  existsSync: fs.existsSync, readFileSync: fs.readFileSync, writeFileSync: fs.writeFileSync,
  statSync: fs.statSync, readdirSync: fs.readdirSync, mkdirSync: fs.mkdirSync,
  copyFileSync: fs.copyFileSync, unlinkSync: fs.unlinkSync,
};

let REPO = '';
let pool = null;
const files = new Map();        // repo-relative posix path -> { buf: Buffer | null (deleted), mtime: ms }
const dirs = new Set();         // every directory that holds at least one live database file
const pending = new Set();      // database writes in flight
let failure = null;             // first failed write since the last flush()

export const dbMode = () => pool !== null;
// the Postgres pool for modules that keep their own tables (leads.mjs); null when running on plain files
export const dbPool = () => pool;

export async function initStore(repoRoot) {
  REPO = path.resolve(repoRoot);
  if (!process.env.DATABASE_URL) return false;
  const { default: pg } = await import('pg');
  const ssl = /^(require|true|1)$/i.test(process.env.PGSSL || '') ? { rejectUnauthorized: false } : undefined;
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl, max: 4 });
  await pool.query(`create table if not exists site_files (
    path text primary key,
    body bytea,
    deleted boolean not null default false,
    updated_at timestamptz not null default now())`);
  await pool.query('alter table site_files add column if not exists base_sha text');
  let { rows } = await pool.query('select path, body, deleted, updated_at, base_sha from site_files');
  rows = await githubWins(rows);
  for (const r of rows) files.set(r.path, { buf: r.deleted ? null : r.body, mtime: new Date(r.updated_at).getTime() });
  rebuildDirs();
  wrapFs();
  console.log(`store: Postgres, ${rows.length} edited file(s) loaded`);
  return true;
}

// ---------------------------------------------------------------- GitHub wins when it changed
// A saved (admin) copy normally wins over the file in git, which hid every later push for that page. Now each saved copy
// remembers a fingerprint of the git file it was made from (base_sha). When the app starts and the git file differs from that
// fingerprint, GitHub's newer version goes live and the admin copy is kept under admin-backups/git-won/<time>/<path>.
// Copies made before this rule existed (no fingerprint) are retired the same way, once. Never touched: admin-made files that
// have no git version, deletions, and the admin's own data (data/, tools/*.json, admin-backups/).
const EXEMPT = /^(admin-backups|data)\/|^tools\/[^/]+\.json$/;
const sha = buf => createHash('sha1').update(buf).digest('hex');
function gitSha(r) {
  const abs = path.join(REPO, r);
  try { return orig.existsSync(abs) && orig.statSync(abs).isFile() ? sha(orig.readFileSync(abs)) : ''; } catch (e) { return ''; }
}
async function githubWins(rows) {
  const keep = [], won = [], stamp = new Date().toISOString().replace(/[:.]/g, '-');
  for (const r of rows) {
    if (r.deleted || EXEMPT.test(r.path)) { keep.push(r); continue; }
    const g = gitSha(r.path);
    if (!g) {                                 // no git version: a file made in the admin; remember it as such
      if (r.base_sha == null) await pool.query("update site_files set base_sha = '' where path = $1", [r.path]);
      keep.push(r); continue;
    }
    if (r.base_sha == null || (r.base_sha !== '' && r.base_sha !== g)) won.push(r); else keep.push(r);
  }
  for (const r of won) {
    await pool.query(
      "insert into site_files (path, body, deleted, updated_at, base_sha) values ($1, $2, false, now(), '') on conflict (path) do update set body = excluded.body, updated_at = now()",
      ['admin-backups/git-won/' + stamp + '/' + r.path, r.body]);
    await pool.query('delete from site_files where path = $1', [r.path]);
  }
  if (won.length) console.log('store: GitHub is newer than ' + won.length + ' admin-saved file(s); serving the GitHub version (admin copies kept in admin-backups/git-won/' + stamp + '/): ' + won.map(r => r.path).join(', '));
  return keep;
}

// Resolves when every database write so far has landed; throws if any of them failed.
export async function flush() {
  while (pending.size) await Promise.allSettled([...pending]);
  if (failure) { const e = failure; failure = null; throw e; }
}

// Keeps a promise (e.g. an in-process tool run) inside the next flush().
export function track(promise) {
  const p = Promise.resolve(promise).catch(e => { failure = failure || e; });
  pending.add(p);
  p.finally(() => pending.delete(p));
  return promise;
}

// Every edited file, for tools/db-pull.mjs.
export async function allRows() {
  const { rows } = await pool.query('select path, body, deleted from site_files order by path');
  return rows;
}
export async function close() { if (pool) await pool.end(); }

// ---------------------------------------------------------------- internals
function rel(p) {
  if (typeof p !== 'string' && !(p instanceof URL)) return null;
  const abs = path.resolve(p instanceof URL ? p.pathname.replace(/^\/([A-Za-z]:)/, '$1') : p);
  if (abs !== REPO && !abs.startsWith(REPO + path.sep)) return null;
  const r = path.relative(REPO, abs).split(path.sep).join('/');
  if (!r || /^(node_modules|\.git)(\/|$)/.test(r)) return null;
  return r;
}

function rebuildDirs() {
  dirs.clear();
  for (const [k, v] of files) if (v.buf) addDirs(k);
}
function addDirs(k) {
  for (let i = k.lastIndexOf('/'); i > 0; i = k.lastIndexOf('/', i - 1)) dirs.add(k.slice(0, i));
}

function put(r, buf) {
  files.set(r, { buf, mtime: Date.now() });
  if (buf) addDirs(r); else rebuildDirs();
  const q = pool.query(
    `insert into site_files (path, body, deleted, updated_at, base_sha) values ($1, $2, $3, now(), $4)
     on conflict (path) do update set body = excluded.body, deleted = excluded.deleted, updated_at = now()`,
    [r, buf, !buf, gitSha(r)]);
  track(q);
}

function enoent(p, call) {
  const e = new Error(`ENOENT: no such file or directory, ${call} '${p}'`);
  e.code = 'ENOENT'; e.errno = -2; e.syscall = call; e.path = String(p);
  return e;
}

function fakeStat(size, mtime, isDir) {
  const d = new Date(mtime);
  return {
    size, mtimeMs: mtime, mtime: d, ctimeMs: mtime, ctime: d, birthtimeMs: mtime, birthtime: d,
    isFile: () => !isDir, isDirectory: () => isDir, isSymbolicLink: () => false,
  };
}
const dirent = (name, isDir) => ({ name, isFile: () => !isDir, isDirectory: () => isDir, isSymbolicLink: () => false });

function wrapFs() {
  fs.existsSync = function (p) {
    const r = rel(p);
    if (r !== null) {
      const f = files.get(r);
      if (f) return !!f.buf;
      if (dirs.has(r)) return true;
    }
    return orig.existsSync(p);
  };

  fs.readFileSync = function (p, opts) {
    const r = rel(p);
    const f = r !== null && files.get(r);
    if (!f) return orig.readFileSync(p, opts);
    if (!f.buf) throw enoent(p, 'open');
    const enc = typeof opts === 'string' ? opts : opts && opts.encoding;
    return enc ? f.buf.toString(enc) : Buffer.from(f.buf);
  };

  fs.writeFileSync = function (p, data, opts) {
    const r = rel(p);
    if (r === null) return orig.writeFileSync(p, data, opts);
    const enc = (typeof opts === 'string' ? opts : opts && opts.encoding) || 'utf8';
    const buf = Buffer.isBuffer(data) ? Buffer.from(data)
      : ArrayBuffer.isView(data) ? Buffer.from(data.buffer, data.byteOffset, data.byteLength)
      : Buffer.from(String(data), enc);
    put(r, buf);
  };

  fs.copyFileSync = function (src, dst, mode) {
    if (rel(dst) === null) return orig.copyFileSync(src, dst, mode);
    fs.writeFileSync(dst, fs.readFileSync(src));
  };

  fs.unlinkSync = function (p) {
    const r = rel(p);
    if (r === null) return orig.unlinkSync(p);
    if (!fs.existsSync(p)) throw enoent(p, 'unlink');
    put(r, null);
  };

  fs.mkdirSync = function (p, opts) {
    if (rel(p) === null) return orig.mkdirSync(p, opts);
    return undefined;   // directories exist implicitly once a file is written into them
  };

  fs.statSync = function (p, opts) {
    const r = rel(p);
    if (r !== null) {
      const f = files.get(r);
      if (f) {
        if (f.buf) return fakeStat(f.buf.length, f.mtime, false);
        if (opts && opts.throwIfNoEntry === false) return undefined;
        throw enoent(p, 'stat');
      }
      if (dirs.has(r) && !orig.existsSync(p)) return fakeStat(0, Date.now(), true);
    }
    return orig.statSync(p, opts);
  };

  fs.readdirSync = function (p, opts) {
    const r = rel(p);
    if (r === null) return orig.readdirSync(p, opts);
    const withTypes = opts && typeof opts === 'object' && opts.withFileTypes;
    const out = new Map();     // name -> isDir
    if (orig.existsSync(p) && orig.statSync(p).isDirectory()) {
      for (const d of orig.readdirSync(p, { withFileTypes: true })) out.set(d.name, d.isDirectory());
    } else if (!dirs.has(r)) {
      return orig.readdirSync(p, opts);   // throws the normal ENOENT
    }
    const prefix = r + '/';
    for (const [k, v] of files) {
      if (!k.startsWith(prefix)) continue;
      const rest = k.slice(prefix.length);
      const slash = rest.indexOf('/');
      if (slash >= 0) { if (v.buf) out.set(rest.slice(0, slash), true); continue; }
      if (v.buf) out.set(rest, false); else if (out.get(rest) === false) out.delete(rest);
    }
    const names = [...out.keys()].sort();
    return withTypes ? names.map(n => dirent(n, out.get(n))) : names;
  };
}
