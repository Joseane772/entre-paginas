import Link from "next/link";
import { connection } from "next/server";
import { BookGrid } from "@/components/BookGrid";
import { getMySimilarVotes, getPickableBooks, getSimilarBooks } from "@/lib/data/recommend";
import { MIN_VOTES } from "@/lib/similarity";
import { getSession } from "@/lib/session";
import { SimilarVote } from "./SimilarVote";

/**
 * "Livros parecidos": weighted similarity, readers' votes included. Rendered per request (not in
 * the page's prerendered shell) so a new vote shows on the next page load; the inputs are cached.
 */
export async function SimilarBooks({ workId }: { workId: number }) {
  await connection();
  const similar = await getSimilarBooks(workId);
  return (
    <section>
      <h2 className="section-title">Livros parecidos</h2>
      {similar.length ? (
        <BookGrid
          books={similar.map((b) => ({
            ...b,
            note: b.votes ? `${b.votes} ${b.votes === 1 ? "leitor diz" : "leitores dizem"} que é parecido` : b.why,
          }))}
        />
      ) : (
        <p className="muted">Ainda não encontrámos livros parecidos com este no catálogo.</p>
      )}
    </section>
  );
}

/** Lets a signed-in reader say which other books are like this one. Render inside <Suspense>. */
export async function SimilarVotePanel({ workId, slug }: { workId: number; slug: string }) {
  const session = await getSession();
  if (!session)
    return (
      <p className="sub">
        Conheces um livro parecido com este?{" "}
        <Link href={`/entrar?voltar=${encodeURIComponent(`/livro/${slug}`)}`}>Entra</Link> para o sugerir.
      </p>
    );
  const [mine, books] = await Promise.all([getMySimilarVotes(session.user.id, workId), getPickableBooks()]);
  return (
    <SimilarVote
      workId={workId}
      books={books.filter((b) => b.id !== workId).map((b) => ({ id: b.id, label: `${b.title} · ${b.authors}` }))}
      mine={mine}
      minVotes={MIN_VOTES}
    />
  );
}
