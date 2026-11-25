import Link from "next/link";
import { getSession, isAdmin } from "@/lib/session";

export async function AdminEditLink({ workId }: { workId: number }) {
  if (!isAdmin(await getSession())) return null;
  return (
    <Link className="btn" href={`/admin/livros/${workId}`} style={{ marginTop: 14 }}>
      Corrigir dados
    </Link>
  );
}
