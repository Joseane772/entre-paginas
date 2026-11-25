import Link from "next/link";
import { getMyReading, getReviews } from "@/lib/data/reading";
import { getSession } from "@/lib/session";
import { ReadingControls } from "./ReadingControls";

/** "My reading" panel. Reads the session, so render it inside <Suspense>. */
export async function MyReading({ workId, slug }: { workId: number; slug: string }) {
  const session = await getSession();
  if (!session) {
    return (
      <section className="panel">
        <h2>A minha leitura</h2>
        <p className="sub">Guarda o que queres ler, o que estás a ler e o que já leste, e dá a tua opinião.</p>
        <Link className="btn btn-solid" href={`/entrar?voltar=${encodeURIComponent(`/livro/${slug}`)}`}>
          Entrar para guardar
        </Link>
      </section>
    );
  }
  const { status, review } = await getMyReading(session.user.id, workId);
  return (
    <section className="panel">
      <h2>A minha leitura</h2>
      <p className="sub">
        {status?.finishedOn
          ? `Leste em ${new Date(status.finishedOn).toLocaleDateString("pt-PT")}.`
          : status?.startedOn
            ? `Começaste em ${new Date(status.startedOn).toLocaleDateString("pt-PT")}.`
            : "Marca o teu estado e classifica o livro."}
      </p>
      <ReadingControls
        workId={workId}
        state={status?.state ?? null}
        review={review && { rating: review.rating, body: review.body, spoilers: review.spoilers }}
      />
    </section>
  );
}

export const stars = (n: number) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));

export async function Reviews({ workId }: { workId: number }) {
  const { count, average, list } = await getReviews(workId);
  return (
    <section className="panel">
      <h2>Opiniões dos leitores</h2>
      {count === 0 ? (
        <p className="muted">Ainda ninguém deu a sua opinião sobre este livro.</p>
      ) : (
        <>
          <div className="rating-summary">
            <b>{average!.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}</b>
            <span className="stars-static" aria-hidden>
              {stars(average!)}
            </span>
            <span className="sub">
              {count} {count === 1 ? "opinião" : "opiniões"}
            </span>
          </div>
          <div>
            {list.map((r) => (
              <article key={r.userId} className="review">
                <div>
                  <b>{r.name}</b>{" "}
                  <span className="stars-static" aria-label={`${r.rating} em 5`}>
                    {stars(r.rating)}
                  </span>{" "}
                  <small className="muted">{r.updatedAt.toLocaleDateString("pt-PT")}</small>
                </div>
                {r.body &&
                  (r.spoilers ? (
                    <details>
                      <summary>Contém spoilers. Mostrar</summary>
                      <p>{r.body}</p>
                    </details>
                  ) : (
                    <p>{r.body}</p>
                  ))}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
