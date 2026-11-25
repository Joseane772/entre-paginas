import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/*
 * Catalogue (milestone 1): works, authors, series, editions, adaptations.
 * Accounts (milestone 2): Better Auth tables, reading status, reviews, curation overrides.
 * Recommendations: taste profiles (questionnaire) and readers' "similar book" votes.
 * Planned next (see docs/ROADMAP.md): fidelity votes, discussions and BookBox subscriptions.
 */

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/**
 * `full`  – imported with editions and adaptations.
 * `stub`  – only known as a member of a series; enough to list in a reading order.
 * `pending` – added by the community, awaiting review (future).
 */
export const workStatus = pgEnum("work_status", ["full", "stub", "pending"]);

export const adaptationKind = pgEnum("adaptation_kind", [
  "film",
  "tv_series",
  "miniseries",
  "animated_film",
  "animated_series",
  "anime",
  "comic",
  "video_game",
  "game",
  "stage",
  "audio",
  "other",
]);

export const tmdbType = pgEnum("tmdb_type", ["movie", "tv"]);

/** pt-PT and pt-BR are told apart because readers in Portugal care which one they buy. */
export const editionRegion = pgEnum("edition_region", ["PT", "BR"]);

export const authors = pgTable("authors", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  wikidataId: text().unique(),
  openLibraryId: text().unique(),
  ...timestamps,
});

export const works = pgTable(
  "works",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    slug: text().notNull().unique(),
    /** Display title, Portuguese when known. */
    title: text().notNull(),
    originalTitle: text(),
    /** ISO 639 code of the original language, e.g. "en", "pl". */
    originalLanguage: text(),
    firstPublishedYear: integer(),
    synopsis: text(),
    /** Language the synopsis is written in, so the UI can flag non-Portuguese text. */
    synopsisLanguage: text(),
    /** Where the synopsis came from (e.g. a Wikipédia article), for attribution. */
    synopsisSourceUrl: text(),
    /** Short editorial note shown on the book page (e.g. "em Portugal saiu em dois volumes"). */
    editorNote: text(),
    coverUrl: text(),
    subjects: text().array().notNull().default(sql`'{}'::text[]`),
    wikidataId: text().unique(),
    openLibraryWorkId: text().unique(),
    status: workStatus().notNull().default("full"),
    importedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.status)],
);

export const workAuthors = pgTable(
  "work_authors",
  {
    workId: integer()
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    authorId: integer()
      .notNull()
      .references(() => authors.id, { onDelete: "cascade" }),
    position: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.workId, t.authorId] }), index().on(t.authorId)],
);

/** Old slugs of works whose title changed, so earlier links keep working. */
export const slugRedirects = pgTable("slug_redirects", {
  slug: text().primaryKey(),
  workId: integer()
    .notNull()
    .references(() => works.id, { onDelete: "cascade" }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const series = pgTable("series", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  wikidataId: text().unique(),
  ...timestamps,
});

export const seriesWorks = pgTable(
  "series_works",
  {
    seriesId: integer()
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    workId: integer()
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    /** Raw ordinal as given by the source ("1", "2.5", "prequela"). */
    ordinal: text(),
    /** Numeric key used for sorting; null sorts by publication year. */
    sortKey: real(),
  },
  (t) => [primaryKey({ columns: [t.seriesId, t.workId] }), index().on(t.workId)],
);

export const editions = pgTable(
  "editions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    workId: integer()
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    title: text().notNull(),
    /** ISO 639-3 / 639-2 code as given by the source, e.g. "por", "eng". */
    language: text(),
    region: editionRegion(),
    publisher: text(),
    publishYear: integer(),
    isbn13: text(),
    isbn10: text(),
    coverUrl: text(),
    openLibraryEditionId: text().unique(),
    googleBooksId: text().unique(),
    ...timestamps,
  },
  (t) => [index().on(t.workId), index().on(t.isbn13), index().on(t.language)],
);

export const adaptations = pgTable("adaptations", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: text().notNull(),
  originalTitle: text(),
  kind: adaptationKind().notNull().default("other"),
  year: integer(),
  /** Directors or creators, already joined for display. */
  credits: text(),
  overview: text(),
  posterUrl: text(),
  wikidataId: text().unique(),
  tmdbId: integer(),
  tmdbType: tmdbType(),
  ...timestamps,
});

export const workAdaptations = pgTable(
  "work_adaptations",
  {
    workId: integer()
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    adaptationId: integer()
      .notNull()
      .references(() => adaptations.id, { onDelete: "cascade" }),
    /** True when the adaptation is based on the whole series rather than this book. */
    viaSeries: boolean().notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.workId, t.adaptationId] }), index().on(t.adaptationId)],
);

