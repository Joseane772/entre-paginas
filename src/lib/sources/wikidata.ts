import { getJson } from "./http";
import { normalize } from "../text";

const ENDPOINT = "https://query.wikidata.org/sparql";

type Binding = Record<string, { value: string; "xml:lang"?: string }>;

async function sparql(query: string): Promise<Record<string, string>[]> {
  const res = await getJson<{ results: { bindings: Binding[] } }>(
    "wikidata",
    `${ENDPOINT}?${new URLSearchParams({ query, format: "json" })}`,
    { headers: { Accept: "application/sparql-results+json" } },
    { timeoutMs: 60_000 },
  );
  return res.results.bindings.map((b) =>
    Object.fromEntries(
      Object.entries(b).map(([k, v]) => [k, v.value.replace("http://www.wikidata.org/entity/", "")]),
    ),
  );
}

const QID = /^Q\d+$/;
const assertQid = (q: string) => {
  if (!QID.test(q)) throw new Error(`Invalid Wikidata id: ${q}`);
  return q;
};
const lit = (s: string) => JSON.stringify(s); // SPARQL string literal (JSON escaping is compatible)
const year = (d?: string) => (d ? Number(d.slice(0, d.startsWith("-") ? 5 : 4)) || undefined : undefined);

/**
 * Find the Wikidata item for a book. Open Library work ids on Wikidata are patchy
 * (OL has many duplicate works), so fall back to "same author + same title".
 */
export async function findWorkQid(opts: {
  olWorkId?: string;
  authorOlIds?: string[];
  titles: string[];
}): Promise<string | null> {
  if (opts.olWorkId) {
    const rows = await sparql(`SELECT ?w WHERE { ?w wdt:P648 ${lit(opts.olWorkId)} } LIMIT 1`);
    if (rows[0]?.w) return rows[0].w;
  }
  if (!opts.authorOlIds?.length) return null;
  const rows = await sparql(`
    SELECT DISTINCT ?w ?label ?series ?lit WHERE {
      VALUES ?aol { ${opts.authorOlIds.map(lit).join(" ")} }
      ?author wdt:P648 ?aol.
      ?w wdt:P50 ?author.
      { ?w rdfs:label ?label } UNION { ?w wdt:P1476 ?label } UNION { ?w skos:altLabel ?label }
      OPTIONAL { ?w wdt:P179 ?series }
      BIND(EXISTS { ?w wdt:P31/wdt:P279* wd:Q7725634 } AS ?lit)
      ${NOT_A_BOOK("?w")}
    }`);
  const wanted = new Set(opts.titles.map(normalize));
  const hits = rows.filter((r) => wanted.has(normalize(r.label)));
  if (!hits.length) return null;
  // Prefer literary works, then items in a series (the canonical "work" item, not a stray duplicate).
  const score = (h: Record<string, string>) => (h.lit === "true" ? 2 : 0) + (h.series ? 1 : 0);
  return hits.sort((a, b) => score(b) - score(a))[0].w;
}

/**
 * Films also carry P50 (author of the source), and edition items duplicate works.
 * Skip anything with a director, a TMDB id, or that is an edition/translation of another work.
 */
const NOT_A_BOOK = (v: string) => `
      FILTER NOT EXISTS { ${v} wdt:P31 wd:Q3331189 }
      FILTER NOT EXISTS { ${v} wdt:P629 ?_editionOf }
      FILTER NOT EXISTS { ${v} wdt:P57 ?_director }
      FILTER NOT EXISTS { ${v} wdt:P4947|wdt:P4983 ?_tmdb }`;

export type WdWork = {
  qid: string;
  labelPt?: string;
  labelEn?: string;
  originalTitle?: string;
  originalLanguage?: string;
  year?: number;
  ptWikiTitle?: string;
  olWorkId?: string;
  authors: { qid: string; name: string; olId?: string }[];
  series: { qid: string; name: string; ordinal?: string }[];
};

