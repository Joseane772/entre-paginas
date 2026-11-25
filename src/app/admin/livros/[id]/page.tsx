import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { workOverrides, works } from "@/db/schema";
import { WORKS } from "@/data/curation";
import { reimport, saveOverride } from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { requireAdminPage } from "@/lib/session";

export const metadata: Metadata = { title: "Corrigir livro", robots: { index: false } };

export default function EditBook(props: PageProps<"/admin/livros/[id]">) {
  return (
    <Suspense fallback={<div className="panel skeleton" style={{ height: 400 }} />}>
      <Editor params={props.params} />
    </Suspense>
  );
}

async function Editor({ params }: Pick<PageProps<"/admin/livros/[id]">, "params">) {
  const { id } = await params;
  await requireAdminPage(`/admin/livros/${id}`);
  const workId = Number(id);
  if (!Number.isInteger(workId)) notFound();
  const [work] = await db.select().from(works).where(eq(works.id, workId));
  if (!work) notFound();
  const [o] = await db.select().from(workOverrides).where(eq(workOverrides.workId, workId));
  const file = work.wikidataId ? WORKS[work.wikidataId] : undefined;

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <section className="panel">
        <h2>
          <Link href={`/livro/${work.slug}`}>{work.title}</Link>
        </h2>
        <p className="sub">
          {work.wikidataId && (
            <a href={`https://www.wikidata.org/wiki/${work.wikidataId}`} rel="noopener">
              {work.wikidataId}
            </a>
          )}
          {work.openLibraryWorkId && (
            <>
              {" · "}
              <a href={`https://openlibrary.org/works/${work.openLibraryWorkId}`} rel="noopener">
                {work.openLibraryWorkId}
              </a>
            </>
          )}
          {file && " · tem correções no ficheiro de curadoria"}
        </p>
        <p className="sub">
          Deixa em branco para usar o que vem das fontes. Confirma os títulos portugueses numa livraria
          portuguesa (Wook, Bertrand) ou na editora: o rótulo “pt” da Wikidata é muitas vezes o título
          brasileiro.
        </p>
        <ActionForm action={saveOverride.bind(null, workId)} submit="Guardar correção" className="form">
          <label className="field">
            Título em Portugal
            <input name="title" defaultValue={o?.title ?? ""} placeholder={work.title} maxLength={300} />
          </label>
          <label className="field">
            Título original
            <input
              name="originalTitle"
              defaultValue={o?.originalTitle ?? ""}
              placeholder={work.originalTitle ?? ""}
              maxLength={300}
            />
          </label>
          <label className="field">
            Sinopse
            <textarea
              name="synopsis"
              defaultValue={o?.synopsis ?? ""}
              placeholder={work.synopsis?.slice(0, 300) ?? ""}
              maxLength={5000}
            />
          </label>
          <label className="field">
            Nota (aparece na página do livro)
            <input name="note" defaultValue={o?.note ?? ""} placeholder={work.editorNote ?? ""} maxLength={500} />
          </label>
          <label className="check">
            <input type="checkbox" name="hideFromSeries" defaultChecked={o?.hideFromSeries} /> Não é um livro da saga
            (apêndice, conto, tradução): tirar da ordem de leitura
          </label>
        </ActionForm>
      </section>

      <section className="panel">
        <h2>Reimportar</h2>
        <p className="sub">
          Volta a buscar edições, adaptações e a saga às fontes, e aplica as correções. Demora 5 a 30 segundos.
        </p>
        <ActionForm action={reimport.bind(null, workId)} submit="Reimportar" className="" />
      </section>
    </div>
  );
}
