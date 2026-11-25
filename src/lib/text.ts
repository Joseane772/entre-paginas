/** Lowercase, strip accents and punctuation: "O Senhor dos Anéis!" -> "o senhor dos aneis". */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugify(s: string): string {
  return normalize(s).replace(/ /g, "-").slice(0, 80) || "sem-titulo";
}

/** OL/MARC uses ISO 639-2/B codes; Intl needs the /T form for these. */
const BIBLIOGRAPHIC_TO_TERMINOLOGIC: Record<string, string> = {
  alb: "sqi", arm: "hye", baq: "eus", bur: "mya", chi: "zho", cze: "ces",
  dut: "nld", fre: "fra", geo: "kat", ger: "deu", gre: "ell", ice: "isl",
  mac: "mkd", mao: "mri", may: "msa", per: "fas", rum: "ron", slo: "slk",
  tib: "bod", wel: "cym",
};

const languageNames = new Intl.DisplayNames(["pt-PT"], { type: "language" });

export function languageName(code: string): string {
  const c = BIBLIOGRAPHIC_TO_TERMINOLOGIC[code] ?? code;
  try {
    const name = languageNames.of(c);
    if (name && name !== c) return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    // fall through
  }
  return code;
}

/** Same language regardless of 2- or 3-letter form: "en" and "eng" -> "eng". */
const TWO_TO_THREE: Record<string, string> = {
  pt: "por", en: "eng", es: "spa", fr: "fra", de: "deu", it: "ita", pl: "pol",
  ru: "rus", ja: "jpn", zh: "zho", nl: "nld", sv: "swe", no: "nor", da: "dan",
  fi: "fin", cs: "ces", el: "ell", tr: "tur", ko: "kor", ar: "ara", he: "heb",
  hu: "hun", ro: "ron", uk: "ukr", ca: "cat", gl: "glg",
};

export function toIso3(code: string): string {
  const c = code.toLowerCase();
  return TWO_TO_THREE[c] ?? BIBLIOGRAPHIC_TO_TERMINOLOGIC[c] ?? c;
}

/**
 * Infer whether a Portuguese edition is from Portugal or Brazil.
 * ISBN registration groups are reliable: 972/989 = Portugal, 85/65 = Brazil.
 */
export function portugueseRegion(
  isbn13: string | null | undefined,
  places: string[] = [],
): "PT" | "BR" | null {
  const isbn = isbn13?.replace(/[^0-9]/g, "");
  if (isbn?.length === 13) {
    if (/^978(972|989)/.test(isbn)) return "PT";
    if (/^97(885|865)/.test(isbn)) return "BR";
  }
  const p = normalize(places.join(" "));
  if (/\b(lisboa|porto|coimbra|braga|portugal|amadora|mem martins|cascais)\b/.test(p)) return "PT";
  if (/\b(brasil|brazil|sao paulo|rio de janeiro|belo horizonte|porto alegre|curitiba)\b/.test(p)) return "BR";
  return null;
}

export function isbn10to13(isbn10: string): string | null {
  const d = isbn10.replace(/[^0-9X]/gi, "");
  if (d.length !== 10) return null;
  const core = "978" + d.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(core[i]) * (i % 2 ? 3 : 1);
  return core + ((10 - (sum % 10)) % 10);
}
