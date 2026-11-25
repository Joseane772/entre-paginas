# Roadmap

## Milestone 1: catalogue with real data ✅ (in progress)

- [x] Schema: works, authors, series (ordered), editions (PT/BR), adaptations
- [x] Importers: Open Library, Wikidata, Wikipédia, TMDB (optional), Google Books (optional)
- [x] Book page: synopsis, reading order, adaptations, where to buy, languages, Portuguese editions
- [x] Search (accent-insensitive) with on-demand import from Open Library
- [ ] Title curation: let an admin override a bad title or synopsis (some edition titles are messy,
      e.g. "O Jogos Da Fome. Livro I"; some books have no Portuguese title on Wikidata yet)
- [ ] Show only the top adaptations by default; collapse games and minor ones (The Witcher has 13)
- [ ] Series page (`/saga/[slug]`) and author page (`/autor/[slug]`)
- [ ] Background refresh job (re-import stale books weekly)
- [ ] Transparent/SVG logo for dark mode

## Milestone 2: accounts and reading status

- Auth (Auth.js or Better Auth; email magic link + Google)
- `users`, `reading_status` (quero ler / a ler / li, with dates), `ratings` (1–5 + review)
- Protect and rate-limit on-demand imports (currently open to anyone)
- Community-added books (`works.status = 'pending'`) with a review queue

## Milestone 3: community

- Fidelity votes per adaptation (`fiel / razoável / livre`), aggregated on the book page
- Discussions per book, series and genre; spoilers hidden by chapter
  (`threads.spoiler_up_to_chapter`, readers set their progress)
- Moderation tools and reporting

## Milestone 4: BookBox (core business)

- Taste questionnaire (from the prototype) → `taste_profiles`
  (genres, format, pace, series vs standalone, adaptations, language, surprise preference)
- Exclusion list built from reading status ("li") so nobody gets a book they've read
- Plans: Independente (one-off), Plano Mensal (subscription), Presente (gift)
- Stripe Checkout + Billing (subscriptions, gift codes), webhooks → `subscriptions`, `orders`
- Curation back-office: pick each subscriber's monthly book, using recommendations plus
  manual override; `box_shipments` with stock and tracking
- Shipping in Portugal (CTT etc.), VAT on books (6% in PT)

## Milestone 5: recommendations

- "Leitores com gostos parecidos" from reading status + ratings (start with item-item similarity)
- Same signals feed BookBox curation

## Open questions

- Affiliate programmes with Portuguese bookshops (Wook, Bertrand) for the "Onde comprar" links
- Whether a library lookup by ISBN is possible beyond the PORBASE home page
