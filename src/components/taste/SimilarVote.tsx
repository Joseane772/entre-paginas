"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { voteSimilar } from "@/app/taste-actions";

export function SimilarVote({
  workId,
  books,
  mine,
  minVotes,
}: {
  workId: number;
  books: { id: number; label: string }[];
  mine: number[];
  minVotes: number;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const label = new Map(books.map((b) => [b.id, b.label]));

  const run = (otherId: number, remove = false) =>
    start(async () => {
      const r = await voteSimilar(workId, otherId, remove);
      setError(r.error);
      if (r.ok) {
        setChoice("");
        router.refresh();
      }
    });

  return (
    <div style={{ marginTop: 18 }}>
      <form
        className="similar-vote"
        onSubmit={(e) => {
          e.preventDefault();
          if (choice) run(Number(choice));
        }}
      >
        <label htmlFor="similar-pick">Este livro é parecido com</label>
        <select id="similar-pick" value={choice} onChange={(e) => setChoice(e.target.value)}>
          <option value="">escolhe um livro…</option>
          {books
            .filter((b) => !mine.includes(b.id))
            .map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
        </select>
        <button className="btn" type="submit" disabled={!choice || pending}>
          Sugerir
        </button>
      </form>
      <p className="muted" style={{ fontSize: "0.85rem", margin: "6px 0 0" }}>
        Quando {minVotes} ou mais leitores ligam dois livros, eles passam a aparecer como parecidos nas recomendações.
      </p>
      {mine.length > 0 && (
        <ul className="my-votes" aria-label="Os livros que sugeriste">
          {mine.map((id) => (
            <li key={id}>
              {label.get(id)?.split(" · ")[0] ?? "Livro"}
              <button type="button" onClick={() => run(id, true)} disabled={pending} aria-label="Retirar sugestão">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
