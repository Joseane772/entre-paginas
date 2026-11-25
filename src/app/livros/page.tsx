import type { Metadata } from "next";
import { Suspense } from "react";
import { BookGrid } from "@/components/BookGrid";
import { GenreIcon } from "@/components/GenreIcon";
import { getBooksByGenre } from "@/lib/data/recommend";

export const metadata: Metadata = { title: "Todos os livros" };

export default function AllBooksPage() {
  return (
    <>
      <header className="page-head genre-head">
        <GenreIcon genre="todos" size={56} />
        <div>
          <h1>Todos os livros</h1>
          <p className="sub">Tudo o que já está no catálogo. Não encontras um livro? Pesquisa-o e importa-o.</p>
        </div>
      </header>
      <Suspense fallback={<div className="skeleton" style={{ height: 320 }} />}>
        <All />
      </Suspense>
    </>
  );
}

async function All() {
  return <BookGrid books={await getBooksByGenre()} />;
}
