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
Publish by committing and pushing. There is no login: do not expose this server to a network.
