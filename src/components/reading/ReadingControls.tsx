"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteReview, saveReview, setReadingState, type ActionResult } from "@/app/reading-actions";
import type { ReadingStateValue } from "@/lib/data/reading";

const STATES: [ReadingStateValue, string][] = [
  ["quero_ler", "Quero ler"],
  ["a_ler", "A ler"],
  ["lido", "Li"],
];

export function ReadingControls({
  workId,
  state: initialState,
  review,
}: {
  workId: number;
  state: ReadingStateValue | null;
  review: { rating: number; body: string | null; spoilers: boolean } | null;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [result, setResult] = useState<ActionResult>({});
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      setResult(r);
      if (r.ok) router.refresh();
    });

  return (
    <div className="reader">
      <div className="segmented" role="group" aria-label="O meu estado de leitura">
        {STATES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="btn"
            aria-pressed={state === value}
            disabled={pending}
            onClick={() => {
              const next = state === value ? null : value;
              setState(next);
              run(() => setReadingState(workId, next));
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <form action={(form) => run(() => saveReview(workId, form))} className="form" style={{ maxWidth: "none" }}>
        <input type="hidden" name="rating" value={rating || ""} />
        <div>
          <div className="stars" role="radiogroup" aria-label="Classificação" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
                data-on={(hover || rating) >= n}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
              >
                ★
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          A tua opinião (opcional)
          <textarea name="body" defaultValue={review?.body ?? ""} maxLength={5000} />
        </label>
        <label className="check">
          <input type="checkbox" name="spoilers" defaultChecked={review?.spoilers} /> Tem spoilers
        </label>
        <div className="inline-actions">
          <button className="btn btn-solid" type="submit" disabled={pending || !rating}>
            {review ? "Atualizar opinião" : "Publicar opinião"}
          </button>
          {review && (
            <button
              type="button"
              className="btn btn-danger"
              disabled={pending}
              onClick={() => {
                setRating(0);
                run(() => deleteReview(workId));
              }}
            >
              Apagar
            </button>
          )}
        </div>
        {result.error && (
          <p className="form-error" role="alert">
            {result.error}
          </p>
        )}
        {result.ok && !pending && <p className="form-ok">Guardado.</p>}
      </form>
    </div>
  );
}
