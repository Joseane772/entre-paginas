import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";

export default function BookNotFound() {
  return (
    <div className="empty">
      <h1 className="section-title">Não encontrámos este livro</h1>
      <p>Pode ainda não estar no catálogo. Pesquisa-o para o importar do Open Library.</p>
      <div style={{ maxWidth: 560, margin: "20px auto" }}>
        <SearchBox />
      </div>
      <Link href="/">Voltar ao início</Link>
    </div>
  );
}
