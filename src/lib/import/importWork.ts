import { and, eq, inArray, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  adaptations,
  authors,
  editions,
  series,
  seriesWorks,
  slugRedirects,
  workAdaptations,
  workAuthors,
  works,
} from "@/db/schema";
import * as ol from "@/lib/sources/openlibrary";
import * as wd from "@/lib/sources/wikidata";
import { getTmdbDetails } from "@/lib/sources/tmdb";
import { getPtSummary } from "@/lib/sources/wikipedia";
import { searchPortugueseVolumes } from "@/lib/sources/googlebooks";
import { SourceError } from "@/lib/sources/http";
import { pickCover } from "@/lib/sources/covers";
import { curatedSeriesName } from "@/data/curation";
import { hiddenQids, loadCuration } from "./curation";
import { cleanEditionTitle, normalize, portugueseRegion, slugify, toIso3 } from "@/lib/text";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Log = (msg: string) => void;

export type ImportInput = { olWorkId?: string; qid?: string };
export type ImportResult = { workId: number; slug: string; title: string };

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

const sortKey = (ordinal?: string) => {
  const n = ordinal ? parseFloat(ordinal.replace(",", ".")) : NaN;
  return Number.isFinite(n) ? n : null;
};

/**
 * Import (or refresh) one book from Open Library + Wikidata (+ TMDB, Wikipédia, Google Books).
 * Idempotent: re-running updates the same rows, matched by Wikidata or Open Library id.
 */
