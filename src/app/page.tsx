import Image from "next/image";
import { Suspense } from "react";
import { BookGrid } from "@/components/BookGrid";
import { SearchBox } from "@/components/SearchBox";
import { getShelf } from "@/lib/data/catalogue";
import logo from "../../public/logo.png";

export default function Home() {
  return (
    <>
      <section className="home-hero">
        <Image src={logo} alt="Entre Páginas — livros, surpresas, descobertas" priority />
        <p>
          Cada livro ligado a tudo o que o rodeia: por onde começar a saga, que filmes e séries existem,
          em que edições há em português de Portugal e onde o encontrar.
        </p>
        <SearchBox />
      </section>

      <h2 className="section-title">Na estante</h2>
      <Suspense fallback={<div className="skeleton" style={{ height: 260 }} />}>
        <Shelf />
      </Suspense>
    </>
  );
}

async function Shelf() {
  const shelf = await getShelf();
  return shelf.length ? (
    <BookGrid books={shelf} />
  ) : (
    <p className="empty">
      Ainda não há livros no catálogo. Corre <code>npm run seed</code> ou pesquisa um livro para o importar.
    </p>
  );
}
