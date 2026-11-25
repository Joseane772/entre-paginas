import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BookGrid } from "@/components/BookGrid";
import { BookRow } from "@/components/BookRow";
import { GenreIcon } from "@/components/GenreIcon";
import { SearchBox } from "@/components/SearchBox";
import { getShelf } from "@/lib/data/catalogue";
import { recommendFor } from "@/lib/data/recommend";
import { getSession } from "@/lib/session";
import { GENRES, genreSlug, type Genre } from "@/lib/taste";
import logo from "../../public/logo.png";

const COLLECTIONS: [Genre, string][] = [
  ["classicos", "Os livros que atravessaram gerações e continuam a ser lidos."],
  ["ficcao_cientifica", "Viagens no tempo, no espaço e em futuros possíveis."],
  ["fantasia", "Magia, dragões e mundos inteiros por descobrir."],
];

export default function Home() {
  return (
    <>
      <section className="hero-card">
        <div>
          <Suspense fallback={<h1>Que livro se segue?</h1>}>
            <Greeting />
          </Suspense>
          <p>
            Cada livro ligado a tudo o que o rodeia: por onde começar a saga, que filmes e séries existem, em que
            edições há em português de Portugal e onde o encontrar.
          </p>
          <SearchBox />
        </div>
        <Image src={logo} alt="Entre Páginas — livros, surpresas, descobertas" priority className="hero-logo" />
      </section>

      <nav className="genre-row" aria-label="Géneros">
        <Link href="/livros">
          <GenreIcon genre="todos" />
          <span>Todos</span>
        </Link>
        {(Object.keys(GENRES) as Genre[]).map((g) => (
          <Link key={g} href={`/genero/${genreSlug(g)}`}>
            <GenreIcon genre={g} />
            <span>{GENRES[g]}</span>
          </Link>
        ))}
      </nav>

      <Suspense fallback={null}>
        <ForYou />
      </Suspense>

      <Suspense fallback={<div className="skeleton" style={{ height: 300, marginTop: 30 }} />}>
        <Shelf />
      </Suspense>

      <section className="promo">
        <Link href="/bookbox" className="promo-banner">
          <div>
            <h2>BookBox</h2>
            <p>Um livro surpresa por mês, escolhido a partir do teu perfil de leitura. Nunca um que já leste.</p>
            <span className="pill-link pill-light">Saber mais</span>
          </div>
          <BookStack />
        </Link>
        <ul className="collections">
          {COLLECTIONS.map(([g, blurb]) => (
            <li key={g}>
              <Link href={`/genero/${genreSlug(g)}`}>
                <GenreIcon genre={g} size={44} />
                <span>
                  <b>{GENRES[g]}</b>
                  <small>{blurb}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

async function Greeting() {
  const session = await getSession();
  const first = session?.user.name.trim().split(/\s+/)[0];
  return <h1>{first ? `Olá, ${first}!` : "Que livro se segue?"}</h1>;
}

async function Shelf() {
  const shelf = await getShelf();
  return shelf.length ? (
    <BookRow title="Na estante" href="/livros">
      <BookGrid books={shelf} layout="row" />
    </BookRow>
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
      <Link className="btn btn-solid" href={href}>
        Responder ao questionário
      </Link>
    </div>
  );
  if (!session) return invite("/entrar?voltar=/questionario");
  const { profile, items } = await recommendFor(session.user.id, 12);
  return (
    <>
      {!profile && invite("/questionario")}
      {items.length > 0 && (
        <BookRow title="Para ti" href="/recomendacoes">
          <BookGrid books={items.map((r) => ({ ...r, note: r.reasons[0] }))} layout="row" />
        </BookRow>
      )}
    </>
  );
}

/** Stacked books for the BookBox banner (drawn here, in the site's colours). */
function BookStack() {
  const books: [number, number, string][] = [
    [8, 0, "#c0604c"],
    [30, 10, "#f7f3ea"],
    [52, 4, "#6f5a96"],
    [74, 14, "#2f8f7f"],
    [96, 2, "#3d6b8f"],
  ];
  return (
    <svg className="promo-art" viewBox="0 0 170 130" aria-hidden="true" focusable="false">
      {books.map(([y, x, c], i) => (
        <g key={y} transform={`translate(${x} ${y})`}>
          <rect width="150" height="20" rx="6" fill={i === 1 ? "#1f4f4a" : c} />
          <rect x="112" y="4" width="36" height="12" rx="4" fill="#f7f3ea" />
          <rect x="18" y="7" width="54" height="6" rx="3" fill="#fff" opacity=".35" />
        </g>
      ))}
      <path d="M126 104h12v24l-6-5-6 5z" fill="var(--ribbon)" />
      <path d="M40 16h10v22l-5-4-5 4z" fill="var(--ribbon)" />
    </svg>
  );
}