export async function getWork(qid: string): Promise<WdWork> {
  assertQid(qid);
  const rows = await sparql(`
    SELECT ?labelPt ?labelEn ?labelMul ?origTitle ?origLang ?date ?langCode ?ptwiki ?olw
           ?author ?authorLabel ?authorOl ?series ?seriesLabel ?ord WHERE {
      BIND(wd:${qid} AS ?w)
      OPTIONAL { ?w rdfs:label ?labelPt FILTER(lang(?labelPt) = "pt") }
      OPTIONAL { ?w rdfs:label ?labelEn FILTER(lang(?labelEn) = "en") }
      OPTIONAL { ?w rdfs:label ?labelMul FILTER(lang(?labelMul) = "mul") }
      OPTIONAL { ?w wdt:P1476 ?origTitle BIND(lang(?origTitle) AS ?origLang) }
      OPTIONAL { ?w wdt:P577 ?date }
      OPTIONAL { ?w wdt:P407 ?lang. ?lang wdt:P218 ?langCode }
      OPTIONAL { ?w wdt:P648 ?olw FILTER(STRENDS(?olw, "W")) }
      OPTIONAL { ?ptArticle schema:about ?w; schema:isPartOf <https://pt.wikipedia.org/>; schema:name ?ptwiki }
      OPTIONAL { ?w wdt:P50 ?author. OPTIONAL { ?author wdt:P648 ?authorOl } }
      OPTIONAL { ?w p:P179 ?st. ?st ps:P179 ?series. OPTIONAL { ?st pq:P1545 ?ord } }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,mul,en". }
    }`);
  const first = <K extends string>(k: K) => rows.find((r) => r[k])?.[k];
  const years = rows.map((r) => year(r.date)).filter((y): y is number => !!y);
  const authors = new Map<string, WdWork["authors"][number]>();
  const series = new Map<string, WdWork["series"][number]>();
  for (const r of rows) {
    if (r.author && !authors.has(r.author))
      authors.set(r.author, { qid: r.author, name: r.authorLabel, olId: r.authorOl });
    if (r.series && !series.has(r.series))
      series.set(r.series, { qid: r.series, name: r.seriesLabel, ordinal: r.ord });
  }
  const labelEn = first("labelEn") ?? first("labelMul");
  const originalLanguage = first("langCode");
  return {
    qid,
    labelPt: first("labelPt"),
    labelEn,
    originalTitle: pickOriginalTitle(rows, originalLanguage, labelEn),
    originalLanguage,
    year: years.length ? Math.min(...years) : undefined,
    ptWikiTitle: first("ptwiki"),
    olWorkId: first("olw"),
    authors: [...authors.values()],
    series: [...series.values()],
  };
}

/**
 * P1476 often holds the title in several languages (Dune Messiah has a Japanese one).
 * Take the one in the book's own language, preferring the one that matches the English label.
 */
function pickOriginalTitle(rows: Record<string, string>[], lang?: string, labelEn?: string) {
  const titles = [...new Map(rows.filter((r) => r.origTitle).map((r) => [r.origTitle, r.origLang])).entries()];
  if (!titles.length) return undefined;
  const inLang = lang ? titles.filter(([, l]) => l === lang) : [];
  const pool = inLang.length ? inLang : lang ? [] : titles;
  if (!pool.length) return undefined;
  const want = labelEn ? normalize(labelEn) : undefined;
  return (pool.find(([t]) => normalize(t) === want) ?? pool[0])[0];
}

export type WdSeriesMember = {
  qid: string;
  title: string;
  /** English label, used to spot duplicate items for the same book. */
  labelEn?: string;
  ordinal?: string;
  year?: number;
  olWorkId?: string;
};

/**
 * The books of a series, cleaned up. Wikidata series often also list:
 *  - sub-parts of volumes (LOTR's six "books"), which are `part of` another member;
 *  - individual short stories (The Witcher), which have no ordinal and no Open Library entry;
 *  - duplicate items for the same book, one with an ordinal and one without.
 */
export async function getSeriesMembers(seriesQid: string): Promise<WdSeriesMember[]> {
  assertQid(seriesQid);
  const rows = await sparql(`
    SELECT ?w ?wLabel ?labelEn ?ord ?date ?ol WHERE {
      ?w p:P179 ?st. ?st ps:P179 wd:${seriesQid}.
      FILTER EXISTS { ?w wdt:P50 ?anyAuthor }
      ${NOT_A_BOOK("?w")}
      FILTER NOT EXISTS { ?w wdt:P361 ?parent. ?parent wdt:P179 wd:${seriesQid} }
      OPTIONAL { ?st pq:P1545 ?ord }
      OPTIONAL { ?w wdt:P577 ?date }
      OPTIONAL { ?w wdt:P648 ?ol }
      OPTIONAL { ?w rdfs:label ?labelEn FILTER(lang(?labelEn) IN ("en", "mul")) }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,mul,en". }
    }`);
  const byQid = new Map<string, WdSeriesMember>();
  for (const r of rows) {
    const m = byQid.get(r.w) ?? { qid: r.w, title: r.wLabel, labelEn: r.labelEn };
    m.ordinal ??= r.ord;
    const y = year(r.date);
    if (y && (!m.year || y < m.year)) m.year = y;
    if (r.ol?.endsWith("W")) m.olWorkId ??= r.ol;
    byQid.set(r.w, m);
  }
  let members = [...byQid.values()].filter((m) => !QID.test(m.title));

  const numbered = members.some((m) => m.ordinal);
  if (numbered) members = members.filter((m) => m.ordinal || m.olWorkId);

  // Collapse duplicates by title, keeping the numbered one.
  const byTitle = new Map<string, WdSeriesMember>();
  for (const m of members.sort((a, b) => Number(!!b.ordinal) - Number(!!a.ordinal))) {
    const key = normalize(m.labelEn ?? m.title);
    const kept = byTitle.get(key);
    if (!kept) byTitle.set(key, m);
    else {
      kept.olWorkId ??= m.olWorkId;
      if (m.year && (!kept.year || m.year < kept.year)) kept.year = m.year;
    }
  }
  return [...byTitle.values()];
}

