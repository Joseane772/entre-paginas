/* eslint-disable @next/next/no-img-element -- TMDB posters */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { BookGrid } from "@/components/BookGrid";
import { Cover } from "@/components/Cover";
import { AdminEditLink } from "@/components/admin/AdminEditLink";
import { ImportGate } from "@/components/ImportGate";
import { MyReading, Reviews } from "@/components/reading/ReaderPanels";
import { getBook, getMoreByAuthors, getRedirect, getSlugsForPrerender, type BookPage, type BookSeries } from "@/lib/data/catalogue";
import { editionLanguageLabel, KIND_LABEL } from "@/lib/labels";
import { LIBRARY, SHOPS } from "@/lib/shops";
import { toIso3 } from "@/lib/text";

type Book = NonNullable<BookPage>;

export async function generateStaticParams() {
  const slugs = await getSlugsForPrerender();
  // Cache Components needs at least one param; unknown slugs are rendered on first visit.
  return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: "__vazio__" }];
}

export async function generateMetadata(props: PageProps<"/livro/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const book = await getBook(slug);
  if (!book) return { title: "Livro não encontrado" };
  const by = book.authors.map((a) => a.name).join(", ");
  return {
    title: by ? `${book.work.title}, de ${by}` : book.work.title,
    description: book.work.synopsis?.slice(0, 200) ?? undefined,
  };
}

export default function BookRoute(props: PageProps<"/livro/[slug]">) {
  return (
    <Suspense fallback={<BookSkeleton />}>
      <Book params={props.params} />
    </Suspense>
  );
}

async function Book({ params }: Pick<PageProps<"/livro/[slug]">, "params">) {
  const { slug } = await params;
  const book = await getBook(slug);
  if (!book) {
    const moved = await getRedirect(slug);
    if (moved) permanentRedirect(`/livro/${moved}`);
    notFound();
  }
  const { work } = book;
  const byline = book.authors.map((a) => a.name).join(", ");

  return (
    <article>
      <header className="hero">
        <Cover title={work.title} author={byline} url={work.coverUrl} size="lg" />
        <div>
          <h1>{work.title}</h1>
          <p className="by">
            {byline || "Autor desconhecido"}
            {work.firstPublishedYear ? `, ${work.firstPublishedYear}` : ""}
            {work.originalTitle && work.originalTitle !== work.title && (
              <> · título original: {work.originalTitle}</>
            )}
          </p>
          {work.synopsis ? (
            <>
              <p className="synopsis">{work.synopsis}</p>
              <p className="source">
                {work.synopsisLanguage === "pt" ? "Fonte: " : "Sinopse em inglês, ainda sem tradução. Fonte: "}
                {work.synopsisSourceUrl ? (
                  <a href={work.synopsisSourceUrl} rel="noopener">
                    {work.synopsisSourceUrl.includes("wikipedia") ? "Wikipédia" : "Open Library"}
                  </a>
                ) : (
                  "Open Library"
                )}
              </p>
            </>
          ) : (
            work.status !== "stub" && <p className="muted">Ainda não temos sinopse para este livro.</p>
          )}
          {work.editorNote && <p className="note">{work.editorNote}</p>}
          <Suspense>
            <AdminEditLink workId={work.id} />
          </Suspense>
        </div>
      </header>

      {work.status === "stub" && (
        <div className="notice">
          <p>Por agora só sabemos o básico sobre este livro: o lugar na saga e o ano.</p>
          <Suspense>
            <ImportGate
              returnTo={`/livro/${work.slug}`}
              qid={work.wikidataId ?? undefined}
              ol={work.wikidataId ? undefined : (work.openLibraryWorkId ?? undefined)}
              label="Carregar edições e adaptações"
              pendingLabel="A carregar…"
            />
          </Suspense>
        </div>
      )}

      <div className="grid">
        {book.series.map((s) => (
          <ReadingOrder key={s.id} series={s} currentSlug={work.slug} />
        ))}
        <Suspense fallback={<div className="panel skeleton" style={{ height: 220 }} />}>
          <MyReading workId={work.id} slug={work.slug} />
        </Suspense>
        <Suspense fallback={<div className="panel skeleton" style={{ height: 220 }} />}>
          <Reviews workId={work.id} />
        </Suspense>
        {work.status !== "stub" && (
          <>
            <Adaptations book={book} />
            <WhereToFind book={book} />
            <Languages book={book} />
            <PortugueseEditions book={book} />
            <section className="panel full">
              <h2>Conversas</h2>
              <p className="sub">
                Em breve: discussão por livro, com spoilers escondidos até ao capítulo em que vais.
              </p>
            </section>
          </>
        )}
      </div>

      <MoreByAuthors slug={work.slug} names={byline} />
    </article>
  );
}

