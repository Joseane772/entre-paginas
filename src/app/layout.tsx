import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Figtree, Fredoka } from "next/font/google";
import { Suspense } from "react";
import { UserNav } from "@/components/auth/UserNav";
import { NavLink } from "@/components/NavLink";
import logoIcon from "../../public/logo-icon.png";
import "./globals.css";

const sans = Figtree({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
const display = Fredoka({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600"] });

export const metadata: Metadata = {
  title: { default: "Entre Páginas", template: "%s · Entre Páginas" },
  description:
    "Cada livro ligado a tudo o que o rodeia: a ordem de leitura da saga, as adaptações, as edições em português e onde o encontrar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-PT" className={`${sans.variable} ${display.variable}`}>
      <body>
        <header className="site-header">
          <div className="wrap site-header-inner">
            <Link href="/" className="wordmark">
              Entre Páginas
            </Link>
            <nav aria-label="Principal" className="site-nav">
              <NavLink href="/" icon="home">
                Início
              </NavLink>
              <NavLink href="/pesquisa" icon="search">
                Pesquisar
              </NavLink>
              <NavLink href="/bookbox" icon="box">
                BookBox
              </NavLink>
              <Suspense
                fallback={
                  <NavLink href="/entrar" icon="user">
                    Entrar
                  </NavLink>
                }
              >
                <UserNav />
              </Suspense>
            </nav>
            <Link href="/" className="brand-badge" aria-label="Entre Páginas: página inicial">
              <Image src={logoIcon} alt="" width={44} height={44} priority />
            </Link>
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
            <p>
              Design inspirado em{" "}
              <a href="https://dribbble.com/shots/19444133-Book-Store-Concept" rel="noopener">
                «Book Store Concept»
              </a>
              , de Toma (Dribbble).
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
