import Link from "next/link";
import { getSession, isAdmin } from "@/lib/session";

/** Header links that depend on who's signed in. Render inside <Suspense>. */
export async function UserNav() {
  const session = await getSession();
  if (!session) return <Link href="/entrar">Entrar</Link>;
  return (
    <span className="user-nav">
      <Link href="/estante">A minha estante</Link>
      {isAdmin(session) && <Link href="/admin">Admin</Link>}
      <Link href="/conta" title="A minha conta">
        {session.user.name.split(" ")[0]}
      </Link>
    </span>
  );
}
