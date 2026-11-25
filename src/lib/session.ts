import "server-only";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** The signed-in user, or null. Reads request headers: call inside <Suspense>. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** For pages: send signed-out visitors to the sign-in page and back here afterwards. */
export async function requireUserPage(returnTo: string) {
  const s = await getSession();
  if (!s) redirect(`/entrar?voltar=${encodeURIComponent(returnTo)}`);
  return s;
}

export async function requireAdminPage(returnTo: string) {
  const s = await requireUserPage(returnTo);
  if (s.user.role !== "admin") forbidden();
  return s;
}

export const isAdmin = (s: { user: { role?: string | null } } | null) => s?.user.role === "admin";
