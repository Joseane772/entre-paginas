/**
 * Check every book's cover and list the ones that don't look like a book cover (a photo, a
 * banner, a blank placeholder): landscape, square, tiny or not an image.
 *
 *   npm run check-covers           # report only
 *   npm run check-covers -- --fix  # also pick the next good cover for each bad one
 *
 * --fix tries, in order: Portugal editions, the work's covers on Open Library, other
 * Portuguese editions, then any edition. Restart the Next.js server afterwards (pages are
 * cached for hours). Covers with book-like proportions but the wrong picture can't be caught
 * this way: look at the covers on the site, and fix those by hand.
 */
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { editions, works } from "@/db/schema";
import { checkCover, pickCover } from "@/lib/sources/covers";
import * as ol from "@/lib/sources/openlibrary";

const fix = process.argv.includes("--fix");
const large = (u?: string | null) => u?.replace("-M.jpg", "-L.jpg");

async function main() {
  const rows = await db
    .select({ id: works.id, title: works.title, slug: works.slug, cover: works.coverUrl, ol: works.openLibraryWorkId })
    .from(works)
    .where(isNotNull(works.coverUrl))
    .orderBy(works.title);

  const bad: (typeof rows[number] & { reason: string })[] = [];
  const queue = [...rows];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let w = queue.shift(); w; w = queue.shift()) {
        const c = await checkCover(w.cover!);
        if (!c.ok && c.unverified) console.log(`  ? ${w.title}: não foi possível descarregar (${c.reason}), fica como está`);
        else if (!c.ok) bad.push({ ...w, reason: c.reason + (c.size ? ` (${c.size.width}×${c.size.height})` : "") });
      }
    }),
  );

  console.log(`${rows.length} capas verificadas, ${bad.length} com problemas.`);
  for (const w of bad) console.log(`  ✗ ${w.title} — ${w.reason}\n    /livro/${w.slug}\n    ${w.cover}`);
  if (!fix || !bad.length) return;

  for (const w of bad) {
    const eds = await db
      .select({ cover: editions.coverUrl, language: editions.language, region: editions.region })
      .from(editions)
      .where(and(eq(editions.workId, w.id), isNotNull(editions.coverUrl)));
    const olWork = w.ol ? await ol.getWork(w.ol).catch(() => undefined) : undefined;
    const candidates = [
      ...eds.filter((e) => e.region === "PT").map((e) => large(e.cover)),
      ...(olWork?.covers ?? []).slice(0, 4).map((c) => ol.olCover(c, "L")),
      ...eds.filter((e) => e.language === "por" && e.region !== "PT").map((e) => large(e.cover)),
      ...eds.filter((e) => e.language !== "por").map((e) => large(e.cover)),
    ].filter((u) => u !== w.cover);
    const next = await pickCover(candidates, { maxChecks: 12, log: (m) => console.log("    " + m) });
    await db.update(works).set({ coverUrl: next }).where(eq(works.id, w.id));
    console.log(`  → ${w.title}: ${next ?? "sem capa (fica a capa gerada)"}`);
  }
  console.log("Reinicia o servidor Next.js para ver as novas capas.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
