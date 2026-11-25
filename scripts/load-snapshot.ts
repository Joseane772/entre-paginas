/**
 * Load the catalogue snapshot (docker/initdb/10-catalogue.sql.gz) into an EMPTY database, e.g.
 * a new Neon database for Vercel. Uses psql from the postgres Docker image, so only Docker is
 * needed.
 *
 *   DATABASE_URL=postgres://... npm run db:load-snapshot
 */
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Define DATABASE_URL (a base de dados de destino).");

const sql = postgres(url, { max: 1, onnotice: () => {} });
const [{ exists }] = await sql`SELECT to_regclass('public.works') IS NOT NULL AS exists`;
await sql.end();
if (exists) {
  console.error("Esta base de dados já tem tabelas. O snapshot só se carrega numa base de dados vazia.");
  process.exit(1);
}

const psql = spawn(
  "docker",
  ["run", "--rm", "-i", "postgres:17-alpine", "psql", "-v", "ON_ERROR_STOP=1", "-q", url],
  { stdio: ["pipe", "inherit", "inherit"] },
);
await pipeline(createReadStream("docker/initdb/10-catalogue.sql.gz"), createGunzip(), psql.stdin);
const code: number = await new Promise((r) => psql.on("close", r));
if (code !== 0) process.exit(code);
console.log("Catálogo carregado. Agora: npm run db:migrate");
