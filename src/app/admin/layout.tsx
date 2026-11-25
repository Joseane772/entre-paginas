import Link from "next/link";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <nav className="page-head inline-actions" aria-label="Administração">
        <Link className="btn" href="/admin">Resumo</Link>
        <Link className="btn" href="/admin/livros">Livros</Link>
        <Link className="btn" href="/admin/utilizadores">Utilizadores</Link>
      </nav>
      {children}
    </>
  );
}
