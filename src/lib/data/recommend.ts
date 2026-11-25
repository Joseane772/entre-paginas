import "server-only";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { buildingWithoutDb, dbCacheLife } from "@/lib/cache-life";
import { db } from "@/db";
import { WORKS } from "@/data/curation";
import {
  adaptations,
  authors,
  editions,
  readingStatus,
  reviews,
  series,
  seriesWorks,
  similarityVotes,
  tasteProfiles,
  workAdaptations,
  workAuthors,
  workOverrides,
  works,
} from "@/db/schema";
import { genresFromSubjects, subjectKeys } from "@/lib/genres";
import { pairKey, similarity, type PairSignals, type SimilarityFeatures, type SimilarityPart } from "@/lib/similarity";
import { GENRES, parseTaste, type Genre, type TasteAnswers } from "@/lib/taste";
import { CATALOGUE_TAG, type BookCard } from "./catalogue";

/** Votes and likes change the pair signals; actions that change them call updateTag with this. */
export const SIMILARITY_TAG = "similarity";

const SCREEN_KINDS = ["film", "tv_series", "miniseries", "animated_film", "animated_series", "anime"] as const;

export type BookFeatures = SimilarityFeatures &
  BookCard & {
    /** Position in each saga (0 = first) and the book before it. */
    sagas: { id: number; name: string; pos: number; prevId: number | null }[];
    screen: number;
    pt: boolean;
    br: boolean;
    lang: string | null;
  };

/**
 * Everything the recommender needs about each fully imported book, worked out once and cached
 * with the catalogue. Small enough to keep whole: the catalogue is hundreds of books, not millions.
 */
export async function getBookFeatures(): Promise<BookFeatures[]> {
  "use cache";
  dbCacheLife("hours");
  cacheTag(CATALOGUE_TAG);
  if (buildingWithoutDb) return [];

  const hiddenQids = Object.keys(WORKS).filter((q) => WORKS[q].hideFromSeries);
  const hidden = sql`(coalesce(${works.wikidataId}, '') IN ${hiddenQids.length ? hiddenQids : ["-"]}
    OR EXISTS (SELECT 1 FROM ${workOverrides} o WHERE o.work_id = ${works.id} AND o.hide_from_series))`;

  const [rows, authorRows, sagaRows, screenRows, regionRows] = await Promise.all([
    db
      .select({
        id: works.id,
        slug: works.slug,
        title: works.title,
        year: works.firstPublishedYear,
        coverUrl: works.coverUrl,
        subjects: works.subjects,
        lang: works.originalLanguage,
      })
      .from(works)
      .where(and(eq(works.status, "full"), sql`NOT ${hidden}`)),
    db
      .select({ workId: workAuthors.workId, id: authors.id, name: authors.name })
      .from(workAuthors)
      .innerJoin(authors, eq(authors.id, workAuthors.authorId))
      .orderBy(workAuthors.position),
    db
      .select({
        seriesId: seriesWorks.seriesId,
        name: series.name,
        workId: seriesWorks.workId,
        key: sql<number>`coalesce(${seriesWorks.sortKey}, ${works.firstPublishedYear}, 9999)`,
      })
      .from(seriesWorks)
      .innerJoin(series, eq(series.id, seriesWorks.seriesId))
      .innerJoin(works, eq(works.id, seriesWorks.workId))
      .where(sql`NOT ${hidden}`),
    db
      .select({ workId: workAdaptations.workId, n: sql<number>`count(*)::int` })
      .from(workAdaptations)
      .innerJoin(adaptations, eq(adaptations.id, workAdaptations.adaptationId))
      .where(inArray(adaptations.kind, [...SCREEN_KINDS]))
      .groupBy(workAdaptations.workId),
    db
      .selectDistinct({ workId: editions.workId, region: editions.region })
      .from(editions)
      .where(sql`${editions.region} IS NOT NULL`),
  ]);

  const byWork = <T extends { workId: number }>(list: T[]) => {
    const m = new Map<number, T[]>();
    for (const r of list) (m.get(r.workId) ?? m.set(r.workId, []).get(r.workId)!).push(r);
    return m;
  };
  const authorsOf = byWork(authorRows);
  const regions = byWork(regionRows);
  const screen = new Map(screenRows.map((r) => [r.workId, r.n]));

  // Reading order of every saga (stubs included, so positions match the book page).
  const sagaMembers = new Map<number, typeof sagaRows>();
  for (const r of sagaRows) (sagaMembers.get(r.seriesId) ?? sagaMembers.set(r.seriesId, []).get(r.seriesId)!).push(r);
  const sagasOf = new Map<number, BookFeatures["sagas"]>();
  for (const members of sagaMembers.values()) {
    members.sort((a, b) => a.key - b.key);
    members.forEach((m, pos) =>
      (sagasOf.get(m.workId) ?? sagasOf.set(m.workId, []).get(m.workId)!).push({
        id: m.seriesId,
        name: m.name,
        pos,
        prevId: pos > 0 ? members[pos - 1].workId : null,
      }),
    );
  }

  const features: BookFeatures[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    year: r.year,
    coverUrl: r.coverUrl,
    authors: (authorsOf.get(r.id) ?? []).map((a) => a.name).join(", "),
    authorIds: (authorsOf.get(r.id) ?? []).map((a) => a.id),
    genres: genresFromSubjects(r.subjects, r.year),
    subjects: subjectKeys(r.subjects),
    seriesIds: (sagasOf.get(r.id) ?? []).map((s) => s.id),
    sagas: sagasOf.get(r.id) ?? [],
    screen: screen.get(r.id) ?? 0,
    pt: !!regions.get(r.id)?.some((x) => x.region === "PT"),
    br: !!regions.get(r.id)?.some((x) => x.region === "BR"),
    lang: r.lang,
  }));

  // Books without subjects (common for later volumes) take their saga's genres.
  for (const f of features) {
    if (f.genres.some((g) => g !== "classicos") || !f.seriesIds.length) continue;
    const fromSaga = new Set<Genre>(f.genres);
    for (const o of features) if (o.seriesIds.some((s) => f.seriesIds.includes(s))) o.genres.forEach((g) => fromSaga.add(g));
    f.genres = [...fromSaga];
  }
  return features;
}

