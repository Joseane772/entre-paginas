"use server";

import { and, count, eq, gt } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { importEvents } from "@/db/schema";
import { importWork } from "@/lib/import/importWork";
import { CATALOGUE_TAG } from "@/lib/data/catalogue";
import { getSession, isAdmin } from "@/lib/session";

const OL_WORK = /^OL\d+W$/;
const QID = /^Q\d+$/;

export type ImportState = { error?: string };

/** Imports per reader per hour (admins aren't limited). Each one makes ~10 external API calls. */
const IMPORTS_PER_HOUR = Number(process.env.IMPORTS_PER_HOUR ?? 10);

/** Import a book on demand (from search results or a series stub page). Signed-in readers only. */
export async function importBook(_prev: ImportState, form: FormData): Promise<ImportState> {
  const session = await getSession();
  if (!session) return { error: "Entra na tua conta para importar livros." };

  const ol = String(form.get("ol") ?? "");
  const qid = String(form.get("qid") ?? "");
  if (!OL_WORK.test(ol) && !QID.test(qid)) return { error: "Pedido inválido." };

  if (!isAdmin(session)) {
    const [{ n }] = await db
      .select({ n: count() })
      .from(importEvents)
      .where(and(eq(importEvents.userId, session.user.id), gt(importEvents.createdAt, new Date(Date.now() - 3600_000))));
    if (n >= IMPORTS_PER_HOUR)
      return { error: `Já importaste ${IMPORTS_PER_HOUR} livros na última hora. Tenta mais tarde.` };
  }

  let slug: string;
  try {
    let workId: number;
    ({ slug, workId } = await importWork(QID.test(qid) ? { qid } : { olWorkId: ol }));
    await db.insert(importEvents).values({ userId: session.user.id, workId });
  } catch (e) {
    console.error("import failed", e);
    return { error: "Não foi possível importar este livro agora. Tenta novamente daqui a pouco." };
  }
  updateTag(CATALOGUE_TAG);
  redirect(`/livro/${slug}`);
}
