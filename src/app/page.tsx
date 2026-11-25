import Image from "next/image";
import { BookGrid } from "@/components/BookGrid";
import { SearchBox } from "@/components/SearchBox";
import { getShelf } from "@/lib/data/catalogue";
import logo from "../../public/logo.png";

export default async function Home() {
  const shelf = await getShelf();
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
      {shelf.length ? (
        <BookGrid books={shelf} />
      ) : (
        <p className="empty">
          Ainda não há livros no catálogo. Corre <code>npm run seed</code> ou pesquisa um livro para o
          importar.
        </p>
      )}
    </>
  );
}
