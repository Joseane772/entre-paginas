"use server";

import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db } from "@/db";
import { similarityVotes, tasteProfiles, works } from "@/db/schema";
import { SIMILARITY_TAG } from "@/lib/data/recommend";
import { getSession } from "@/lib/session";
import { parseTaste } from "@/lib/taste";

export type TasteResult = { ok?: boolean; error?: string };

/** Save the questionnaire answers (replacing earlier ones). */
export async function saveTasteProfile(input: unknown): Promise<TasteResult> {
  const session = await getSession();
  if (!session) return { error: "Entra na tua conta para guardar as tuas respostas." };
  const a = parseTaste(input);
  const values = {
    genres: a.genres,
    format: a.format,
    pace: a.pace,
    seriesPref: a.series,
    adaptationsPref: a.adaptations,
    language: a.language,
    boxPref: a.box,
    lovedWorkIds: a.lovedWorkIds,
  };
  await db
    .insert(tasteProfiles)
    .values({ userId: session.user.id, ...values })
    .onConflictDoUpdate({ target: tasteProfiles.userId, set: { ...values, updatedAt: new Date() } });
  updateTag(SIMILARITY_TAG); // loved books count as likes for "quem gostou de X"
  return { ok: true };
}

/** "Este livro é parecido com…": add (or, with remove, take back) the reader's vote for a pair. */
export async function voteSimilar(workId: number, otherId: number, remove = false): Promise<TasteResult> {
  const session = await getSession();
  if (!session) return { error: "Entra na tua conta para sugerir livros parecidos." };
  if (!Number.isInteger(workId) || !Number.isInteger(otherId) || workId === otherId)
    return { error: "Escolhe outro livro." };
  const [workA, workB] = workId < otherId ? [workId, otherId] : [otherId, workId];

  if (remove) {
    await db
      .delete(similarityVotes)
      .where(
        and(
          eq(similarityVotes.userId, session.user.id),
          eq(similarityVotes.workA, workA),
          eq(similarityVotes.workB, workB),
        ),
      );
  } else {
    const found = await db.select({ id: works.id }).from(works).where(eq(works.id, otherId));
    if (!found.length) return { error: "Esse livro não existe." };
    await db.insert(similarityVotes).values({ userId: session.user.id, workA, workB }).onConflictDoNothing();
  }
  updateTag(SIMILARITY_TAG);
  return { ok: true };
}
