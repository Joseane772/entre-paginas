import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookGrid } from "@/components/BookGrid";
import { GenreIcon } from "@/components/GenreIcon";
import { getBooksByGenre } from "@/lib/data/recommend";
import { GENRES, genreFromSlug, genreSlug, type Genre } from "@/lib/taste";

export function generateStaticParams() {
  return (Object.keys(GENRES) as Genre[]).map((g) => ({ slug: genreSlug(g) }));
}

export async function generateMetadata(props: PageProps<"/genero/[slug]">): Promise<Metadata> {
  const genre = genreFromSlug((await props.params).slug);
  return { title: genre ? GENRES[genre] : "Género" };
}

export default function GenrePage(props: PageProps<"/genero/[slug]">) {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: 320 }} />}>
      <Genre params={props.params} />
    </Suspense>
  );
}

async function Genre({ params }: Pick<PageProps<"/genero/[slug]">, "params">) {
  const genre = genreFromSlug((await params).slug);
  if (!genre) notFound();
  const books = await getBooksByGenre(genre);
  return (
    <>
      <header className="page-head genre-head">
        <GenreIcon genre={genre} size={56} />
        <div>
          <h1>{GENRES[genre]}</h1>
          <p className="sub">
            {books.length} {books.length === 1 ? "livro" : "livros"} no catálogo. Os primeiros livros de cada saga
            aparecem primeiro.
          </p>
        </div>
      </header>
      {books.length ? (
        <BookGrid books={books} />
      ) : (
        <p className="empty">Ainda não temos livros deste género. Pesquisa um e importa-o.</p>
      )}
    </>
  );
}
