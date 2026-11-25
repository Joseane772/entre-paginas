import Link from "next/link";
import { Cover } from "@/components/Cover";
import type { Recommendation } from "@/lib/data/recommend";

/** Recommended books with the reasons each one was picked. */
export function RecList({ items }: { items: Recommendation[] }) {
  return (
    <ul className="rec-list">
      {items.map((r) => (
        <li key={r.id}>
          <Link href={`/livro/${r.slug}`}>
            <Cover title={r.title} author={r.authors} url={r.coverUrl} size="sm" />
            <div>
              <h3>{r.title}</h3>
              <span className="book-card-meta">
                {r.authors}
                {r.year ? `, ${r.year}` : ""}
              </span>
              {r.reasons.length > 0 && (
                <ul aria-label="Porque te recomendamos">
                  {r.reasons.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
