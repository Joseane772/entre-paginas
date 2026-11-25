import type { Genre } from "./taste";

/**
 * Works our questionnaire genres out of Open Library subjects, which are free text in several
 * languages ("Fantasy fiction", "Ficción fantástica inglesa", "Science-fiction américaine").
 * A genre counts when at least half as many subjects point to it as to the strongest one, so a
 * fantasy saga with one "Murder" subject doesn't become a thriller.
 */
const PATTERNS: [Exclude<Genre, "classicos">, RegExp][] = [
  ["fantasia", /fantas[iyí]|fantástic|magic|magia|wizard|sorcer|witch|dragon|elves|\belf\b|dwarves|hobbit|middle.earth|mythical|epic fantasy|high fantasy/i],
  ["ficcao_cientifica", /science.?fiction|ciência|científica|sci.?fi|space opera|dystop|distop|apocalyp|futur|robot|time travel|cyberpunk/i],
  ["romance", /\bromance\b|love stor|courtship|romantic/i],
  ["policial", /detective|myster|thriller|suspense|\bcrimes?\b|criminals?\b|police|policial|espionage|spy stor|murder/i],
  ["terror", /horror|terror|ghost stor|haunted|supernatural fiction|paranormal/i],
  ["nao_ficcao", /non.?fiction|biograph|memoir|essays?\b|ensaio|history\b(?! and criticism)|philosoph|self.help|journalism/i],
  ["bd", /comic|graphic novel|manga|banda desenhada|bande dessin|cartoons/i],
];

const FICTION = /fiction|ficción|ficção|novel|romans?\b|roman\b|stories|contos/i;
const CLASSIC = /classic|clássico|clásico/i;

export function genresFromSubjects(subjects: string[], year: number | null): Genre[] {
  const score = new Map<Genre, number>();
  for (const s of subjects)
    for (const [g, re] of PATTERNS) if (re.test(s)) score.set(g, (score.get(g) ?? 0) + 1);
  if (subjects.some((s) => FICTION.test(s))) score.delete("nao_ficcao");

  const top = Math.max(0, ...score.values());
  const out = [...score].filter(([, n]) => n >= Math.max(1, top * 0.5)).sort((a, b) => b[1] - a[1]).map(([g]) => g);
  // Old enough to be a classic, or labelled as one.
  if ((year !== null && year < 1950) || subjects.some((s) => CLASSIC.test(s))) out.push("classicos");
  return out;
}

/** Lower-cased subject keys for overlap: drops generic and bookkeeping subjects. */
const NOISE = /^(fiction|ficción|ficção|general|novels?|literature|large type books|new york times|translations?|reading level|open library|popular carousel|accessible book|protected daisy|in library|lectures et morceaux|romans, nouvelles|.*language materials)/i;

export function subjectKeys(subjects: string[]): string[] {
  const keys = new Set<string>();
  for (const s of subjects) {
    const k = s
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[,.;:()\-–]+/g, " ")
      .replace(/\b(fiction|ficcion|ficcao|in fiction|fictitious character|imaginary place|juvenile)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (k.length > 2 && !NOISE.test(s)) keys.add(k);
  }
  return [...keys];
}
