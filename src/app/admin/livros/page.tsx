import type { Metadata } from "next";
import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/db";
import { workOverrides, works } from "@/db/schema";
import { requireAdminPage } from "@/lib/session";

export const metadata: Metadata = { title: "Livros", robots: { index: false } };

export default function AdminBooks(props: PageProps<"/admin/livros">) {
  return (
    <Suspense fallback={<div className="panel skeleton" style={{ height: 300 }} />}>
      <Books searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Books({ searchParams }: Pick<PageProps<"/admin/livros">, "searchParams">) {
  await requireAdminPage("/admin/livros");
  const q = String((await searchParams).q ?? "").trim();
  const like = `%${q.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
  const rows = await db
    .select({
      id: works.id,
      slug: works.slug,
      title: works.title,
      originalTitle: works.originalTitle,
      status: works.status,
      year: works.firstPublishedYear,
      corrected: sql<boolean>`${workOverrides.workId} IS NOT NULL`,
    })
    .from(works)
    .leftJoin(workOverrides, eq(workOverrides.workId, works.id))
    .where(
      q
        ? sql`f_unaccent(${works.title}) ILIKE f_unaccent(${like}) OR f_unaccent(coalesce(${works.originalTitle}, '')) ILIKE f_unaccent(${like})`
        : undefined,
    )
    .orderBy(desc(works.updatedAt))
    .limit(100);

  return (
    <section className="panel">
      <h2>Livros</h2>
      <p className="sub">
        Corrige títulos, sinopses e notas. As correções feitas aqui sobrepõem-se às de{" "}
        <code>src/data/curation.ts</code> e sobrevivem a novas importações.
      </p>
      <form className="search" style={{ margin: "12px 0" }}>
        <input name="q" defaultValue={q} placeholder="Título ou título original" aria-label="Procurar livro" />
        <button className="btn" type="submit">Procurar</button>
      </form>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Original</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id}>
                <td>
                  <Link href={`/livro/${w.slug}`}>{w.title}</Link>
                  {w.year ? <small className="muted"> {w.year}</small> : null}
                  {w.corrected && <span className="pill" style={{ marginLeft: 6 }}>corrigido</span>}
                </td>
                <td>{w.originalTitle}</td>
                <td>{w.status === "full" ? "completo" : w.status === "stub" ? "só saga" : w.status}</td>
                <td>
                  <Link className="btn" href={`/admin/livros/${w.id}`}>Corrigir</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
