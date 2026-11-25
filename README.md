# Entre Páginas

A Portuguese (pt-PT) book site where each book is the hub for everything around it: the series
reading order, film/series/game adaptations, which editions exist in Portugal vs Brazil, and where
to buy or borrow it. A BookBox subscription (a monthly surprise book chosen from your reading
profile) is planned as a core feature.

The original concept is in [docs/idea.txt](docs/idea.txt). The clickable prototype is in
[docs/prototype/](docs/prototype/), and [docs/ROADMAP.md](docs/ROADMAP.md) has what comes next.

## Stack

- Next.js 16 (App Router, Cache Components) + TypeScript
- Postgres 17 (Docker) with Drizzle ORM
- Data: Open Library (works, editions), Wikidata (series, adaptations, Portuguese titles),
  Wikipédia (Portuguese synopses), TMDB (posters, pt-PT synopses; optional), Google Books
  (extra Portuguese editions; optional)

## Run it on your own computer (any OS)

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows, macOS) or
Docker Engine (Linux), then in this folder:

```bash
docker compose up
```

Open http://localhost:3000. The first start builds the image (a few minutes) and loads a snapshot
of the catalogue, so there are books straight away. The first account you create becomes admin.
Everything is kept in Docker volumes between restarts. Stop it with `Ctrl+C`, or run
`docker compose up -d` to keep it in the background and `docker compose down` to stop it.

Options go in a `.env` file next to `docker-compose.yml` (see `.env.example`), e.g. `PORT=8080`,
`ADMIN_EMAILS=...`, `TMDB_READ_TOKEN=...`. To reach it from other devices on your network, set
`PUBLIC_URL=http://<your-computer's-ip>:3000`.

## Deploying

See [docs/DEPLOY.md](docs/DEPLOY.md) (Vercel + Neon, both on free plans).

## Development

```bash
npm install
cp .env.example .env        # add TMDB_READ_TOKEN / GOOGLE_BOOKS_API_KEY if you have them
npm run db:up               # Postgres on localhost:5433
npm run db:migrate
npm run seed                # imports ~10 books and their series (takes a few minutes)
npm run dev
```

## Importing books

```bash
npm run import -- "the name of the wind rothfuss"   # search Open Library, import top hit
npm run import -- --ol OL893414W                    # by Open Library work id
npm run import -- --wd Q190192                      # by Wikidata id
npm run import -- "the last wish" --series          # also fully import the rest of the series
```

From the site, searching shows Open Library results with an **Importar** button. Imports are
idempotent: re-running one refreshes the same rows.

## Accounts

Sign-in uses [Better Auth](https://www.better-auth.com) with email + password, plus Google when
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set. Readers can:

- mark books as **Quero ler / A ler / Li** (dates fill in on their own) and see them on
  **A minha estante** (`/estante`);
- rate 1–5 and write a review, with a "tem spoilers" option that hides the text behind a click;
- import books from Open Library (signed-in only, `IMPORTS_PER_HOUR` per reader, default 10);
- change name and password, download their data as JSON, and delete their account (`/conta`).

**Admins** get `/admin`: an overview, the user list (promote, suspend), and a correction editor per
book (title, original title, synopsis, note, "not a book of this series") with a re-import button.
Corrections made there are stored in `work_overrides` and win over `src/data/curation.ts`.
Whoever is listed in `ADMIN_EMAILS` becomes admin on sign-up; if it's empty, the first account
does. `npm run make-admin -- email` promotes an existing account.

Password-reset emails go through `SMTP_URL`. Without it, the link is printed in the server log.
Sign-in, sign-up and password endpoints are rate-limited (state kept in Postgres, so it works on
serverless hosts too).

## Correcting titles

Sources often get Portuguese titles wrong: Wikidata's "pt" label is frequently the Brazilian
title ("A Sociedade do Anel" instead of "A Irmandade do Anel"), and edition records are typed by
hand. Corrections live in [src/data/curation.ts](src/data/curation.ts), keyed by Wikidata id:

```ts
Q208002: { title: "A Irmandade do Anel", source: "Europa-América; pt.wikipedia" },
Q1751870: { title: "A Guerra dos Tronos", note: "Em Portugal ... em dois volumes ..." },
Q334335: { hideFromSeries: true },               // appendix, not a volume
```

Every import applies them, so re-imports don't undo them. To apply them to the existing database
without re-importing, run `npm run curate` and restart the server. When a title changes, the slug
follows it and the old URL redirects. Check the title on a Portuguese bookshop (Wook, Bertrand) or
the publisher before adding it.

Books that are only known as part of a series are stored as `stub` works (title, year, position).
Their page has a button that loads the rest of their data.

## Layout

```
src/app/                  routes: / , /pesquisa, /livro/[slug], /bookbox, /entrar, /conta,
                          /estante, /admin, server actions; /api/auth/* is Better Auth
src/components/           UI pieces (Cover, BookGrid, SearchBox, ImportButton, auth/, reading/, admin/)
src/lib/auth.ts           Better Auth config (lib/session.ts has the page/action helpers)
src/db/schema.ts          Drizzle schema (catalogue, accounts, reading status, reviews, overrides)
src/lib/sources/          one client per external API
src/lib/import/           importWork(): merges all sources and upserts in one transaction
src/lib/data/catalogue.ts cached reads for pages ('use cache' + the "catalogue" tag)
scripts/                  CLI import and seed list
drizzle/                  SQL migrations (0001 adds unaccent/pg_trgm for search)
```

## Data notes

- **PT vs BR editions** are told apart by ISBN group (972/989 = Portugal, 85/65 = Brazil), falling
  back to place of publication.
- **Titles**: a curated title wins. Otherwise the Wikidata `pt` label is used when it differs from
  the original title (it's often just a copy of it), then the most common Portugal edition title
  (cleaned of "Livro I"-style suffixes), then the Portuguese Wikipédia article title.
- **Series** from Wikidata are cleaned up: sub-parts of volumes, unnumbered short stories and
  duplicate items are dropped.
- Wikidata needs an identifying `User-Agent`. Set `DATA_USER_AGENT` in `.env` to something with a
  project URL or contact address before doing large imports.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` / `lint` | tsc / eslint |
| `npm run db:up` | start Postgres in Docker |
| `npm run db:generate` | create a migration from schema changes |
| `npm run db:migrate` | apply migrations |
| `npm run db:studio` | Drizzle Studio |
| `npm run import` / `seed` | import books |
| `npm run curate` | apply [src/data/curation.ts](src/data/curation.ts) to the database |
| `npm run make-admin -- email` | give an account the admin role |
| `npm run snapshot` | refresh the catalogue snapshot loaded by `docker compose up` |
| `npm run db:load-snapshot` | load that snapshot into an empty database (e.g. Neon) |
