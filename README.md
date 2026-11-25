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

## Getting started

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

Books that are only known as part of a series are stored as `stub` works (title, year, position).
Their page has a button that loads the rest of their data.

## Layout

```
src/app/                  routes: / , /pesquisa, /livro/[slug], /bookbox, server actions
src/components/           UI pieces (Cover, BookGrid, SearchBox, ImportButton)
src/db/schema.ts          Drizzle schema (catalogue tables)
src/lib/sources/          one client per external API
src/lib/import/           importWork(): merges all sources and upserts in one transaction
src/lib/data/catalogue.ts cached reads for pages ('use cache' + the "catalogue" tag)
scripts/                  CLI import and seed list
drizzle/                  SQL migrations (0001 adds unaccent/pg_trgm for search)
```

## Data notes

- **PT vs BR editions** are told apart by ISBN group (972/989 = Portugal, 85/65 = Brazil), falling
  back to place of publication.
- **Titles**: the Wikidata `pt` label is used only when it differs from the original title (it's
  often just a copy of it). Otherwise the most common Portuguese edition title is used, then the
  Portuguese Wikipédia article title.
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
