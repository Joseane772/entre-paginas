/**
 * The reading-taste questionnaire: questions, answer keys and validation. Shared by the quiz
 * (client), the server action and the recommender. Answers are stored as keys, so labels can
 * change without touching saved profiles.
 */

export const GENRES = {
  fantasia: "Fantasia",
  ficcao_cientifica: "Ficção científica",
  romance: "Romance",
  policial: "Policial e thriller",
  terror: "Terror",
  nao_ficcao: "Não-ficção e ensaio",
  classicos: "Clássicos",
  bd: "Banda desenhada e manga",
} as const;
export type Genre = keyof typeof GENRES;

export const QUESTIONS = [
  { key: "genres", q: "Que géneros preferes?", multi: true, options: GENRES },
  {
    key: "format",
    q: "Como preferes ler?",
    options: { papel: "Livro em papel", ebook: "E-book", audio: "Audiolivro", tanto_faz: "Tanto faz" },
  },
  {
    key: "pace",
    q: "Quantos livros lês, mais ou menos, por mês?",
    options: { menos_1: "Menos de 1", "1_2": "1 a 2", "3_5": "3 a 5", mais_5: "Mais de 5" },
  },
  {
    key: "series",
    q: "Preferes sagas longas ou livros únicos?",
    options: { sagas: "Sagas longas", unicos: "Livros únicos", depende: "Depende da história" },
  },
  {
    key: "adaptations",
    q: "Costumas ver as adaptações (filmes ou séries) dos livros que lês?",
    options: { sempre: "Sempre", as_vezes: "Às vezes", so_livro: "Prefiro só o livro" },
  },
  {
    key: "language",
    q: "Em que língua preferes ler?",
    options: { pt_pt: "Português (PT)", pt_br: "Português (BR)", en: "Inglês", outra: "Outra" },
  },
  {
    key: "box",
    q: "Na BookBox surpresa, preferes...",
    options: {
      surpresa: "Ser sempre surpreendido",
      aviso: "Um aviso prévio do género",
      recusar: "Poder recusar um livro que já li",
    },
  },
] as const;

type Q = (typeof QUESTIONS)[number];
type SingleKey = Exclude<Q["key"], "genres">;
type OptionOf<K extends Q["key"]> = keyof Extract<Q, { key: K }>["options"];

export type TasteAnswers = { genres: Genre[]; lovedWorkIds: number[] } & {
  [K in SingleKey]: OptionOf<K> | null;
};

export const MAX_LOVED = 10;

export const EMPTY_ANSWERS: TasteAnswers = {
  genres: [],
  format: null,
  pace: null,
  series: null,
  adaptations: null,
  language: null,
  box: null,
  lovedWorkIds: [],
};

/** Validate untrusted input (from the quiz) into answers; unknown values are dropped. */
export function parseTaste(input: unknown): TasteAnswers {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...EMPTY_ANSWERS };
  for (const q of QUESTIONS) {
    const v = raw[q.key];
    if (q.key === "genres") {
      out.genres = Array.isArray(v) ? [...new Set(v.filter((g): g is Genre => typeof g === "string" && g in GENRES))] : [];
    } else {
      out[q.key] = typeof v === "string" && v in q.options ? v : null;
    }
  }
  const loved = Array.isArray(raw.lovedWorkIds) ? raw.lovedWorkIds : [];
  out.lovedWorkIds = [...new Set(loved.filter((n): n is number => Number.isInteger(n) && n > 0))].slice(0, MAX_LOVED);
  return out as TasteAnswers;
}

/** Label for an answer, for summaries. */
export function answerLabel(key: Q["key"], value: string): string {
  const q = QUESTIONS.find((x) => x.key === key);
  return (q?.options as Record<string, string> | undefined)?.[value] ?? value;
}

/** URL slug for a genre page (/genero/ficcao-cientifica) and back. */
export const genreSlug = (g: Genre) => g.replace(/_/g, "-");
export const genreFromSlug = (slug: string): Genre | null => {
  const g = slug.replace(/-/g, "_");
  return g in GENRES ? (g as Genre) : null;
};