/** Likes used for co-likes and personal signals: 4–5 stars, or picked as loved in the questionnaire. */
const LIKES = sql`(
  SELECT user_id, work_id FROM ${reviews} WHERE rating >= 4
  UNION SELECT user_id, unnest(loved_work_ids) FROM ${tasteProfiles}
)`;

/**
 * Reader votes and co-likes for every pair of books (pairs with at least one). Votes, ratings and
 * questionnaire saves all call updateTag(SIMILARITY_TAG), so this can be cached for hours.
 */
async function loadPairSignals(): Promise<{ votes: [string, number][]; coLikes: [string, number][] }> {
  "use cache";
  dbCacheLife("hours");
  cacheTag(SIMILARITY_TAG);
  if (buildingWithoutDb) return { votes: [], coLikes: [] };
  const [votes, coLikes] = await Promise.all([
    db
      .select({ a: similarityVotes.workA, b: similarityVotes.workB, n: sql<number>`count(*)::int` })
      .from(similarityVotes)
      .groupBy(similarityVotes.workA, similarityVotes.workB),
    db.execute<{ a: number; b: number; n: number }>(sql`
      SELECT l1.work_id AS a, l2.work_id AS b, count(DISTINCT l1.user_id)::int AS n
      FROM ${LIKES} l1 JOIN ${LIKES} l2 ON l2.user_id = l1.user_id AND l2.work_id > l1.work_id
      GROUP BY 1, 2`),
  ]);
  return {
    votes: votes.map((r) => [pairKey(r.a, r.b), r.n]),
    coLikes: [...coLikes].map((r) => [pairKey(r.a, r.b), r.n]),
  };
}

export async function getPairSignals(): Promise<PairSignals> {
  const s = await loadPairSignals();
  return { votes: new Map(s.votes), coLikes: new Map(s.coLikes) };
}

const toCard = (f: BookFeatures): BookCard => ({
  slug: f.slug,
  title: f.title,
  year: f.year,
  coverUrl: f.coverUrl,
  authors: f.authors,
});

export type SimilarBook = BookCard & { id: number; votes: number; why: string };

const PART_LABEL: Partial<Record<SimilarityPart, string>> = {
  votes: "Leitores dizem que é parecido",
  coLikes: "Quem gostou deste também gostou",
  author: "Mesmo autor",
  genre: "Mesmo género",
  subjects: "Temas em comum",
};

const strongestPart = (parts: Record<SimilarityPart, number>) =>
  (Object.entries(parts) as [SimilarityPart, number][])
    .filter(([p]) => PART_LABEL[p])
    .sort((a, b) => b[1] - a[1])[0]?.[0];

/**
 * "Livros parecidos" for a book page: the most similar books outside its own saga. Books by the
 * same author are left to "Mais de …" unless readers voted them similar.
 */