export async function importWork(input: ImportInput, log: Log = () => {}): Promise<ImportResult> {
  // 1. Gather -----------------------------------------------------------------
  let olWorkId = input.olWorkId;
  let olWork = olWorkId ? await ol.getWork(olWorkId) : undefined;
  if (olWork) olWorkId = ol.olId(olWork.key); // canonical id after redirects

  const qid =
    input.qid ??
    olWork?.wikidataId ??
    (olWork
      ? await wd.findWorkQid({ olWorkId, authorOlIds: olWork.authorKeys, titles: [olWork.title] })
      : null);
  log(`wikidata: ${qid ?? "não encontrado"}`);
  const wdWork = qid ? await wd.getWork(qid) : undefined;

  if (!olWork && wdWork) {
    // Wikidata sometimes points at OL works that were merged away (404), so fall back to search.
    for (const candidate of [wdWork.olWorkId, "search"]) {
      const id = candidate === "search" ? await findOlWorkFor(wdWork) : candidate;
      if (!id) continue;
      olWork = await ol.getWork(id).catch((e) => {
        if (e instanceof SourceError && e.status === 404) return undefined;
        throw e;
      });
      if (olWork) {
        olWorkId = ol.olId(olWork.key);
        break;
      }
    }
  }
  if (!olWork && !wdWork) throw new Error("Nada para importar: sem Open Library nem Wikidata.");
  log(`open library: ${olWorkId ?? "não encontrado"}`);

  const olAuthors = olWork ? await mapLimit(olWork.authorKeys, 3, (k) => ol.getAuthor(k)) : [];
  const authorList = olAuthors.length
    ? olAuthors.map((a) => ({
        name: a.name,
        olId: a.key,
        qid: a.wikidataId ?? wdWork?.authors.find((w) => w.olId === a.key)?.qid,
      }))
    : (wdWork?.authors ?? []).map((a) => ({ name: a.name, olId: a.olId, qid: a.qid }));

  const olEditions = olWorkId ? await ol.getEditions(olWorkId) : [];
  log(`edições open library: ${olEditions.length}`);

  const englishTitle = wdWork?.labelEn ?? olWork?.title ?? wdWork?.labelPt ?? "";
  const gbVolumes = await searchPortugueseVolumes(englishTitle, authorList[0]?.name).catch(() => []);
  if (gbVolumes.length) log(`edições google books (pt): ${gbVolumes.length}`);

  const ptSummary = wdWork?.ptWikiTitle ? await getPtSummary(wdWork.ptWikiTitle) : null;

  const seriesInfo = wdWork?.series ?? [];
  const wdAdaptations = qid ? await wd.getAdaptations(qid, seriesInfo.map((s) => s.qid)) : [];
  const tmdb = await mapLimit(wdAdaptations, 4, (a) =>
    a.tmdbId && a.tmdbType ? getTmdbDetails(a.tmdbType, a.tmdbId).catch(() => null) : Promise.resolve(null),
  );
  log(`adaptações: ${wdAdaptations.length}`);

  const seriesMembers = await mapLimit(seriesInfo, 2, (s) => wd.getSeriesMembers(s.qid));

  // 2. Shape ------------------------------------------------------------------
  type EditionRow = typeof editions.$inferInsert;
  const editionRows: Omit<EditionRow, "workId">[] = [];
  const seenIsbn = new Set<string>();
  for (const e of olEditions) {
    if (e.isbn13) {
      if (seenIsbn.has(e.isbn13)) continue;
      seenIsbn.add(e.isbn13);
    }
    const language = e.languages[0] ? toIso3(e.languages[0]) : null;
    editionRows.push({
      title: e.title,
      language,
      region: language === "por" ? portugueseRegion(e.isbn13, e.publishPlaces) : null,
      publisher: e.publishers[0] ?? null,
      publishYear: e.publishYear ?? null,
      isbn13: e.isbn13 ?? null,
      isbn10: e.isbn10 ?? null,
      coverUrl: e.cover ? ol.olCover(e.cover, "M") : null,
      openLibraryEditionId: e.key,
    });
  }
  for (const v of gbVolumes) {
    if (v.isbn13 && seenIsbn.has(v.isbn13)) continue;
    if (v.isbn13) seenIsbn.add(v.isbn13);
    editionRows.push({
      title: v.title,
      language: "por",
      region: portugueseRegion(v.isbn13),
      publisher: v.publisher ?? null,
      publishYear: v.year ?? null,
      isbn13: v.isbn13 ?? null,
      isbn10: v.isbn10 ?? null,
      coverUrl: v.thumbnail ?? null,
      googleBooksId: v.id,
    });
  }

  const ptEditions = editionRows.filter((e) => e.language === "por");
  const ptPtEditions = ptEditions.filter((e) => e.region === "PT");
  const mostCommonTitle = (rows: typeof editionRows) => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const t = cleanEditionTitle(r.title);
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  };

  const curation = await loadCuration(db, [qid ?? "", ...seriesMembers.flat().map((m) => m.qid)], olWorkId);
  const curatedWork = (q?: string | null) => curation(q);
  const curated = curation(qid, olWorkId);
  const originalTitle = curated.originalTitle ?? wdWork?.originalTitle ?? olWork?.title ?? wdWork?.labelEn ?? null;
  // Wikidata's "pt" label is often just the original title copied over ("Dune");
  // only trust it when it differs, otherwise prefer what Portuguese editions/Wikipédia call it.
  const sameAsOriginal = (t?: string) =>
    !!t && [originalTitle, wdWork?.labelEn].some((o) => o && normalize(o) === normalize(t));
  const ptWikiTitle = wdWork?.ptWikiTitle?.replace(/\s*\([^)]*\)$/, "");
  const title =
    curated.title ??
    (wdWork?.labelPt && !sameAsOriginal(wdWork.labelPt) ? wdWork.labelPt : undefined) ??
    mostCommonTitle(ptPtEditions) ??
    ptWikiTitle ??
    mostCommonTitle(ptEditions) ??
    wdWork?.labelPt ??
    englishTitle;
  // Portugal editions first, then the work's own covers on Open Library, then Brazilian ones.
  // Each candidate is downloaded and checked: sources sometimes attach a photo or banner.
  const large = (u?: string | null) => u?.replace("-M.jpg", "-L.jpg");
  const coverUrl = await pickCover(
    [
      ...ptPtEditions.map((e) => large(e.coverUrl)),
      ...(olWork?.covers ?? []).slice(0, 4).map((c) => ol.olCover(c, "L")),
      ...ptEditions.map((e) => large(e.coverUrl)),
    ],
    { log },
  );
  const olYear = olWork?.firstPublishDate?.match(/\d{4}/)?.[0];
  const firstPublishedYear = wdWork?.year ?? (olYear ? Number(olYear) : null);

  const synopsis = curated.synopsis
    ? { synopsis: curated.synopsis, synopsisLanguage: "pt", synopsisSourceUrl: null }
    : ptSummary
    ? { synopsis: ptSummary.extract, synopsisLanguage: "pt", synopsisSourceUrl: ptSummary.url }
    : olWork?.description
      ? {
          synopsis: olWork.description,
          synopsisLanguage: "en",
          synopsisSourceUrl: `https://openlibrary.org/works/${olWorkId}`,
        }
      : { synopsis: null, synopsisLanguage: null, synopsisSourceUrl: null };

  // 3. Write ------------------------------------------------------------------
  return db.transaction(async (tx) => {
    const hidden = await hiddenQids(tx);
    const workId = await upsertWork(tx, {
      qid: qid ?? undefined,
      olWorkId,
      values: {
        title,
        originalTitle,
        originalLanguage: wdWork?.originalLanguage ?? null,
        firstPublishedYear,
        coverUrl,
        subjects: (olWork?.subjects ?? []).filter((s) => !s.includes(":")).slice(0, 20),
        ...synopsis,
        editorNote: curated.note ?? null,
        status: "full",
        importedAt: new Date(),
      },
    });

    // Authors
    await tx.delete(workAuthors).where(eq(workAuthors.workId, workId));
    for (const [position, a] of authorList.entries()) {
      const authorId = await upsertAuthor(tx, a);
      await tx.insert(workAuthors).values({ workId, authorId, position }).onConflictDoNothing();
    }

    // Editions (replaced wholesale; they carry no user data)
    await tx.delete(editions).where(eq(editions.workId, workId));
    for (let i = 0; i < editionRows.length; i += 500) {
      await tx
        .insert(editions)
        .values(editionRows.slice(i, i + 500).map((e) => ({ ...e, workId })))
        .onConflictDoNothing();
    }

    // Adaptations
    await tx.delete(workAdaptations).where(eq(workAdaptations.workId, workId));
    for (const [i, a] of wdAdaptations.entries()) {
      const t = tmdb[i];
      const values = {
        title: t?.title ?? a.title,
        originalTitle: a.title,
        kind: a.kind,
        year: a.year ?? t?.year ?? null,
        credits: a.credits.join(", ") || null,
        overview: t?.overview ?? null,
        posterUrl: t?.posterUrl ?? null,
        tmdbId: a.tmdbId ?? null,
        tmdbType: a.tmdbType ?? null,
      };
      const [row] = await tx
        .insert(adaptations)
        .values({ ...values, wikidataId: a.qid })
        .onConflictDoUpdate({ target: adaptations.wikidataId, set: values })
        .returning({ id: adaptations.id });
      await tx
        .insert(workAdaptations)
        .values({ workId, adaptationId: row.id, viaSeries: a.viaSeries })
        .onConflictDoNothing();
    }

    // Series and their members (members we haven't imported become stubs)
    const myTitles = new Set([title, wdWork?.labelEn, originalTitle].filter(Boolean).map((t) => normalize(t!)));
    for (const [i, s] of seriesInfo.entries()) {
      const seriesId = await upsertSeries(tx, s.qid, curatedSeriesName(s.qid, s.name));
      let myOrdinal = s.ordinal;
      const others: wd.WdSeriesMember[] = [];
      for (const m of seriesMembers[i]) {
        if (curatedWork(m.qid).hideFromSeries) {
          continue;
        } else if (m.qid === qid) {
          myOrdinal ??= m.ordinal;
        } else if (myTitles.has(normalize(m.labelEn ?? m.title))) {
          // A duplicate Wikidata item for this same book: take its position, drop its stub.
          myOrdinal ??= m.ordinal;
          await tx.delete(works).where(and(eq(works.wikidataId, m.qid), eq(works.status, "stub")));
        } else {
          others.push(m);
        }
      }
      const entries = curated.hideFromSeries ? [] : [{ workId, ordinal: myOrdinal }];
      for (const m of others) {
        // Sequential (slug uniqueness). Stubs don't keep the OL id: Wikidata's OL links
        // are often stale or shared between items; the full import resolves it.
        const id = await upsertWork(tx, {
          qid: m.qid,
          values: {
            title: curatedWork(m.qid).title ?? m.title,
            firstPublishedYear: m.year ?? null,
            editorNote: curatedWork(m.qid).note ?? null,
          },
          stub: true,
        });
        entries.push({ workId: id, ordinal: m.ordinal });
      }
      for (const e of entries) {
        const values = { ordinal: e.ordinal ?? null, sortKey: sortKey(e.ordinal) };
        await tx
          .insert(seriesWorks)
          .values({ seriesId, workId: e.workId, ...values })
          .onConflictDoUpdate({ target: [seriesWorks.seriesId, seriesWorks.workId], set: values });
      }
      // Stubs that dropped out of the series (cleaned up on Wikidata) and hidden members.
      // Fully imported books stay: their own import decides their series.
      await tx.delete(seriesWorks).where(
        and(
          eq(seriesWorks.seriesId, seriesId),
          entries.length ? notInArray(seriesWorks.workId, entries.map((e) => e.workId)) : undefined,
          inArray(
            seriesWorks.workId,
            tx
              .select({ id: works.id })
              .from(works)
              .where(or(eq(works.status, "stub"), inArray(works.wikidataId, hidden.length ? hidden : ["-"]))),
          ),
        ),
      );
    }
    await deleteOrphanStubs(tx);

    const [w] = await tx.select({ slug: works.slug }).from(works).where(eq(works.id, workId));
    log(`guardado: ${title} → /livro/${w.slug}`);
    return { workId, slug: w.slug, title };
  });
}

