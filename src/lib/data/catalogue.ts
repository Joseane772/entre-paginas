import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { dbCacheLife, buildingWithoutDb } from "@/lib/cache-life";
import { db } from "@/db";
import { WORKS } from "@/data/curation";
import {
  adaptations,
  authors,
  editions,
  series,
  seriesWorks,
  slugRedirects,
  workAdaptations,
  workOverrides,
  workAuthors,
  works,
} from "@/db/schema";

/** Every cached catalogue read carries this tag; imports invalidate it. */
export const CATALOGUE_TAG = "catalogue";

export type BookCard = {
  slug: string;
  title: string;
  year: number | null;
  coverUrl: string | null;
  authors: string;
};

async function authorNames(workIds: number[]) {
  if (!workIds.length) return new Map<number, string>();
  const rows = await db
    .select({ workId: workAuthors.workId, name: authors.name })
    .from(workAuthors)
    .innerJoin(authors, eq(authors.id, workAuthors.authorId))
    .where(inArray(workAuthors.workId, workIds))
    .orderBy(asc(workAuthors.position));
  const map = new Map<number, string[]>();
  for (const r of rows) (map.get(r.workId) ?? map.set(r.workId, []).get(r.workId)!).push(r.name);
  return new Map([...map].map(([k, v]) => [k, v.join(", ")]));
}

async function toCards(rows: { id: number; slug: string; title: string; firstPublishedYear: number | null; coverUrl: string | null }[]): Promise<BookCard[]> {
  const names = await authorNames(rows.map((r) => r.id));
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    year: r.firstPublishedYear,
    coverUrl: r.coverUrl,
    authors: names.get(r.id) ?? "",
  }));
}

const cardColumns = {
  id: works.id,
  slug: works.slug,
  title: works.title,
  firstPublishedYear: works.firstPublishedYear,
  coverUrl: works.coverUrl,
};

/** Fully imported books, newest import first. Only the first book of each series, to keep the shelf varied. */
export async function getShelf(limit = 24): Promise<BookCard[]> {
  "use cache";
  dbCacheLife("hours");
  cacheTag(CATALOGUE_TAG);
  if (buildingWithoutDb) return []; // no database while the Docker image builds
  const hidden = Object.keys(WORKS).filter((q) => WORKS[q].hideFromSeries);
  const rows = await db
    .select(cardColumns)
    .from(works)
    .where(
      and(
        eq(works.status, "full"),
        // Appendices, short stories and the like aren't shelf material.
        sql`coalesce(${works.wikidataId}, '') NOT IN ${hidden.length ? hidden : ["-"]}`,
        sql`NOT EXISTS (SELECT 1 FROM ${workOverrides} o WHERE o.work_id = ${works.id} AND o.hide_from_series)`,
        sql`NOT EXISTS (
          SELECT 1 FROM ${seriesWorks} sw
          JOIN ${seriesWorks} first ON first.series_id = sw.series_id
          JOIN ${works} fw ON fw.id = first.work_id
          WHERE sw.work_id = ${works.id}
            AND coalesce(first.sort_key, fw.first_published_year) < coalesce(sw.sort_key, ${works.firstPublishedYear}))`,
      ),
    )
    .orderBy(desc(works.importedAt))
    .limit(limit);
  return toCards(rows);
}

/** Accent-insensitive search over titles, original titles, authors and series names. */
export async function searchCatalogue(q: string): Promise<BookCard[]> {
  "use cache";
  dbCacheLife("minutes");
  cacheTag(CATALOGUE_TAG);
  if (buildingWithoutDb) return []; // no database while the Docker image builds
  const term = q.trim();
  if (!term) return [];
  const escaped = term.replace(/[\\%_]/g, (c) => "\\" + c);
  const like = `%${escaped}%`;
  const matches = (col: unknown) => sql`f_unaccent(${col}) LIKE f_unaccent(${like})`;
  const rows = await db
    .select(cardColumns)
    .from(works)
    .where(
      sql`${matches(works.title)} OR ${matches(works.originalTitle)}
        OR EXISTS (SELECT 1 FROM ${workAuthors} wa JOIN ${authors} a ON a.id = wa.author_id
                   WHERE wa.work_id = ${works.id} AND ${matches(sql`a.name`)})
        OR EXISTS (SELECT 1 FROM ${seriesWorks} sw JOIN ${series} s ON s.id = sw.series_id
                   WHERE sw.work_id = ${works.id} AND ${matches(sql`s.name`)})`,
    )
    .orderBy(
      // titles starting with the term first, then fully imported books, then oldest
      sql`f_unaccent(${works.title}) LIKE f_unaccent(${escaped + "%"}) DESC`,
      sql`${works.status} = 'full' DESC`,
      asc(works.firstPublishedYear),
    )
    .limit(30);
  return toCards(rows);
}

export async function getSlugsForPrerender(limit = 50): Promise<string[]> {
  "use cache";
  dbCacheLife("hours");
  cacheTag(CATALOGUE_TAG);
  if (buildingWithoutDb) return [];
  try {
    const rows = await db
      .select({ slug: works.slug })
      .from(works)
      .where(eq(works.status, "full"))
      .orderBy(desc(works.importedAt))
      .limit(limit);
    return rows.map((r) => r.slug);
  } catch {
    // No database at build time: render everything on demand.
    return [];
  }
}

/** Current slug for a work's old slug (titles get corrected, links shouldn't break). */
export async function getRedirect(slug: string): Promise<string | null> {
  "use cache";
  dbCacheLife("hours");
  cacheTag(CATALOGUE_TAG);
  if (buildingWithoutDb) return null; // no database while the Docker image builds
  const [row] = await db
    .select({ slug: works.slug })
    .from(slugRedirects)
    .innerJoin(works, eq(works.id, slugRedirects.workId))
    .where(eq(slugRedirects.slug, slug))
    .limit(1);
  return row?.slug ?? null;
}

