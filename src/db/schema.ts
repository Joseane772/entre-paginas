import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/*
 * Catalogue (milestone 1): works, authors, series, editions, adaptations.
 * Planned next (see docs/ROADMAP.md): users, reading status, ratings,
 * fidelity votes, discussions, taste profiles and BookBox subscriptions.
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
