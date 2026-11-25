import { getJson } from "./http";

const BASE = "https://openlibrary.org";

export const olCover = (id: number, size: "S" | "M" | "L" = "L") =>
  `https://covers.openlibrary.org/b/id/${id}-${size}.jpg`;

/** "/works/OL893414W" -> "OL893414W" */
export const olId = (key: string) => key.split("/").pop()!;

export type OlSearchDoc = {
  key: string;
  title: string;
  author_name?: string[];
  author_key?: string[];
  first_publish_year?: number;
  cover_i?: number;
  edition_count?: number;
  language?: string[];
};

export async function searchWorks(q: string, limit = 10): Promise<OlSearchDoc[]> {
  const params = new URLSearchParams({
    q,
    limit: String(limit),
    fields: "key,title,author_name,author_key,first_publish_year,cover_i,edition_count,language",
  });
  const res = await getJson<{ docs: OlSearchDoc[] }>("openlibrary", `${BASE}/search.json?${params}`);
  return res.docs;
}

type OlText = string | { value: string };
const text = (t?: OlText) => (t == null ? undefined : typeof t === "string" ? t : t.value);

export type OlWork = {
  key: string;
  title: string;
  description?: string;
  covers?: number[];
  subjects?: string[];
  authorKeys: string[];
  firstPublishDate?: string;
  wikidataId?: string;
};

/** Fetch a work, following OL's merge redirects. The returned `key` is the canonical one. */
export async function getWork(id: string, hops = 3): Promise<OlWork> {
  const w = await getJson<{
    key: string;
    type?: { key: string };
    location?: string;
    title: string;
    description?: OlText;
    covers?: number[];
    subjects?: string[];
    authors?: { author: { key: string } }[];
    first_publish_date?: string;
    identifiers?: { wikidata?: string[] };
  }>("openlibrary", `${BASE}/works/${id}.json`);
  if (w.type?.key === "/type/redirect" && w.location && hops > 0) {
    return getWork(olId(w.location), hops - 1);
  }
  return {
    key: w.key,
    title: w.title,
    description: cleanDescription(text(w.description)),
    covers: w.covers?.filter((c) => c > 0),
    subjects: w.subjects,
    authorKeys: (w.authors ?? []).map((a) => olId(a.author.key)),
    firstPublishDate: w.first_publish_date,
    wikidataId: w.identifiers?.wikidata?.[0],
  };
}

/** OL descriptions often end with source notes or link lists; keep the prose. */
function cleanDescription(s?: string) {
  if (!s) return s;
  return s
    .split(/\r?\n-{3,}|\r?\n\(\[source\]|\r?\n\[source\]/i)[0]
    .replace(/\[([^\]]+)\]\[\d+\]/g, "$1")
    .trim();
}

export type OlAuthor = { key: string; name: string; wikidataId?: string };

export async function getAuthor(id: string): Promise<OlAuthor> {
  const a = await getJson<{ key: string; name: string; remote_ids?: { wikidata?: string } }>(
    "openlibrary",
    `${BASE}/authors/${id}.json`,
  );
  return { key: olId(a.key), name: a.name, wikidataId: a.remote_ids?.wikidata };
}

export type OlEdition = {
  key: string;
  title: string;
  languages: string[];
  publishers: string[];
  publishPlaces: string[];
  publishYear?: number;
  isbn13?: string;
  isbn10?: string;
  cover?: number;
};

/** All editions of a work, paging through the API (capped to keep imports quick). */
export async function getEditions(workId: string, max = 600): Promise<OlEdition[]> {
  const out: OlEdition[] = [];
  for (let offset = 0; offset < max; offset += 200) {
    const page = await getJson<{
      entries: {
        key: string;
        title: string;
        languages?: { key: string }[];
        publishers?: string[];
        publish_places?: string[];
        publish_date?: string;
        isbn_13?: string[];
        isbn_10?: string[];
        covers?: number[];
      }[];
      size: number;
    }>("openlibrary", `${BASE}/works/${workId}/editions.json?limit=200&offset=${offset}`);
    for (const e of page.entries) {
      const year = e.publish_date?.match(/\b(1[5-9]\d\d|20\d\d)\b/)?.[1];
      out.push({
        key: olId(e.key),
        title: e.title,
        languages: (e.languages ?? []).map((l) => olId(l.key)),
        publishers: e.publishers ?? [],
        publishPlaces: e.publish_places ?? [],
        publishYear: year ? Number(year) : undefined,
        isbn13: e.isbn_13?.[0]?.replace(/-/g, ""),
        isbn10: e.isbn_10?.[0]?.replace(/-/g, ""),
        cover: e.covers?.find((c) => c > 0),
      });
    }
    if (offset + 200 >= page.size) break;
  }
  return out;
}
