import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BookGrid } from "@/components/BookGrid";
import { stars } from "@/components/reading/ReaderPanels";
import { getShelves, type ReadingStateValue } from "@/lib/data/reading";
import { requireUserPage } from "@/lib/session";

export const metadata: Metadata = { title: "A minha estante", robots: { index: false } };

const ORDER: [ReadingStateValue, string][] = [
  ["a_ler", "A ler"],
  ["quero_ler", "Quero ler"],
  ["lido", "Lidos"],
];

export default function ShelfPage() {
  return (
    <>
      <header className="page-head">
        <h1>A minha estante</h1>
        <p className="sub">O que estás a ler, o que queres ler e o que já leste.</p>
      </header>
      <Suspense fallback={<div className="panel skeleton" style={{ height: 260 }} />}>
        <Shelves />
      </Suspense>
    </>
  );
}

async function Shelves() {
  const { user } = await requireUserPage("/estante");
  const rows = await getShelves(user.id);
  if (!rows.length)
    return (
      <div className="empty">
        <p>A tua estante está vazia. Abre um livro e marca-o como “Quero ler”, “A ler” ou “Li”.</p>
        <Link className="btn btn-solid" href="/pesquisa">
          Procurar livros
        </Link>
      </div>
    );
  return ORDER.map(([state, label]) => {
    const list = rows.filter((r) => r.state === state);
    if (!list.length) return null;
    return (
      <section key={state}>
        <h2 className="section-title">
          {label} <small className="muted">({list.length})</small>
        </h2>
        <BookGrid
          books={list.map((r) => ({
            slug: r.slug,
            title: r.title,
            year: r.year,
            coverUrl: r.coverUrl,
            authors:
              r.authors +
              (r.rating ? ` · ${stars(r.rating)}` : "") +
              (r.finishedOn && state === "lido" ? ` · ${new Date(r.finishedOn).getFullYear()}` : ""),
          }))}
        />
      </section>
    );
  });
}
