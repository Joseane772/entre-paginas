import "server-only";
import { and, asc, avg, count, desc, eq, inArray } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { buildingWithoutDb, dbCacheLife } from "@/lib/cache-life";
import { db } from "@/db";
import { readingStatus, reviews, similarityVotes, tasteProfiles, user, workAuthors, authors, works } from "@/db/schema";

export const reviewsTag = (workId: number) => `reviews:${workId}`;

export type ReadingStateValue = (typeof readingStatus.$inferSelect)["state"];

export const STATE_LABEL: Record<ReadingStateValue, string> = {
  quero_ler: "Quero ler",
  a_ler: "A ler",
  lido: "Li",
};

/** The signed-in reader's status and review for one book (per user, so not cached). */
export async function getMyReading(userId: string, workId: number) {
  const [[status], [review]] = await Promise.all([
    db
      .select()
      .from(readingStatus)
      .where(and(eq(readingStatus.userId, userId), eq(readingStatus.workId, workId))),
    db.select().from(reviews).where(and(eq(reviews.userId, userId), eq(reviews.workId, workId))),
  ]);
  return { status: status ?? null, review: review ?? null };
}

/** Public reviews for a book: average, count and the latest ones. */
export async function getReviews(workId: number) {
  "use cache";
  dbCacheLife("hours");
  cacheTag(reviewsTag(workId));
  if (buildingWithoutDb) return { count: 0, average: null, list: [] }; // Docker image build
  const [[summary], list] = await Promise.all([
    db
      .select({ n: count(), avg: avg(reviews.rating) })
      .from(reviews)
      .where(eq(reviews.workId, workId)),
    db
      .select({
        userId: reviews.userId,
        name: user.name,
        rating: reviews.rating,
        body: reviews.body,
        spoilers: reviews.spoilers,
        updatedAt: reviews.updatedAt,
      })
      .from(reviews)
      .innerJoin(user, eq(user.id, reviews.userId))
      .where(eq(reviews.workId, workId))
      .orderBy(desc(reviews.updatedAt))
      .limit(30),
  ]);
  return { count: summary.n, average: summary.avg ? Number(summary.avg) : null, list };
}

/** Everything on a reader's shelves, newest change first. */
export async function getShelves(userId: string) {
  const rows = await db
    .select({
      workId: works.id,
      slug: works.slug,
      title: works.title,
      year: works.firstPublishedYear,
      coverUrl: works.coverUrl,
      state: readingStatus.state,
      startedOn: readingStatus.startedOn,
      finishedOn: readingStatus.finishedOn,
      updatedAt: readingStatus.updatedAt,
      rating: reviews.rating,
    })
    .from(readingStatus)
    .innerJoin(works, eq(works.id, readingStatus.workId))
    .leftJoin(reviews, and(eq(reviews.workId, readingStatus.workId), eq(reviews.userId, readingStatus.userId)))
    .where(eq(readingStatus.userId, userId))
    .orderBy(desc(readingStatus.updatedAt));

  const ids = rows.map((r) => r.workId);
  const names = new Map<number, string[]>();
  if (ids.length) {
    const a = await db
      .select({ workId: workAuthors.workId, name: authors.name })
      .from(workAuthors)
      .innerJoin(authors, eq(authors.id, workAuthors.authorId))
      .where(inArray(workAuthors.workId, ids))
      .orderBy(asc(workAuthors.position));
    for (const r of a) (names.get(r.workId) ?? names.set(r.workId, []).get(r.workId)!).push(r.name);
  }
  return rows.map((r) => ({ ...r, authors: names.get(r.workId)?.join(", ") ?? "" }));
}

/** All of a user's data, for the "download my data" button (GDPR art. 20). */
export async function exportUserData(userId: string) {
  const [[u], status, revs, [taste], votes] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt })
      .from(user)
      .where(eq(user.id, userId)),
    db
      .select({
        book: works.title,
        slug: works.slug,
        state: readingStatus.state,
        startedOn: readingStatus.startedOn,
        finishedOn: readingStatus.finishedOn,
        updatedAt: readingStatus.updatedAt,
      })
      .from(readingStatus)
      .innerJoin(works, eq(works.id, readingStatus.workId))
      .where(eq(readingStatus.userId, userId)),
    db
      .select({
        book: works.title,
        slug: works.slug,
        rating: reviews.rating,
        body: reviews.body,
        spoilers: reviews.spoilers,
        updatedAt: reviews.updatedAt,
      })
      .from(reviews)
      .innerJoin(works, eq(works.id, reviews.workId))
      .where(eq(reviews.userId, userId)),
    db.select().from(tasteProfiles).where(eq(tasteProfiles.userId, userId)),
    db
      .select({ workA: similarityVotes.workA, workB: similarityVotes.workB, createdAt: similarityVotes.createdAt })
      .from(similarityVotes)
      .where(eq(similarityVotes.userId, userId)),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    account: u,
    readingStatus: status,
    reviews: revs,
    tasteProfile: taste ?? null,
    similarBookVotes: votes,
  };
}
