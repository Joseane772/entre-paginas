import { eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { workOverrides, works } from "@/db/schema";
import { WORKS, type WorkCuration } from "@/data/curation";

type Db = Pick<typeof db, "select">;

const nonNull = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== false)) as Partial<T>;

/**
 * Corrections for these books: the checked-in file (src/data/curation.ts) overlaid with
 * corrections admins made on the site (work_overrides), which win field by field.
 */
export async function loadCuration(tx: Db, qids: string[], olWorkId?: string) {
  const ids = [...new Set(qids.filter(Boolean))];
  const rows =
    ids.length || olWorkId
      ? await tx
          .select({
            qid: works.wikidataId,
            ol: works.openLibraryWorkId,
            title: workOverrides.title,
            originalTitle: workOverrides.originalTitle,
            synopsis: workOverrides.synopsis,
            note: workOverrides.note,
            hideFromSeries: workOverrides.hideFromSeries,
          })
          .from(workOverrides)
          .innerJoin(works, eq(works.id, workOverrides.workId))
          .where(
            or(
              ids.length ? inArray(works.wikidataId, ids) : undefined,
              olWorkId ? eq(works.openLibraryWorkId, olWorkId) : undefined,
            ),
          )
      : [];
  const byKey = new Map<string, WorkCuration>();
  for (const r of rows) {
    const { qid, ol, ...fields } = r;
    const key = qid ?? `ol:${ol}`;
    byKey.set(key, { ...(qid ? WORKS[qid] : {}), ...(nonNull(fields) as WorkCuration) });
  }
  return (qid?: string | null, ol?: string | null): WorkCuration =>
    (qid && byKey.get(qid)) || (ol && byKey.get(`ol:${ol}`)) || (qid && WORKS[qid]) || {};
}

/** Wikidata ids of every book hidden from series, from the file and from the site. */
export async function hiddenQids(tx: Db) {
  const rows = await tx
    .select({ qid: works.wikidataId })
    .from(workOverrides)
    .innerJoin(works, eq(works.id, workOverrides.workId))
    .where(eq(workOverrides.hideFromSeries, true));
  const fromFile = Object.keys(WORKS).filter((q) => WORKS[q].hideFromSeries);
  return [...new Set([...fromFile, ...rows.map((r) => r.qid!).filter(Boolean)])];
}
