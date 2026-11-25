import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="empty">
      <h1 className="section-title">Sem acesso</h1>
      <p>Esta página é só para administradores.</p>
      <Link href="/">Voltar ao início</Link>
    </div>
  );
}
