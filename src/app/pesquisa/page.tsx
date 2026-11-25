import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { BookGrid } from "@/components/BookGrid";
import { Cover } from "@/components/Cover";
import { ImportButton } from "@/components/ImportButton";
import { getSession } from "@/lib/session";
import { SearchBox } from "@/components/SearchBox";
import { searchCatalogue } from "@/lib/data/catalogue";
import { findImported } from "@/lib/import/importWork";
import { olCover, olId, searchWorks } from "@/lib/sources/openlibrary";

export const metadata: Metadata = { title: "Pesquisar" };

export default function SearchPage(props: PageProps<"/pesquisa">) {
  return (
    <>
      <h1 className="section-title" style={{ marginTop: 0 }}>
        Pesquisar
      </h1>
      <Suspense fallback={<SearchBox />}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/pesquisa">, "searchParams">) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 120) ?? "";
  if (!q) return <SearchBox autoFocus />;

  const local = await searchCatalogue(q);
  return (
    <>
      <SearchBox defaultValue={q} />
      <h2 className="section-title">No Entre Páginas</h2>
      {local.length ? (
        <BookGrid books={local} />
      ) : (
        <p className="sub">Ainda não temos nada para &ldquo;{q}&rdquo;. Vê se está no Open Library, abaixo.</p>
      )}

      <h2 className="section-title">Mais resultados no Open Library</h2>
      <p className="sub">Importar um livro traz as edições, a saga e as adaptações. Demora uns segundos.</p>
      <Suspense fallback={<div className="skeleton" style={{ height: 240 }} />}>
        <OpenLibraryResults q={q} />
      </Suspense>
    </>
  );
}

async function cachedOpenLibrarySearch(q: string) {
  "use cache";
  cacheLife("hours");
  return searchWorks(q, 12);
}

async function OpenLibraryResults({ q }: { q: string }) {
  let docs;
  try {
    docs = await cachedOpenLibrarySearch(q);
  } catch {
    return <p className="sub">O Open Library não respondeu. Tenta novamente daqui a pouco.</p>;
  }
  if (!docs.length) return <p className="sub">Sem resultados no Open Library.</p>;
  const [imported, session] = await Promise.all([findImported(docs.map((d) => olId(d.key))), getSession()]);

  return (
    <ul className="result-list panel">
      {docs.map((d) => {
        const id = olId(d.key);
        const slug = imported.get(id);
        return (
          <li key={id} className="result">
            <Cover title={d.title} url={d.cover_i ? olCover(d.cover_i, "S") : null} size="sm" />
            <div>
              <span className="result-title">{d.title}</span>
              <small>
                {d.author_name?.slice(0, 2).join(", ") ?? "Autor desconhecido"}
                {d.first_publish_year ? `, ${d.first_publish_year}` : ""}
                {d.edition_count ? ` · ${d.edition_count} edições` : ""}
                {d.language?.includes("por") ? " · há edições em português" : ""}
              </small>
            </div>
            {slug ? (
              <Link className="btn" href={`/livro/${slug}`}>
                Abrir
              </Link>
            ) : session ? (
              <ImportButton ol={id} />
            ) : (
              <Link className="btn" href={`/entrar?voltar=${encodeURIComponent(`/pesquisa?q=${encodeURIComponent(q)}`)}`}>
                Entrar para importar
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
