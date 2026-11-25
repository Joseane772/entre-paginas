/**
 * Import books into the catalogue.
 *
 *   npm run import -- "duna frank herbert"     search Open Library, import the top hit
 *   npm run import -- --ol OL893414W           by Open Library work id
 *   npm run import -- --wd Q190192             by Wikidata id
 *   npm run import -- --series "duna"          also fully import every book in its series
 *   npm run seed                               import the starter list (scripts/seed-list.ts)
 */
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { seriesWorks, works } from "@/db/schema";
import { importWork, type ImportInput } from "@/lib/import/importWork";
import { olId, searchWorks } from "@/lib/sources/openlibrary";
import { SEED } from "./seed-list";

const log = (m: string) => console.log("  " + m);

async function resolve(arg: string, flag?: string): Promise<ImportInput> {
  if (flag === "--ol") return { olWorkId: arg };
  if (flag === "--wd") return { qid: arg };
  const [hit] = await searchWorks(arg, 1);
  if (!hit) throw new Error(`Sem resultados no Open Library para "${arg}"`);
  console.log(`→ ${hit.title} — ${hit.author_name?.join(", ") ?? "?"} (${hit.first_publish_year ?? "?"})`);
  return { olWorkId: olId(hit.key) };
}

async function importSeriesOf(workId: number) {
  const memberships = await db.select().from(seriesWorks).where(eq(seriesWorks.workId, workId));
  for (const m of memberships) {
    const stubs = await db
      .select({ id: works.id, title: works.title, qid: works.wikidataId, ol: works.openLibraryWorkId })
      .from(seriesWorks)
      .innerJoin(works, eq(works.id, seriesWorks.workId))
      .where(and(eq(seriesWorks.seriesId, m.seriesId), eq(works.status, "stub")));
    for (const s of stubs) {
      console.log(`→ (saga) ${s.title}`);
      try {
        // Prefer the Wikidata id: it resolves the Open Library id itself, with a fallback for dead ones.
        await importWork(s.qid ? { qid: s.qid } : { olWorkId: s.ol! }, log);
      } catch (e) {
        console.error(`  ✗ ${(e as Error).message}`);
      }
    }
  }
}

async function run(input: ImportInput, withSeries: boolean) {
  const r = await importWork(input, log);
  if (withSeries) await importSeriesOf(r.workId);
}

async function main() {
  const args = process.argv.slice(2);
  const withSeries = args.includes("--series");
  const rest = args.filter((a) => a !== "--series");

  if (rest[0] === "--seed") {
    for (const item of SEED) {
      console.log(`\n# ${item.label}`);
      try {
        await run(item.olWorkId ? { olWorkId: item.olWorkId } : await resolve(item.query!), item.series ?? false);
      } catch (e) {
        console.error(`  ✗ ${(e as Error).message}`);
      }
    }
    return;
  }

  const flag = rest[0]?.startsWith("--") ? rest[0] : undefined;
  const value = flag ? rest[1] : rest.join(" ");
  if (!value) {
    console.error('Uso: npm run import -- "título autor" | --ol OL…W | --wd Q… [--series]');
    process.exit(1);
  }
  await run(await resolve(value, flag), withSeries);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
