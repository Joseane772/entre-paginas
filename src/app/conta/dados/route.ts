import { exportUserData } from "@/lib/data/reading";
import { getSession } from "@/lib/session";

/** A reader's own data as JSON (reading status, reviews, account details). */
export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Não autenticado", { status: 401 });
  const data = await exportUserData(session.user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="entre-paginas-dados.json"',
      "Cache-Control": "no-store",
    },
  });
}
