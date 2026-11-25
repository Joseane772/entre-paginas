// Apply pending SQL migrations (./drizzle), retrying while Postgres starts up.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const client = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
for (let attempt = 1; ; attempt++) {
  try {
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    console.log("Base de dados atualizada.");
    break;
  } catch (e) {
    if (attempt >= 30 || !["ECONNREFUSED", "ENOTFOUND", "57P03"].includes(e.code)) throw e;
    await new Promise((r) => setTimeout(r, 1000));
  }
}
await client.end();
