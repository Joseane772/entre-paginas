import { NavLink } from "@/components/NavLink";
import { getSession, isAdmin } from "@/lib/session";

/** Header links that depend on who's signed in. Render inside <Suspense>. */
export async function UserNav() {
  const session = await getSession();
  if (!session)
    return (
      <NavLink href="/entrar" icon="user">
        Entrar
      </NavLink>
    );
  const first = session.user.name.trim().split(/\s+/)[0] || "Conta";
  return (
    <>
      <NavLink href="/recomendacoes" icon="sparkle">
        Para ti
      </NavLink>
      <NavLink href="/estante" icon="shelf">
        Estante
      </NavLink>
      {isAdmin(session) && (
        <NavLink href="/admin" icon="gear" className="nav-admin">
          Admin
        </NavLink>
      )}
      <NavLink href="/conta" avatar={first[0].toUpperCase()}>
        {first}
      </NavLink>
    </>
  );
}
