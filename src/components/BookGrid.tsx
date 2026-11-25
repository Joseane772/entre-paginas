import Link from "next/link";
import type { BookCard } from "@/lib/data/catalogue";
import { Cover } from "./Cover";

export function BookGrid({ books }: { books: BookCard[] }) {
  return (
    <ul className="book-grid">
      {books.map((b) => (
        <li key={b.slug}>
          <Link href={`/livro/${b.slug}`} className="book-card">
            <Cover title={b.title} author={b.authors} url={b.coverUrl} size="sm" />
            <span className="book-card-title">{b.title}</span>
            <span className="book-card-meta">
              {b.authors}
              {b.year ? `, ${b.year}` : ""}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
