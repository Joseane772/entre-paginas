import Link from "next/link";
import type { BookCard } from "@/lib/data/catalogue";
import { Cover } from "./Cover";

/** `note` adds a highlighted line under the author (e.g. why it's recommended). */
export function BookGrid({
  books,
  layout = "grid",
}: {
  books: (BookCard & { note?: string })[];
  /** "row" lays the books out in one line, for <BookRow>. */
  layout?: "grid" | "row";
}) {
  return (
    <ul className={layout === "row" ? "book-strip" : "book-grid"}>
      {books.map((b) => (
        <li key={b.slug}>
          <Link href={`/livro/${b.slug}`} className="book-card">
            <Cover title={b.title} author={b.authors} url={b.coverUrl} size="sm" />
            <span className="book-card-title">{b.title}</span>
            <span className="book-card-meta">
              {b.authors}
              {b.year ? `, ${b.year}` : ""}
            </span>
            {b.note && <span className="book-card-note">{b.note}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