async function findOlWorkFor(w: wd.WdWork): Promise<string | undefined> {
  const title = w.labelEn ?? w.originalTitle ?? w.labelPt;
  if (!title) return;
  const docs = await ol.searchWorks(`${title} ${w.authors[0]?.name ?? ""}`.trim(), 5);
  const want = normalize(title);
  const hit = docs.find((d) => normalize(d.title) === want) ?? docs[0];
  return hit ? ol.olId(hit.key) : undefined;
}

async function uniqueSlug(tx: Tx, table: typeof works | typeof authors | typeof series, base: string, extra?: string | number | null) {
  const candidates = [base, extra ? `${base}-${slugify(String(extra))}` : null].filter(Boolean) as string[];
  for (const c of candidates) {
    const [hit] = await tx.select({ id: table.id }).from(table).where(eq(table.slug, c)).limit(1);
    if (!hit) return c;
  }
  for (let n = 2; ; n++) {
    const c = `${base}-${n}`;
    const [hit] = await tx.select({ id: table.id }).from(table).where(eq(table.slug, c)).limit(1);
    if (!hit) return c;
  }
}

async function upsertWork(
  tx: Tx,
  opts: {
    qid?: string;
    olWorkId?: string;
    values: Partial<typeof works.$inferInsert> & { title: string };
    stub?: boolean;
  },
): Promise<number> {
  // Match by Wikidata id first; Open Library ids are only a fallback because
  // several Wikidata items can point at the same (merged) OL work.
  const find = (cond: ReturnType<typeof eq>) =>
    tx.select({ id: works.id, status: works.status }).from(works).where(cond).limit(1);
  let [existing] = opts.qid ? await find(eq(works.wikidataId, opts.qid)) : [];
  if (!existing && opts.olWorkId) [existing] = await find(eq(works.openLibraryWorkId, opts.olWorkId));

  // Only claim an OL id that no other book holds.
  let olWorkId = opts.olWorkId;
  if (olWorkId) {
    const [owner] = await find(eq(works.openLibraryWorkId, olWorkId));
    if (owner && owner.id !== existing?.id) olWorkId = undefined;
  }

  if (existing) {
    // Never downgrade a fully imported book back to a stub.
    if (opts.stub && existing.status !== "stub") return existing.id;
    await reslug(tx, existing.id, opts.values.title, opts.values.firstPublishedYear);
    await tx
      .update(works)
      .set({
        ...opts.values,
        ...(opts.qid ? { wikidataId: opts.qid } : {}),
        ...(olWorkId ? { openLibraryWorkId: olWorkId } : {}),
      })
      .where(eq(works.id, existing.id));
    return existing.id;
  }

  const slug = await uniqueSlug(tx, works, slugify(opts.values.title), opts.values.firstPublishedYear);
  const [row] = await tx
    .insert(works)
    .values({
      ...opts.values,
      slug,
      status: opts.stub ? "stub" : (opts.values.status ?? "full"),
      wikidataId: opts.qid ?? null,
      openLibraryWorkId: olWorkId ?? null,
    })
    .returning({ id: works.id });
  return row.id;
}