export async function getSimilarBooks(workId: number, limit = 6): Promise<SimilarBook[]> {
  const [features, pairs] = await Promise.all([getBookFeatures(), getPairSignals()]);
  const me = features.find((f) => f.id === workId);
  if (!me) return [];
  return features
    .filter((f) => f.id !== workId && !f.seriesIds.some((s) => me.seriesIds.includes(s)))
    .map((f) => ({ f, sim: similarity(me, f, pairs) }))
    .filter((x) => x.sim.parts.votes > 0 || (x.sim.score > 0.12 && !x.sim.parts.author))
    .sort((a, b) => b.sim.score - a.sim.score)
    .slice(0, limit)
    .map(({ f, sim }) => ({
      ...toCard(f),
      id: f.id,
      votes: sim.parts.votes > 0 ? sim.votes : 0,
      why: PART_LABEL[strongestPart(sim.parts) ?? "genre"] ?? "",
    }));
}

/** Books the reader has said are similar to this one. */
export async function getMySimilarVotes(userId: string, workId: number): Promise<number[]> {
  const rows = await db
    .select({ a: similarityVotes.workA, b: similarityVotes.workB })
    .from(similarityVotes)
    .where(
      and(eq(similarityVotes.userId, userId), or(eq(similarityVotes.workA, workId), eq(similarityVotes.workB, workId))),
    );
  return rows.map((r) => (r.a === workId ? r.b : r.a));
}

/** Book list for pickers (questionnaire, "parecido com"): id, title and author. */
export async function getPickableBooks() {
  const features = await getBookFeatures();
  return features
    .map((f) => ({ id: f.id, title: f.title, authors: f.authors, coverUrl: f.coverUrl }))
    .sort((a, b) => a.title.localeCompare(b.title, "pt"));
}

export async function getTasteProfile(userId: string): Promise<TasteAnswers | null> {
  const [p] = await db.select().from(tasteProfiles).where(eq(tasteProfiles.userId, userId));
  if (!p) return null;
  return parseTaste({
    genres: p.genres,
    format: p.format,
    pace: p.pace,
    series: p.seriesPref,
    adaptations: p.adaptationsPref,
    language: p.language,
    box: p.boxPref,
    lovedWorkIds: p.lovedWorkIds,
  });
}

export type Recommendation = BookCard & { id: number; score: number; reasons: string[] };

/** How much each thing a reader did says "I like this" (questionnaire picks count as 5 stars). */
const LIKE_WEIGHT = { loved: 1, 5: 1, 4: 0.7, lido: 0.4, a_ler: 0.3, quero_ler: 0.2 } as const;
const DISLIKE_WEIGHT: Record<number, number> = { 1: 1, 2: 0.6 };

/**
 * Personal recommendations. Each unread book scores
 *   Σ (how much you liked L) × similarity(book, L)    over the books you liked
 * − Σ (how much you disliked D) × similarity(book, D)
 * + small adjustments from the questionnaire (genres, sagas, adaptations, language).
 * Similarity itself is the weighted mix in src/lib/similarity.ts, readers' votes included.
 */