// ---------------------------------------------------------------------------
// Adaptations

type Kind =
  | "film" | "tv_series" | "miniseries" | "animated_film" | "animated_series" | "anime"
  | "comic" | "video_game" | "game" | "stage" | "audio";

/** Wikidata "instance of" -> our kind. Order matters: first match wins. */
const TYPE_KIND: [string, Kind][] = [
  ["Q63952888", "anime"], ["Q1107", "anime"], ["Q20650540", "anime"],
  ["Q117467246", "animated_series"], ["Q581714", "animated_series"],
  ["Q202866", "animated_film"], ["Q98807719", "animated_film"],
  ["Q1259759", "miniseries"],
  ["Q5398426", "tv_series"],
  ["Q11424", "film"], ["Q506240", "film"], ["Q24862", "film"], ["Q1261214", "film"],
  ["Q7889", "video_game"],
  ["Q1004", "comic"], ["Q8274", "comic"], ["Q725377", "comic"], ["Q21198342", "comic"],
  ["Q14406742", "comic"], ["Q1760610", "comic"], ["Q838795", "comic"],
  ["Q1643932", "game"], ["Q136384529", "game"], ["Q734698", "game"], ["Q131436", "game"],
  ["Q1783817", "game"], ["Q532716", "game"],
  ["Q58483083", "stage"], ["Q7777570", "stage"], ["Q2743", "stage"], ["Q1344", "stage"],
  ["Q2635894", "audio"], ["Q1555508", "audio"], ["Q3956369", "audio"], ["Q14623351", "audio"],
];
/** Never-made projects, episodes, seasons and franchise groupings aren't adaptations to list. */
const EXCLUDE = new Set(["Q18011171", "Q18011172", "Q21191270", "Q3464665", "Q24856", "Q13593818", "Q7058673"]);

export type WdAdaptation = {
  qid: string;
  title: string;
  kind: Kind;
  year?: number;
  credits: string[];
  tmdbId?: number;
  tmdbType?: "movie" | "tv";
  viaSeries: boolean;
};

/** Adaptations "based on" (P144) the work, or on any of its series. */
export async function getAdaptations(workQid: string, seriesQids: string[] = []): Promise<WdAdaptation[]> {
  const sources = [workQid, ...seriesQids].map(assertQid);
  const rows = await sparql(`
    SELECT ?a ?aLabel ?src ?type ?date ?tmdbM ?tmdbT ?creditLabel WHERE {
      VALUES ?src { ${sources.map((q) => `wd:${q}`).join(" ")} }
      ?a wdt:P144 ?src.
      OPTIONAL { ?a wdt:P31 ?type }
      OPTIONAL { ?a wdt:P577 ?date }
      OPTIONAL { ?a wdt:P4947 ?tmdbM }
      OPTIONAL { ?a wdt:P4983 ?tmdbT }
      OPTIONAL { ?a wdt:P57|wdt:P170|wdt:P178 ?credit }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,mul,en". }
    }`);

  const grouped = new Map<string, { rows: Record<string, string>[] }>();
  for (const r of rows) (grouped.get(r.a) ?? grouped.set(r.a, { rows: [] }).get(r.a)!).rows.push(r);

  const out: WdAdaptation[] = [];
  for (const [qid, { rows: rs }] of grouped) {
    const types = new Set(rs.map((r) => r.type).filter(Boolean));
    if ([...types].some((t) => EXCLUDE.has(t))) continue;
    const tmdbM = rs.find((r) => r.tmdbM)?.tmdbM;
    const tmdbT = rs.find((r) => r.tmdbT)?.tmdbT;
    let kind = TYPE_KIND.find(([t]) => types.has(t))?.[1];
    if (!kind && tmdbM) kind = "film";
    if (!kind && tmdbT) kind = "tv_series";
    if (!kind) continue; // derivative novels, merchandise, organisations, etc.
    const years = rs.map((r) => year(r.date)).filter((y): y is number => !!y);
    const title = rs[0].aLabel;
    if (QID.test(title)) continue; // no label in pt/en
    out.push({
      qid,
      title,
      kind,
      year: years.length ? Math.min(...years) : undefined,
      credits: [...new Set(rs.map((r) => r.creditLabel).filter((c) => c && !QID.test(c)))],
      tmdbId: tmdbM ? Number(tmdbM) : tmdbT ? Number(tmdbT) : undefined,
      tmdbType: tmdbM ? "movie" : tmdbT ? "tv" : undefined,
      viaSeries: !rs.some((r) => r.src === workQid),
    });
  }
  return out.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
}
