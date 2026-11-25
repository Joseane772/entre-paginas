import { getJson } from "./http";

/** Lead section of a Portuguese Wikipedia article, as plain text. */
export async function getPtSummary(title: string): Promise<{ extract: string; url: string } | null> {
  try {
    const d = await getJson<{ extract?: string; content_urls?: { desktop?: { page?: string } } }>(
      "wikipedia",
      `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    );
    if (!d.extract) return null;
    return {
      extract: d.extract,
      url: d.content_urls?.desktop?.page ?? `https://pt.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    };
  } catch {
    return null;
  }
}
