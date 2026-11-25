import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BookGrid } from "@/components/BookGrid";
import { SearchBox } from "@/components/SearchBox";
import { getShelf } from "@/lib/data/catalogue";
import { recommendFor } from "@/lib/data/recommend";
import { getSession } from "@/lib/session";
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

      <Suspense fallback={null}>
        <ForYou />
      </Suspense>

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

/** Recommendations for the signed-in reader, or an invitation to the questionnaire. */
async function ForYou() {
  const session = await getSession();
  const invite = (href: string) => (
    <div className="notice">
      <p>Conta-nos os teus gostos de leitura e recomendamos-te livros (e, em breve, a tua BookBox surpresa).</p>
      <Link className="btn" href={href}>
        Responder ao questionário
      </Link>
    </div>
  );
  if (!session) return invite("/entrar?voltar=/questionario");
  const { profile, items } = await recommendFor(session.user.id, 6);
  return (
    <>
      {!profile && invite("/questionario")}
      {items.length > 0 && (
        <>
          <h2 className="section-title">
            Para ti{" "}
            <Link href="/recomendacoes" style={{ fontSize: "0.95rem", fontFamily: "inherit" }}>
              ver todas
            </Link>
          </h2>
          <BookGrid books={items.map((r) => ({ ...r, note: r.reasons[0] }))} />
        </>
      )}
    </>
  );
}
