/**
 * Apply src/data/curation.ts to the database without re-importing.
 *
 *   npm run curate
 *
 * Titles, original titles, synopses and notes are overwritten where the file sets them; slugs
 * follow the new titles (old ones redirect); hidden books leave their series. Restart the
 * Next.js server afterwards, since pages are cached for hours.
 */
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { series, seriesWorks, works } from "@/db/schema";
import { SERIES, WORKS } from "@/data/curation";
import { deleteOrphanStubs, reslug } from "@/lib/import/importWork";
import { slugify } from "@/lib/text";

async function main() {
  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: works.id, qid: works.wikidataId, title: works.title, slug: works.slug, year: works.firstPublishedYear })
      .from(works)
      .where(inArray(works.wikidataId, Object.keys(WORKS)));

    for (const w of rows) {
      const c = WORKS[w.qid!];
      const set = {
        ...(c.title ? { title: c.title } : {}),
        ...(c.originalTitle ? { originalTitle: c.originalTitle } : {}),
        ...(c.synopsis ? { synopsis: c.synopsis, synopsisLanguage: "pt", synopsisSourceUrl: null } : {}),
        ...(c.note ? { editorNote: c.note } : {}),
      };
      if (Object.keys(set).length) await tx.update(works).set(set).where(eq(works.id, w.id));
      const slug = await reslug(tx, w.id, c.title ?? w.title, w.year);
      if (c.hideFromSeries) await tx.delete(seriesWorks).where(eq(seriesWorks.workId, w.id));

      const changes = [
        c.title && c.title !== w.title && `"${w.title}" → "${c.title}"`,
        slug && slug !== w.slug && `/livro/${w.slug} → /livro/${slug}`,
        c.hideFromSeries && "retirado da saga",
        c.note && "nota",
        c.originalTitle && "título original",
      ].filter(Boolean);
      if (changes.length) console.log(`${w.qid}: ${changes.join(", ")}`);
    }
    await deleteOrphanStubs(tx);

    const seriesRows = await tx.select().from(series).where(inArray(series.wikidataId, Object.keys(SERIES)));
    for (const s of seriesRows) {
      const { name } = SERIES[s.wikidataId!];
      if (name === s.name) continue;
      // No series pages yet, so their slugs can change freely.
      const slug = slugify(name);
      const [taken] = await tx.select({ id: series.id }).from(series).where(eq(series.slug, slug));
      await tx
        .update(series)
        .set({ name, ...(!taken || taken.id === s.id ? { slug } : {}) })
        .where(eq(series.id, s.id));
      console.log(`saga ${s.wikidataId}: "${s.name}" → "${name}"`);
    }
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
