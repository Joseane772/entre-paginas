"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { importWork } from "@/lib/import/importWork";
import { CATALOGUE_TAG } from "@/lib/data/catalogue";

const OL_WORK = /^OL\d+W$/;
const QID = /^Q\d+$/;

export type ImportState = { error?: string };

/**
 * Import a book on demand (from search results or a series stub page).
 * TODO before public launch: require sign-in and rate-limit, since each call hits external APIs.
 */
export async function importBook(_prev: ImportState, form: FormData): Promise<ImportState> {
  const ol = String(form.get("ol") ?? "");
  const qid = String(form.get("qid") ?? "");
  if (!OL_WORK.test(ol) && !QID.test(qid)) return { error: "Pedido inválido." };

  let slug: string;
  try {
    ({ slug } = await importWork(QID.test(qid) ? { qid } : { olWorkId: ol }));
  } catch (e) {
    console.error("import failed", e);
    return { error: "Não foi possível importar este livro agora. Tenta novamente daqui a pouco." };
  }
  updateTag(CATALOGUE_TAG);
  redirect(`/livro/${slug}`);
}