/**
 * Keep a work's slug in step with its title (stubs are often created with the English title).
 * The old slug is kept as a redirect.
 */
export async function reslug(tx: Tx, workId: number, title: string, year?: number | null) {
  const [w] = await tx.select({ slug: works.slug }).from(works).where(eq(works.id, workId));
  const base = slugify(title);
  if (!w || w.slug === base || w.slug.startsWith(base + "-")) return w?.slug;
  const slug = await uniqueSlug(tx, works, base, year);
  await tx.update(works).set({ slug }).where(eq(works.id, workId));
  await tx.delete(slugRedirects).where(eq(slugRedirects.slug, slug));
  await tx
    .insert(slugRedirects)
    .values({ slug: w.slug, workId })
    .onConflictDoUpdate({ target: slugRedirects.slug, set: { workId } });
  return slug;
}

/** Stubs only exist as members of a series; once in none, they go. */
export async function deleteOrphanStubs(tx: Tx) {
  await tx.execute(sql`
    DELETE FROM ${works} w WHERE w.status = 'stub'
      AND NOT EXISTS (SELECT 1 FROM ${seriesWorks} sw WHERE sw.work_id = w.id)`);
}

async function upsertAuthor(tx: Tx, a: { name: string; olId?: string; qid?: string }): Promise<number> {
  const match = [
    a.qid ? eq(authors.wikidataId, a.qid) : undefined,
    a.olId ? eq(authors.openLibraryId, a.olId) : undefined,
  ].filter(Boolean);
  const [existing] = match.length
    ? await tx.select({ id: authors.id }).from(authors).where(or(...match)).limit(1)
    : await tx.select({ id: authors.id }).from(authors).where(eq(authors.name, a.name)).limit(1);
  if (existing) {
    await tx
      .update(authors)
      .set({
        name: a.name,
        ...(a.qid ? { wikidataId: a.qid } : {}),
        ...(a.olId ? { openLibraryId: a.olId } : {}),
      })
      .where(eq(authors.id, existing.id));
    return existing.id;
  }
  const [row] = await tx
    .insert(authors)
    .values({
      name: a.name,
      slug: await uniqueSlug(tx, authors, slugify(a.name)),
      wikidataId: a.qid ?? null,
      openLibraryId: a.olId ?? null,
    })
    .returning({ id: authors.id });
  return row.id;
}

async function upsertSeries(tx: Tx, qid: string, name: string): Promise<number> {
  const [existing] = await tx.select({ id: series.id }).from(series).where(eq(series.wikidataId, qid));
  if (existing) {
    await tx.update(series).set({ name }).where(eq(series.id, existing.id));
    return existing.id;
  }
  const [row] = await tx
    .insert(series)
    .values({ name, wikidataId: qid, slug: await uniqueSlug(tx, series, slugify(name)) })
    .returning({ id: series.id });
  return row.id;
}

/** Works already in the catalogue, for skipping re-imports. */
export async function findImported(olWorkIds: string[]) {
  if (!olWorkIds.length) return new Map<string, string>();
  const rows = await db
    .select({ ol: works.openLibraryWorkId, slug: works.slug })
    .from(works)
    .where(and(inArray(works.openLibraryWorkId, olWorkIds), sql`${works.status} = 'full'`));
  return new Map(rows.map((r) => [r.ol!, r.slug]));
}
