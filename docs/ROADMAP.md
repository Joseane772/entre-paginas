# Roadmap

## Milestone 1: catalogue with real data (in progress)

- [x] Schema: works, authors, series (ordered), editions (PT/BR), adaptations
- [x] Importers: Open Library, Wikidata, Wikipédia, TMDB (optional), Google Books (optional)
- [x] Book page: synopsis, reading order, adaptations, where to buy, languages, Portuguese editions
- [x] Search (accent-insensitive) with on-demand import from Open Library
- [x] Title curation: checked-in overrides (`src/data/curation.ts`, `npm run curate`) for titles,
      synopses, notes and series membership; slugs follow titles with redirects
- [ ] Curate the rest of the catalogue as it grows; an admin screen for this comes with accounts (M2)
- [ ] Show only the top adaptations by default; collapse games and minor ones (The Witcher has 13)
- [ ] Series page (`/saga/[slug]`) and author page (`/autor/[slug]`)
- [ ] Background refresh job (re-import stale books weekly)
- [ ] Transparent/SVG logo for dark mode

## Milestone 2: accounts and reading status (in progress)

- [x] Auth with Better Auth: email + password, Google (optional), password reset by email,
      rate-limited auth endpoints, admin role and suspensions
- [x] `reading_status` (quero ler / a ler / li, with dates), `reviews` (1–5 + text, spoiler flag)
- [x] A minha estante, account page (name, password, data export, delete account)
- [x] Imports for signed-in readers only, limited per hour (`import_events`)
- [x] Admin: overview, users, per-book corrections (`work_overrides`) and re-import
- [ ] Email verification (needs a real SMTP provider in production)
- [ ] Public reader profiles and following other readers
- [ ] Community-added books (`works.status = 'pending'`) with a review queue, for books Open
      Library doesn't have (the prototype's "add a book" form)
- [ ] Reporting reviews; moderation queue

## Milestone 3: community

- Fidelity votes per adaptation (`fiel / razoável / livre`), aggregated on the book page
- Discussions per book, series and genre; spoilers hidden by chapter
  (`threads.spoiler_up_to_chapter`, readers set their progress)
- Moderation tools and reporting

## Milestone 4: BookBox (core business)

- [x] Taste questionnaire (from the prototype) → `taste_profiles`
  (genres, format, pace, series vs standalone, adaptations, language, surprise preference,
  plus books the reader loved)
- Exclusion list built from reading status ("li") so nobody gets a book they've read
- Plans: Independente (one-off), Plano Mensal (subscription), Presente (gift)
- Stripe Checkout + Billing (subscriptions, gift codes), webhooks → `subscriptions`, `orders`
- Curation back-office: pick each subscriber's monthly book, using recommendations plus
  manual override; `box_shipments` with stock and tracking
- Shipping in Portugal (CTT etc.), VAT on books (6% in PT)

## Milestone 5: recommendations (started)

- [x] Weighted item-item similarity: genres, subjects, author, saga, era, readers' "parecido com"
      votes (count from 2 votes) and co-likes; "Livros parecidos" on each book page
- [x] "Para ti": personal recommendations from the questionnaire, shelves and ratings, with reasons
- [ ] "Não me interessa" on a recommendation, and "não é parecido" votes
- [ ] Precompute features and pair scores in a table once the catalogue reaches thousands of books
- [ ] Use format and pace answers once editions record e-book/audiobook availability
- [ ] Same signals feed BookBox curation

## Open questions

- Affiliate programmes with Portuguese bookshops (Wook, Bertrand) for the "Onde comprar" links
- Whether a library lookup by ISBN is possible beyond the PORBASE home page
