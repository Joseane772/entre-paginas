"use server";

import { and, eq, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db } from "@/db";
import { readingStatus, reviews } from "@/db/schema";
import { reviewsTag, type ReadingStateValue } from "@/lib/data/reading";
import { SIMILARITY_TAG } from "@/lib/data/recommend";
import { getSession } from "@/lib/session";

export type ActionResult = { ok?: boolean; error?: string };

const STATES: ReadingStateValue[] = ["quero_ler", "a_ler", "lido"];
const today = () => new Date().toISOString().slice(0, 10);

async function currentUserId() {
  const s = await getSession();
  return s?.user.id ?? null;
}

/** Set (or clear, with null) the reader's status for a book. Dates fill in as it moves along. */
export async function setReadingState(workId: number, state: ReadingStateValue | null): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { error: "Entra na tua conta para guardar." };
  if (!Number.isInteger(workId) || (state !== null && !STATES.includes(state))) return { error: "Pedido inválido." };

  const where = and(eq(readingStatus.userId, userId), eq(readingStatus.workId, workId));
  if (state === null) {
    await db.delete(readingStatus).where(where);
    return { ok: true };
  }
  const dates = {
    startedOn: state === "quero_ler" ? null : sql`coalesce(${readingStatus.startedOn}, ${today()}::date)`,
    finishedOn: state === "lido" ? sql`coalesce(${readingStatus.finishedOn}, ${today()}::date)` : null,
  };
  await db
    .insert(readingStatus)
    .values({
      userId,
      workId,
      state,
      startedOn: state === "quero_ler" ? null : today(),
      finishedOn: state === "lido" ? today() : null,
    })
    .onConflictDoUpdate({
      target: [readingStatus.userId, readingStatus.workId],
      set: { state, ...dates, updatedAt: new Date() },
    });
  return { ok: true };
}

/** Rate 1–5, optionally with a written review. Rating a book also marks it as read. */
export async function saveReview(workId: number, form: FormData): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { error: "Entra na tua conta para dares a tua opinião." };
  const rating = Number(form.get("rating"));
  const body = String(form.get("body") ?? "").trim().slice(0, 5000) || null;
  const spoilers = form.get("spoilers") === "on";
  if (!Number.isInteger(workId) || !Number.isInteger(rating) || rating < 1 || rating > 5)
    return { error: "Escolhe de 1 a 5 estrelas." };

  await db
    .insert(reviews)
    .values({ userId, workId, rating, body, spoilers })
    .onConflictDoUpdate({
      target: [reviews.userId, reviews.workId],
      set: { rating, body, spoilers, updatedAt: new Date() },
    });
  await setReadingState(workId, "lido");
  updateTag(reviewsTag(workId));
  updateTag(SIMILARITY_TAG); // ratings feed "quem gostou de X também gostou de Y"
  return { ok: true };
}

export async function deleteReview(workId: number): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { error: "Entra na tua conta." };
  await db.delete(reviews).where(and(eq(reviews.userId, userId), eq(reviews.workId, workId)));
  updateTag(reviewsTag(workId));
  updateTag(SIMILARITY_TAG); // ratings feed "quem gostou de X também gostou de Y"
  return { ok: true };
}