export type BookPage = Awaited<ReturnType<typeof loadBook>>;
export type BookSeries = NonNullable<BookPage>["series"][number];

export async function getBook(slug: string) {
  "use cache";
  dbCacheLife("hours");
  cacheTag(CATALOGUE_TAG, `work:${slug}`);
  if (buildingWithoutDb) return null; // no database while the Docker image builds
  return loadBook(slug);
}

async function loadBook(slug: string) {
  const [work] = await db.select().from(works).where(eq(works.slug, slug)).limit(1);
  if (!work) return null;

  const [authorRows, seriesRows, adaptationRows, editionRows] = await Promise.all([
    db
      .select({ name: authors.name, slug: authors.slug })
      .from(workAuthors)
      .innerJoin(authors, eq(authors.id, workAuthors.authorId))
      .where(eq(workAuthors.workId, work.id))
      .orderBy(asc(workAuthors.position)),
    db
      .select({ id: series.id, name: series.name, slug: series.slug, ordinal: seriesWorks.ordinal })
      .from(seriesWorks)
      .innerJoin(series, eq(series.id, seriesWorks.seriesId))
      .where(eq(seriesWorks.workId, work.id)),
    db
      .select({
        id: adaptations.id,
        title: adaptations.title,
        originalTitle: adaptations.originalTitle,
        kind: adaptations.kind,
        year: adaptations.year,
        credits: adaptations.credits,
        overview: adaptations.overview,
        posterUrl: adaptations.posterUrl,
        tmdbId: adaptations.tmdbId,
        tmdbType: adaptations.tmdbType,
        wikidataId: adaptations.wikidataId,
        viaSeries: workAdaptations.viaSeries,
      })
      .from(workAdaptations)
      .innerJoin(adaptations, eq(adaptations.id, workAdaptations.adaptationId))
      .where(eq(workAdaptations.workId, work.id))
      .orderBy(asc(workAdaptations.viaSeries), sql`${adaptations.year} NULLS LAST`),
    db
      .select({
        title: editions.title,
        language: editions.language,
        region: editions.region,
        publisher: editions.publisher,
        publishYear: editions.publishYear,
        isbn13: editions.isbn13,
        coverUrl: editions.coverUrl,
      })
      .from(editions)
      .where(eq(editions.workId, work.id))
      .orderBy(sql`${editions.publishYear} DESC NULLS LAST`),
  ]);

  const seriesWithMembers = await Promise.all(
    seriesRows.map(async (s) => {
      const members = await db
        .select({
          slug: works.slug,
          title: works.title,
          year: works.firstPublishedYear,
          status: works.status,
          ordinal: seriesWorks.ordinal,
        })
        .from(seriesWorks)
        .innerJoin(works, eq(works.id, seriesWorks.workId))
        .where(eq(seriesWorks.seriesId, s.id))
        .orderBy(sql`${seriesWorks.sortKey} NULLS LAST`, sql`${works.firstPublishedYear} NULLS LAST`);
      return { ...s, members };
    }),
  );

  // Languages, with Portuguese split into Portugal / Brazil / unknown.
  const langCounts = new Map<string, number>();
  for (const e of editionRows) {
    const key = e.language === "por" ? `por-${e.region ?? "?"}` : (e.language ?? "?");
    langCounts.set(key, (langCounts.get(key) ?? 0) + 1);
  }

  const portuguese = editionRows.filter((e) => e.language === "por");

  // Best query for shop searches: a Portugal ISBN, else the Portuguese title + author.
  const shopQuery =
    portuguese.find((e) => e.region === "PT" && e.isbn13)?.isbn13 ??
    `${work.title} ${authorRows[0]?.name ?? ""}`.trim();

  return {
    work,
    authors: authorRows,
    series: seriesWithMembers,
    adaptations: adaptationRows,
    portugueseEditions: {
      PT: portuguese.filter((e) => e.region === "PT"),
      BR: portuguese.filter((e) => e.region === "BR"),
      other: portuguese.filter((e) => !e.region),
    },
    languages: [...langCounts.entries()]
      .filter(([k]) => k !== "?")
      .sort((a, b) => b[1] - a[1]),
    editionCount: editionRows.length,
    shopQuery,
  };
}

/** Other fully imported books by the same authors. */
export async function getMoreByAuthors(slug: string, limit = 6): Promise<BookCard[]> {
  "use cache";
  dbCacheLife("hours");
  cacheTag(CATALOGUE_TAG);
  if (buildingWithoutDb) return []; // no database while the Docker image builds
  const [w] = await db.select({ id: works.id }).from(works).where(eq(works.slug, slug));
  if (!w) return [];
  const rows = await db
    .selectDistinct(cardColumns)
    .from(workAuthors)
    .innerJoin(works, eq(works.id, workAuthors.workId))
    .where(
      and(
        inArray(
          workAuthors.authorId,
          db.select({ id: workAuthors.authorId }).from(workAuthors).where(eq(workAuthors.workId, w.id)),
        ),
        ne(works.id, w.id),
        eq(works.status, "full"),
        sql`NOT EXISTS (SELECT 1 FROM ${seriesWorks} a JOIN ${seriesWorks} b ON a.series_id = b.series_id WHERE a.work_id = ${w.id} AND b.work_id = ${works.id})`,
      ),
    )
    .limit(limit);
  return toCards(rows);
}
