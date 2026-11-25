/**
 * Give an existing account the admin role.
 *
 *   npm run make-admin -- someone@example.com
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Uso: npm run make-admin -- email@exemplo.pt");
  process.exit(1);
}
db.update(user)
  .set({ role: "admin" })
  .where(eq(user.email, email))
  .returning({ name: user.name })
  .then((rows) => {
    console.log(rows.length ? `${rows[0].name} (${email}) é agora admin.` : `Não há nenhuma conta com o email ${email}.`);
    process.exit(rows.length ? 0 : 1);
  });
