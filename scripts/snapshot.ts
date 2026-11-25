/**
 * Refresh docker/initdb/10-catalogue.sql.gz from the development database: the catalogue
 * (books, series, editions, adaptations) without any account data. `docker compose up` on a
 * fresh machine loads it so the site starts with books.
 *
 *   npm run snapshot
 */
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

const PRIVATE = ['"user"', "session", "account", "verification", "rate_limit", "reading_status", "reviews", "import_events", "work_overrides"];

const dump = spawn(
  "docker",
  [
    "compose", "exec", "-T", "db",
    "pg_dump", "-U", "entrepaginas", "--no-owner", "--no-privileges",
    ...PRIVATE.map((t) => `--exclude-table-data=public.${t}`),
    "entrepaginas",
  ],
  { stdio: ["ignore", "pipe", "inherit"] },
);
const out = "docker/initdb/10-catalogue.sql.gz";
await pipeline(dump.stdout, createGzip({ level: 9 }), createWriteStream(out));
const code: number = await new Promise((r) => dump.on("close", r));
if (code !== 0) throw new Error(`pg_dump falhou (${code})`);
console.log(`Escrito ${out}`);
