"use server";

import { eq } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
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
const CREATE_ERRORS: Record<string, string> = {
  USER_ALREADY_EXISTS: "Já existe uma conta com este email.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Já existe uma conta com este email.",
  INVALID_EMAIL: "Este email não parece válido.",
  PASSWORD_TOO_SHORT: "A palavra-passe tem de ter pelo menos 8 caracteres.",
};

/** Add a reader by hand (name, email, first password). They can change the password in /conta. */
export async function createReader(_prev: AdminResult, f: FormData): Promise<AdminResult> {
  const s = await admin();
  if (!s) return { error: "Só administradores." };
  const name = field(f, "name");
  const email = field(f, "email")?.toLowerCase();
  const password = String(f.get("password") ?? "");
  const role = f.get("role") === "admin" ? "admin" : "user";
  if (!name || !email) return { error: "Preenche o nome e o email." };
  if (password.length < 8) return { error: CREATE_ERRORS.PASSWORD_TOO_SHORT };
  try {
    await auth.api.createUser({ body: { name, email, password, role }, headers: await headers() });
  } catch (e) {
    const code = (e as { body?: { code?: string } }).body?.code;
    return { error: (code && CREATE_ERRORS[code]) || (e instanceof Error ? e.message : "Falhou.") };
  }
  refresh();
  return { ok: `Conta criada para ${email}. Dá-lhe a palavra-passe; pode mudá-la em «A minha conta».` };
}

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
  refresh();
  return { ok: "Feito." };
}
