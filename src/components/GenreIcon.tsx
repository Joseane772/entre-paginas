import type { Genre } from "@/lib/taste";

/** Binding colours for the genre books: muted tones that sit with the site's teal. */
export const GENRE_COLOR: Record<Genre | "todos", string> = {
  todos: "#1f6f64",
  fantasia: "#6f5a96",
  ficcao_cientifica: "#3d6b8f",
  romance: "#c0604c",
  policial: "#33475b",
  terror: "#4d4a63",
  nao_ficcao: "#b3862f",
  classicos: "#2f8f7f",
  bd: "#6b8f4e",
};

const SYMBOL: Record<Genre, React.ReactNode> = {
  fantasia: <path d="M25.5 13l2 6.5 6.5 2-6.5 2-2 6.5-2-6.5-6.5-2 6.5-2z" fill="#fff" />,
  ficcao_cientifica: (
    <g stroke="#fff" strokeWidth="2" fill="none">
      <circle cx="25.5" cy="22" r="5.5" fill="#fff" />
      <ellipse cx="25.5" cy="22" rx="11" ry="3.6" transform="rotate(-18 25.5 22)" />
    </g>
  ),
  romance: <path d="M25.5 30s-7.5-4.5-7.5-9.6a3.9 3.9 0 0 1 7.5-1.7 3.9 3.9 0 0 1 7.5 1.7c0 5.1-7.5 9.6-7.5 9.6z" fill="#fff" />,
  policial: (
    <g stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round">
      <circle cx="24" cy="20.5" r="5.5" />
      <path d="M28 24.5l4.5 4.5" />
    </g>
  ),
  terror: <path d="M28.5 14.5a8 8 0 1 0 4.5 13.6 6.6 6.6 0 0 1-4.5-13.6z" fill="#fff" />,
  nao_ficcao: (
    <path d="M17.5 16h16M17.5 21h16M17.5 26h10" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
  ),
  classicos: (
    <path
      d="M17 17.5h17M19.5 14.5h12M19.5 17.5v11M25.5 17.5v11M31.5 17.5v11M16.5 30h18"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  ),
  bd: (
    <path
      d="M17 15h17v11h-9l-4.5 4v-4H17z"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinejoin="round"
      fill="none"
    />
  ),
};

/** A little standing book (or, for "todos", a stack) illustrating a genre. Decorative. */
export function GenreIcon({ genre, size = 48 }: { genre: Genre | "todos"; size?: number }) {
  const c = GENRE_COLOR[genre];
  if (genre === "todos") {
    const books: [number, string][] = [
      [8, "#c0604c"],
      [21, "#3d6b8f"],
      [34, c],
    ];
    return (
      <svg width={size} height={size * (56 / 48)} viewBox="0 0 48 56" aria-hidden="true" focusable="false">
        {books.map(([y, col], i) => (
          <g key={y} transform={`translate(${i % 2 ? 3 : 0} 0)`}>
            <rect x="5" y={y} width="36" height="12" rx="3" fill={col} />
            <rect x="31" y={y + 2.5} width="10" height="7" rx="2" fill="#f7f3ea" />
            <rect x="11" y={y + 4.5} width="14" height="3" rx="1.5" fill="#fff" opacity=".55" />
          </g>
        ))}
        <path d="M14 46h5v8l-2.5-2-2.5 2z" fill="var(--ribbon)" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size * (56 / 48)} viewBox="0 0 48 56" aria-hidden="true" focusable="false">
      <rect x="6" y="4" width="36" height="46" rx="5" fill={c} />
      <rect x="9" y="4" width="33" height="38" rx="4" fill="#fff" opacity=".14" />
      <rect x="10" y="42.5" width="32" height="5" rx="2.5" fill="#f7f3ea" />
      {SYMBOL[genre]}
      <path d="M32 44h5v10l-2.5-2-2.5 2z" fill="var(--ribbon)" />
    </svg>
  );
}
