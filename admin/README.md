# Pilot India admin

Local dashboard for editing the static site.

    npm install          # once (parse5)
    node serve.mjs 8080  # then open http://localhost:8080/admin

- **Visual editor**: open any page, click text, an image or a background, edit it on the right, then Save.
  Ids are tied to the file version; after each save the preview reloads.
- **Products**: grouped by series. Add = copy of the last product, then edit it. Phone copies stay in sync.
- **Blog**: edit posts or write a new one (created from an existing post, added to `category/blog.html` and
  `pages/blogs.html`).
- **Media**: uploads go to `assets/img/uploads/` (PDFs to `assets/media/uploads/`).
- **Theme & UI**: edits the tokens in `theme/theme.css` (`:root`) and `assets/css/pg-series.css` (`.pg-series`).

Every save keeps the previous file in `admin-backups/` (not committed); "Undo to here" on the dashboard restores it.
Locally there is no login unless `ADMIN_PASSWORD` is set.

## Production (Railway + Postgres)

Railway rebuilds the disk from git on every deploy, so in production admin edits are kept in Postgres
(`store.mjs`, table `site_files`): every file the admin writes, uploads or deletes becomes a database row,
and that row wins over the copy in git. Pages nobody edited are served straight from the repo.

Set on the Railway web service:

| variable | value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference to the Postgres service) |
| `ADMIN_PASSWORD` | a long password; required, `/admin` stays disabled without it |
| `SESSION_SECRET` | optional, random string; sessions are signed with it |
| `PGSSL` | `require` only when connecting through Railway's public proxy |

Run **one replica** (railway.json sets this): edited files are cached in memory per process.

Getting production edits back into git: `DATABASE_URL=<public url> npm run db:pull` writes them into the
working tree; commit them, then `npm run db:pull -- --clear` removes those rows so git is the only copy
again. Until you clear them, a later git change to the same file is hidden by the database copy.