export async function recommendFor(userId: string, limit = 24) {
  const [features, pairs, profile, states, ratings] = await Promise.all([
    getBookFeatures(),
    getPairSignals(),
    getTasteProfile(userId),
    db.select({ workId: readingStatus.workId, state: readingStatus.state }).from(readingStatus).where(eq(readingStatus.userId, userId)),
    db.select({ workId: reviews.workId, rating: reviews.rating }).from(reviews).where(eq(reviews.userId, userId)),
  ]);
  const byId = new Map(features.map((f) => [f.id, f]));

  const liked = new Map<number, number>();
  const like = (id: number, w: number) => liked.set(id, Math.max(liked.get(id) ?? 0, w));
  for (const s of states) like(s.workId, LIKE_WEIGHT[s.state]);
  for (const id of profile?.lovedWorkIds ?? []) like(id, LIKE_WEIGHT.loved);
  const disliked = new Map<number, number>();
  for (const r of ratings) {
    if (r.rating >= 4) like(r.workId, LIKE_WEIGHT[r.rating as 4 | 5]);
    else {
      liked.delete(r.workId);
      if (DISLIKE_WEIGHT[r.rating]) disliked.set(r.workId, DISLIKE_WEIGHT[r.rating]);
    }
  }
  const seen = new Set([...states.map((s) => s.workId), ...ratings.map((r) => r.workId), ...(profile?.lovedWorkIds ?? [])]);
  const done = new Set([
    ...states.filter((s) => s.state !== "quero_ler").map((s) => s.workId),
    ...(profile?.lovedWorkIds ?? []),
  ]);
  // Reading (or having loved) a later book of a saga means you've read the ones before it.
  for (const id of [...done]) {
    for (const saga of byId.get(id)?.sagas ?? []) {
      for (const f of features)
        if (f.sagas.some((s) => s.id === saga.id && s.pos < saga.pos)) {
          done.add(f.id);
          seen.add(f.id);
        }
    }
  }

  const hasSignals = liked.size > 0 || !!profile?.genres.length;
  if (!hasSignals) return { hasSignals, profile, items: [] as Recommendation[] };

  const scored: Recommendation[] = [];
  for (const c of features) {
    if (seen.has(c.id)) continue;
    const reasons: [number, string][] = [];
    let score = 0;

    // Similar to what you liked.
    let best: { w: number; liked: number; title: string; part?: SimilarityPart } | null = null;
    for (const [id, w] of liked) {
      const l = byId.get(id);
      if (!l) continue;
      const sim = similarity(c, l, pairs);
      const contrib = 10 * w * sim.score;
      score += contrib;
      if (!best || contrib > best.w) best = { w: contrib, liked: w, title: l.title, part: strongestPart(sim.parts) };
    }
    if (best && best.w > 0.8) {
      const t = `«${best.title}»`;
      reasons.push([
        best.w,
        best.part === "votes"
          ? `Leitores dizem que é parecido com ${t}`
          : best.part === "coLikes"
            ? `Quem gostou de ${t} também gostou deste`
            : best.part === "author"
              ? `Do mesmo autor de ${t}`
              : best.liked >= 0.7
                ? `Parecido com ${t}, de que gostaste`
                : `Parecido com ${t}, que tens na estante`,
      ]);
    }
    for (const [id, w] of disliked) {
      const d = byId.get(id);
      if (d) score -= 8 * w * similarity(c, d, pairs).score;
    }

    // Questionnaire.
    const genreHits = profile ? c.genres.filter((g) => profile.genres.includes(g)) : [];
    if (genreHits.length) {
      const g = 1.5 + 0.5 * (genreHits.length - 1);
      score += g;
      reasons.push([g, genreHits.length > 1 ? `${GENRES[genreHits[0]]} e ${GENRES[genreHits[1]].toLowerCase()}` : `${GENRES[genreHits[0]]}, um dos teus géneros`]);
    }

    const saga = c.sagas[0];
    if (saga && saga.pos > 0) {
      if (saga.prevId !== null && done.has(saga.prevId)) {
        score += 5;
        reasons.push([5, `Continua a saga «${saga.name}»`]);
      } else continue; // never the middle of a saga before the book that comes before it
    } else if (saga) {
      if (profile?.series === "sagas") {
        score += 2;
        reasons.push([2, `Primeiro livro da saga «${saga.name}»`]);
      } else if (profile?.series === "unicos") score -= 2.5;
    } else if (profile?.series === "unicos") {
      score += 1.5;
      reasons.push([1.2, "Livro único, sem saga"]);
    }

    if (c.screen && profile?.adaptations === "sempre") {
      score += 1.5;
      reasons.push([1.4, "Tem adaptação ao cinema ou televisão"]);
    } else if (c.screen && profile?.adaptations === "as_vezes") score += 0.5;

    if (profile?.language === "pt_pt") {
      if (c.pt) {
        score += 1;
        reasons.push([0.9, "Há edição portuguesa"]);
      } else score -= 1.5;
    } else if (profile?.language === "pt_br") {
      if (c.br) {
        score += 1;
        reasons.push([0.9, "Há edição brasileira"]);
      } else score -= 0.5;
    } else if (profile?.language === "en" && c.lang === "en") {
      score += 1;
      reasons.push([0.9, "Escrito em inglês, para leres no original"]);
    }

    if (score <= 0.5) continue;
    scored.push({
      ...toCard(c),
      id: c.id,
      score,
      reasons: reasons.sort((a, b) => b[0] - a[0]).slice(0, 3).map(([, r]) => r),
    });
  }

  scored.sort((a, b) => b.score - a.score);
  // Keep it varied: at most two books by the same author near the top.
  const perAuthor = new Map<string, number>();
  const top: Recommendation[] = [];
  const rest: Recommendation[] = [];
  for (const r of scored) {
    const n = perAuthor.get(r.authors) ?? 0;
    (n < 2 ? top : rest).push(r);
    perAuthor.set(r.authors, n + 1);
  }
  return { hasSignals, profile, items: [...top, ...rest].slice(0, limit) };
}