// ---------------------------------------------------------------------------
// Relations (for db.query.* relational reads)

export const authorsRelations = relations(authors, ({ many }) => ({
  works: many(workAuthors),
}));

export const worksRelations = relations(works, ({ many }) => ({
  authors: many(workAuthors),
  series: many(seriesWorks),
  editions: many(editions),
  adaptations: many(workAdaptations),
}));

export const workAuthorsRelations = relations(workAuthors, ({ one }) => ({
  work: one(works, { fields: [workAuthors.workId], references: [works.id] }),
  author: one(authors, { fields: [workAuthors.authorId], references: [authors.id] }),
}));

export const seriesRelations = relations(series, ({ many }) => ({
  works: many(seriesWorks),
}));

export const seriesWorksRelations = relations(seriesWorks, ({ one }) => ({
  series: one(series, { fields: [seriesWorks.seriesId], references: [series.id] }),
  work: one(works, { fields: [seriesWorks.workId], references: [works.id] }),
}));

export const editionsRelations = relations(editions, ({ one }) => ({
  work: one(works, { fields: [editions.workId], references: [works.id] }),
}));

export const adaptationsRelations = relations(adaptations, ({ many }) => ({
  works: many(workAdaptations),
}));

export const workAdaptationsRelations = relations(workAdaptations, ({ one }) => ({
  work: one(works, { fields: [workAdaptations.workId], references: [works.id] }),
  adaptation: one(adaptations, {
    fields: [workAdaptations.adaptationId],
    references: [adaptations.id],
  }),
}));

// ---------------------------------------------------------------------------
// Accounts (Better Auth). Field names follow Better Auth's core + admin plugin schema.

export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  /** "user" | "admin" (Better Auth admin plugin). */
  role: text().default("user"),
  banned: boolean().default(false),
  banReason: text(),
  banExpires: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.identifier)],
);

/** Better Auth's rate limiter state (database storage works on serverless hosts). */
export const rateLimit = pgTable("rate_limit", {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: "number" }).notNull(),
});

// ---------------------------------------------------------------------------
// Reading

export const readingState = pgEnum("reading_state", ["quero_ler", "a_ler", "lido"]);

export const readingStatus = pgTable(
  "reading_status",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workId: integer()
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    state: readingState().notNull(),
    startedOn: date(),
    finishedOn: date(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.userId, t.workId] }), index().on(t.workId), index().on(t.userId, t.state)],
);

/** One rating (and optional review) per reader per book. */
export const reviews = pgTable(
  "reviews",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workId: integer()
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    rating: smallint().notNull(),
    body: text(),
    /** Hidden behind a click on the book page. */
    spoilers: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.workId] }),
    index().on(t.workId),
    check("rating_range", sql`${t.rating} BETWEEN 1 AND 5`),
  ],
);

/** Who imported what, for the per-user import limit. */
export const importEvents = pgTable(
  "import_events",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    workId: integer().references(() => works.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId, t.createdAt)],
);

/**
 * Corrections made by admins on the site. Same fields as src/data/curation.ts; these win over
 * the file. Applied by every import.
 */
export const workOverrides = pgTable("work_overrides", {
  workId: integer()
    .primaryKey()
    .references(() => works.id, { onDelete: "cascade" }),
  title: text(),
  originalTitle: text(),
  synopsis: text(),
  note: text(),
  hideFromSeries: boolean().notNull().default(false),
  updatedBy: text().references(() => user.id, { onDelete: "set null" }),
  ...timestamps,
});

/**
 * Answers to the reading-taste questionnaire (keys from src/lib/taste.ts). Feeds the
 * recommendations now and the BookBox curation later.
 */
export const tasteProfiles = pgTable("taste_profiles", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  genres: text().array().notNull().default(sql`'{}'::text[]`),
  format: text(),
  pace: text(),
  seriesPref: text(),
  adaptationsPref: text(),
  language: text(),
  boxPref: text(),
  /** Books the reader picked as ones they loved, in the questionnaire. */
  lovedWorkIds: integer().array().notNull().default(sql`'{}'::integer[]`),
  ...timestamps,
});

/**
 * "Este livro é parecido com..." votes: one per reader per pair. The pair is stored with the
 * smaller work id first, so (a, b) and (b, a) are the same vote. Enough votes on a pair raise
 * its weight in src/lib/similarity.ts.
 */
export const similarityVotes = pgTable(
  "similarity_votes",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workA: integer()
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    workB: integer()
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.workA, t.workB] }),
    index().on(t.workA, t.workB),
    index().on(t.workB),
    check("ordered_pair", sql`${t.workA} < ${t.workB}`),
  ],
);
