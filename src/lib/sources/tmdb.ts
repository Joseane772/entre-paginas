import { getJson } from "./http";

const BASE = "https://api.themoviedb.org/3";
const token = () => process.env.TMDB_READ_TOKEN;

export const tmdbEnabled = () => !!token();

export type TmdbDetails = { title: string; overview?: string; posterUrl?: string; year?: number };

/** Portuguese (Portugal) title, synopsis and poster. Returns null when TMDB isn't configured. */
export async function getTmdbDetails(type: "movie" | "tv", id: number): Promise<TmdbDetails | null> {
  if (!token()) return null;
  const d = await getJson<{
    title?: string;
    name?: string;
    overview?: string;
    poster_path?: string | null;
    release_date?: string;
    first_air_date?: string;
  }>("tmdb", `${BASE}/${type}/${id}?language=pt-PT`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  const date = d.release_date || d.first_air_date;
  return {
    title: (d.title ?? d.name)!,
    overview: d.overview || undefined,
    posterUrl: d.poster_path ? `https://image.tmdb.org/t/p/w342${d.poster_path}` : undefined,
    year: date ? Number(date.slice(0, 4)) : undefined,
  };
}
