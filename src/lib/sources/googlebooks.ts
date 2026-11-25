import { getJson } from "./http";
import { isbn10to13 } from "../text";

const key = () => process.env.GOOGLE_BOOKS_API_KEY;
export const googleBooksEnabled = () => !!key();

export type GbVolume = {
  id: string;
  title: string;
  publisher?: string;
  year?: number;
  language?: string;
  isbn13?: string;
  isbn10?: string;
  thumbnail?: string;
};

/** Portuguese-language volumes for a title/author. Needs GOOGLE_BOOKS_API_KEY (the keyless quota is shared and usually exhausted). */
export async function searchPortugueseVolumes(title: string, author?: string): Promise<GbVolume[]> {
  if (!key()) return [];
  const q = [`intitle:${title}`, author && `inauthor:${author}`].filter(Boolean).join("+");
  const d = await getJson<{
    items?: {
      id: string;
      volumeInfo: {
        title: string;
        publisher?: string;
        publishedDate?: string;
        language?: string;
        industryIdentifiers?: { type: string; identifier: string }[];
        imageLinks?: { thumbnail?: string };
      };
    }[];
  }>(
    "googlebooks",
    `https://www.googleapis.com/books/v1/volumes?${new URLSearchParams({
      q,
      langRestrict: "pt",
      maxResults: "40",
      printType: "books",
      key: key()!,
    })}`,
  );
  return (d.items ?? []).map(({ id, volumeInfo: v }) => {
    const ids = Object.fromEntries((v.industryIdentifiers ?? []).map((i) => [i.type, i.identifier]));
    return {
      id,
      title: v.title,
      publisher: v.publisher,
      year: v.publishedDate ? Number(v.publishedDate.slice(0, 4)) : undefined,
      language: v.language,
      isbn13: ids.ISBN_13 ?? (ids.ISBN_10 ? isbn10to13(ids.ISBN_10) ?? undefined : undefined),
      isbn10: ids.ISBN_10,
      thumbnail: v.imageLinks?.thumbnail?.replace("http://", "https://"),
    };
  });
}
