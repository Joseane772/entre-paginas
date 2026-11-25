import { languageName } from "./text";

export const KIND_LABEL: Record<string, string> = {
  film: "Filme",
  tv_series: "Série",
  miniseries: "Minissérie",
  animated_film: "Filme de animação",
  animated_series: "Série de animação",
  anime: "Anime",
  comic: "BD",
  video_game: "Videojogo",
  game: "Jogo",
  stage: "Teatro",
  audio: "Rádio e áudio",
  other: "Outra",
};

/** Keys come from getBook(): "eng", "por-PT", "por-BR", "por-?". */
export function editionLanguageLabel(key: string): string {
  if (key === "por-PT") return "Português (Portugal)";
  if (key === "por-BR") return "Português (Brasil)";
  if (key === "por-?") return "Português";
  return languageName(key);
}
