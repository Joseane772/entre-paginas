"use server";

import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { seriesWorks, workOverrides, works } from "@/db/schema";
import { WORKS } from "@/data/curation";
import { auth } from "@/lib/auth";
import { CATALOGUE_TAG } from "@/lib/data/catalogue";
import { importWork, reslug } from "@/lib/import/importWork";
import { getSession, isAdmin } from "@/lib/session";

export type AdminResult = { ok?: string; error?: string };

async function admin() {
  const s = await getSession();
  return isAdmin(s) ? s! : null;
}

const field = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v || null;
};

/** Save an admin's correction for a book and apply it straight away. */
export async function saveOverride(workId: number, _prev: AdminResult, f: FormData): Promise<AdminResult> {
  const s = await admin();
  if (!s) return { error: "Só administradores." };
  const [work] = await db.select().from(works).where(eq(works.id, workId));
  if (!work) return { error: "Livro não encontrado." };

  const values = {
    title: field(f, "title"),
    originalTitle: field(f, "originalTitle"),
    synopsis: field(f, "synopsis"),
    note: field(f, "note"),
    hideFromSeries: f.get("hideFromSeries") === "on",
    updatedBy: s.user.id,
  };
  const file = work.wikidataId ? (WORKS[work.wikidataId] ?? {}) : {};

  const slug = await db.transaction(async (tx) => {
    await tx
      .insert(workOverrides)
      .values({ workId, ...values })
      .onConflictDoUpdate({ target: workOverrides.workId, set: { ...values, updatedAt: new Date() } });
    // Apply now. Cleared fields keep the current value until the next import recomputes them.
    const title = values.title ?? file.title ?? work.title;
    await tx
      .update(works)
      .set({
        title,
        ...(values.originalTitle ? { originalTitle: values.originalTitle } : {}),
        ...(values.synopsis
          ? { synopsis: values.synopsis, synopsisLanguage: "pt", synopsisSourceUrl: null }
          : {}),
        editorNote: values.note ?? file.note ?? null,
      })
      .where(eq(works.id, workId));
    if (values.hideFromSeries) await tx.delete(seriesWorks).where(eq(seriesWorks.workId, workId));
    return reslug(tx, workId, title, work.firstPublishedYear);
  });

  updateTag(CATALOGUE_TAG);
  return { ok: slug && slug !== work.slug ? `Guardado. Novo endereço: /livro/${slug}` : "Guardado." };
}

/** Re-run the import for a book (refreshes editions/adaptations, re-applies corrections). */
export async function reimport(workId: number): Promise<AdminResult> {
  if (!(await admin())) return { error: "Só administradores." };
  const [work] = await db
    .select({ qid: works.wikidataId, ol: works.openLibraryWorkId })
    .from(works)
    .where(eq(works.id, workId));
  if (!work?.qid && !work?.ol) return { error: "Este livro não tem identificadores para reimportar." };
  try {
    await importWork(work.qid ? { qid: work.qid } : { olWorkId: work.ol! });
  } catch (e) {
    console.error("reimport failed", e);
    return { error: "A importação falhou. Tenta novamente daqui a pouco." };
  }
  updateTag(CATALOGUE_TAG);
  return { ok: "Reimportado." };
}

/** Promote/demote and suspend/restore accounts (Better Auth admin plugin). */
export async function manageUser(_prev: AdminResult, f: FormData): Promise<AdminResult> {
  const s = await admin();
  if (!s) return { error: "Só administradores." };
  const userId = String(f.get("userId"));
  const op = String(f.get("op"));
  if (userId === s.user.id) return { error: "Não podes alterar a tua própria conta aqui." };
  const h = await headers();
  try {
    if (op === "make-admin") await auth.api.setRole({ body: { userId, role: "admin" }, headers: h });
    else if (op === "make-user") await auth.api.setRole({ body: { userId, role: "user" }, headers: h });
    else if (op === "ban")
      await auth.api.banUser({ body: { userId, banReason: field(f, "reason") ?? undefined }, headers: h });
    else if (op === "unban") await auth.api.unbanUser({ body: { userId }, headers: h });
    else return { error: "Operação desconhecida." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falhou." };
  }
  return { ok: "Feito." };
}
