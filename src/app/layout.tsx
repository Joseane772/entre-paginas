import type { Metadata } from "next";
import Link from "next/link";
import { Figtree, Young_Serif } from "next/font/google";
import "./globals.css";

const sans = Figtree({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
const serif = Young_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: { default: "Entre Páginas", template: "%s · Entre Páginas" },
  description:
    "Cada livro ligado a tudo o que o rodeia: a ordem de leitura da saga, as adaptações, as edições em português e onde o encontrar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-PT" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <header className="site-header">
          <div className="wrap site-header-inner">
            <Link href="/" className="wordmark">
              Entre Páginas
            </Link>
            <nav aria-label="Principal">
              <Link href="/pesquisa">Pesquisar</Link>
              <Link href="/bookbox">BookBox</Link>
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <p>
              Dados de livros e edições:{" "}
              <a href="https://openlibrary.org" rel="noopener">Open Library</a>. Sagas e adaptações:{" "}
              <a href="https://www.wikidata.org" rel="noopener">Wikidata</a>. Sinopses: Wikipédia (CC BY-SA)
              ou Open Library, indicado em cada livro.
            </p>
            <p>
              Este produto usa a API do TMDB mas não é apoiado nem certificado pelo{" "}
              <a href="https://www.themoviedb.org" rel="noopener">TMDB</a>.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