function ReadingOrder({ series, currentSlug }: { series: BookSeries; currentSlug: string }) {
  // "Start here" goes on the first numbered book (unnumbered extras like prequels sort last).
  const firstIdx = Math.max(0, series.members.findIndex((m) => m.ordinal));
  return (
    <section className="panel">
      <h2>Ordem de leitura</h2>
      <p className="sub">{series.name}. Pela ordem da saga; sem número, pela data de publicação.</p>
      <ol className="saga">
        {series.members.map((m, i) => (
          <li key={m.slug} aria-current={m.slug === currentSlug ? "page" : undefined}>
            <span className="num">{m.ordinal ?? "·"}</span>
            <span className="saga-title">
              {m.slug === currentSlug ? <b>{m.title}</b> : <Link href={`/livro/${m.slug}`}>{m.title}</Link>}
              {i === firstIdx && <span className="pill pill-solid">começa aqui</span>}
            </span>
            {m.year && <span className="yr">{m.year}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Adaptations({ book }: { book: Book }) {
  const list = book.adaptations;
  return (
    <section className="panel">
      <h2>Adaptações</h2>
      <p className="sub">Filmes, séries, BD e jogos baseados neste livro ou na saga.</p>
      {!list.length && <p className="muted">Não conhecemos adaptações deste livro.</p>}
      <ul className="rows">
        {list.map((a) => {
          const href = a.tmdbId
            ? `https://www.themoviedb.org/${a.tmdbType}/${a.tmdbId}`
            : a.wikidataId
              ? `https://www.wikidata.org/wiki/${a.wikidataId}`
              : undefined;
          return (
            <li key={a.id} className="adaptation">
              {a.posterUrl ? (
                <img className="poster" src={a.posterUrl} alt="" loading="lazy" />
              ) : (
                <span className="poster poster-blank">{KIND_LABEL[a.kind]}</span>
              )}
              <div>
                <div className="adaptation-head">
                  <b>{href ? <a href={href} rel="noopener">{a.title}</a> : a.title}</b>
                  <span className="pill">{KIND_LABEL[a.kind]}</span>
                  {a.viaSeries && <span className="pill pill-dashed">da saga</span>}
                </div>
                <small>
                  {[a.year, a.credits].filter(Boolean).join(" · ")}
                  {a.originalTitle && a.originalTitle !== a.title ? ` · ${a.originalTitle}` : ""}
                </small>
                {a.overview && <p>{a.overview.length > 220 ? a.overview.slice(0, 220).trimEnd() + "…" : a.overview}</p>}
                <p className="fidelity">Fiel ao livro? Ainda sem votos da comunidade.</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function WhereToFind({ book }: { book: Book }) {
  const q = book.shopQuery;
  const byIsbn = /^\d{13}$/.test(q);
  return (
    <section className="panel">
      <h2>Onde comprar ou ler</h2>
      <p className="sub">
        {byIsbn ? `Pesquisa pelo ISBN da edição portuguesa (${q}).` : "Pesquisa pelo título e autor."}
      </p>
      <ul className="rows">
        {SHOPS.map((s) => (
          <li key={s.name} className="shop">
            <div>
              {s.name}
              <small>{s.what}</small>
            </div>
            <a className="btn" href={s.url(q)} rel="noopener" target="_blank">
              {s.action}
            </a>
          </li>
        ))}
        <li className="shop">
          <div>
            Bibliotecas
            <small>{LIBRARY.what}</small>
          </div>
          <a className="btn" href={LIBRARY.url} rel="noopener" target="_blank">
            {LIBRARY.name}
          </a>
        </li>
      </ul>
    </section>
  );
}

function Languages({ book }: { book: Book }) {
  const original = book.work.originalLanguage ? toIso3(book.work.originalLanguage) : null;
  return (
    <section className="panel">
      <h2>Línguas disponíveis</h2>
      <p className="sub">
        Contámos {book.editionCount} edições. As de português estão separadas entre Portugal e Brasil pelo ISBN.
      </p>
      {book.languages.length ? (
        <div className="langs">
          {book.languages.map(([key, n]) => (
            <span key={key} className={key.startsWith("por") ? "pt" : undefined}>
              {editionLanguageLabel(key)}
              {key === original ? " (original)" : ""}
              <small>{n}</small>
            </span>
          ))}
        </div>
      ) : (
        <p className="muted">Ainda não temos edições registadas.</p>
      )}
    </section>
  );
}

function PortugueseEditions({ book }: { book: Book }) {
  const { PT, BR, other } = book.portugueseEditions;
  if (!PT.length && !BR.length && !other.length) {
    return (
      <section className="panel">
        <h2>Edições em português</h2>
        <p className="muted">
          Não encontrámos edições em português no Open Library. Pode existir uma tradução que ainda não
          está registada.
        </p>
      </section>
    );
  }
  const group = (label: string, list: typeof PT) =>
    list.length > 0 && (
      <div>
        <h3>{label}</h3>
        <ul>
          {list.slice(0, 6).map((e, i) => (
            <li key={(e.isbn13 ?? "") + i}>
              {e.title}
              <br />
              <small>{[e.publisher, e.publishYear, e.isbn13 && `ISBN ${e.isbn13}`].filter(Boolean).join(" · ")}</small>
            </li>
          ))}
          {list.length > 6 && <li className="muted">e mais {list.length - 6}</li>}
        </ul>
      </div>
    );
  return (
    <section className="panel">
      <h2>Edições em português</h2>
      <div className="editions">
        {group("Portugal", PT)}
        {group("Brasil", BR)}
        {group("Origem por confirmar", other)}
      </div>
    </section>
  );
}

async function MoreByAuthors({ slug, names }: { slug: string; names: string }) {
  const more = await getMoreByAuthors(slug);
  if (!more.length) return null;
  return (
    <>
      <h2 className="section-title">Mais de {names}</h2>
      <BookGrid books={more} />
    </>
  );
}

function BookSkeleton() {
  return (
    <div aria-busy="true" aria-label="A carregar livro">
      <div className="hero">
        <div className="cover cover-lg skeleton" />
        <div>
          <div className="skeleton" style={{ height: 44, width: "60%", marginBottom: 14 }} />
          <div className="skeleton" style={{ height: 18, width: "40%", marginBottom: 20 }} />
          <div className="skeleton" style={{ height: 90 }} />
        </div>
      </div>
      <div className="grid">
        <div className="panel skeleton" style={{ height: 220 }} />
        <div className="panel skeleton" style={{ height: 220 }} />
      </div>
    </div>
  );
}
