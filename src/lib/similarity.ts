import type { Genre } from "./taste";

/**
 * How alike two books are, as a weighted sum of signals between 0 and 1. The weights below are
 * the only knobs: raise one to make that signal count for more in "Livros parecidos" and in
 * recommendations.
 *
 * Reader votes ("este livro é parecido com aquele") start counting at MIN_VOTES and reach
 * their full weight at FULL_VOTES, so one person can't link two books on their own, and a
 * pair many readers agree on outweighs everything the metadata says.
 */
export const SIMILARITY_WEIGHTS = {
  /** Share of genres in common (Jaccard). */
  genre: 3,
  /** Same author. */
  author: 2.5,
  /** Share of Open Library subjects in common (Jaccard). */
  subjects: 3,
  /** Both in the same saga. */
  series: 1.5,
  /** Published close together (full at the same year, nothing at 60+ years apart). */
  era: 0.5,
  /** Readers who said the two books are similar. */
  votes: 6,
  /** Readers who liked one also liked the other (implicit). */
  coLikes: 2,
} as const;

export const MIN_VOTES = 2;
export const FULL_VOTES = 6;
const FULL_CO_LIKES = 5;

export type SimilarityFeatures = {
  id: number;
  genres: Genre[];
  authorIds: number[];
  subjects: string[];
  seriesIds: number[];
  year: number | null;
};

/** Reader votes and co-likes for a pair of books, looked up by `pairKey`. */
export type PairSignals = { votes: Map<string, number>; coLikes: Map<string, number> };

export const pairKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);

const jaccard = <T,>(a: T[], b: T[]) => {
  if (!a.length || !b.length) return 0;
  const sb = new Set(b);
  const inter = a.filter((x) => sb.has(x)).length;
  return inter / (a.length + b.length - inter);
};

/** 0 below MIN_VOTES, rising to 1 at FULL_VOTES. */
export const voteStrength = (n: number) =>
  n < MIN_VOTES ? 0 : Math.min(1, (n - MIN_VOTES + 1) / (FULL_VOTES - MIN_VOTES + 1));

export type SimilarityPart = keyof typeof SIMILARITY_WEIGHTS;

/** Similarity between two books, with each signal's contribution (for "porquê" explanations). */
export function similarity(a: SimilarityFeatures, b: SimilarityFeatures, pairs: PairSignals) {
  const key = pairKey(a.id, b.id);
  const W = SIMILARITY_WEIGHTS;
  const parts: Record<SimilarityPart, number> = {
    genre: W.genre * jaccard(a.genres, b.genres),
    author: a.authorIds.some((x) => b.authorIds.includes(x)) ? W.author : 0,
    subjects: W.subjects * Math.min(1, jaccard(a.subjects, b.subjects) * 2.5),
    series: a.seriesIds.some((x) => b.seriesIds.includes(x)) ? W.series : 0,
    era: a.year && b.year ? W.era * Math.max(0, 1 - Math.abs(a.year - b.year) / 60) : 0,
    votes: W.votes * voteStrength(pairs.votes.get(key) ?? 0),
    coLikes: W.coLikes * Math.min(1, (pairs.coLikes.get(key) ?? 0) / FULL_CO_LIKES),
  };
  const total = Object.values(parts).reduce((s, x) => s + x, 0);
  const max = Object.values(W).reduce((s, x) => s + x, 0);
  return { score: total / max, parts, votes: pairs.votes.get(key) ?? 0 };
}
