import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { googleEnabled } from "@/lib/auth";
import { safePath } from "@/lib/safe-path";
import { getSession } from "@/lib/session";
import { SignedInNotice } from "@/components/auth/SignedInNotice";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default function SignInPage(props: PageProps<"/entrar">) {
  return (
    <Suspense fallback={<div className="auth-card skeleton" style={{ height: 380 }} />}>
      <SignIn searchParams={props.searchParams} />
    </Suspense>
  );
}

async function SignIn({ searchParams }: Pick<PageProps<"/entrar">, "searchParams">) {
  const sp = await searchParams;
  const returnTo = safePath(sp.voltar);
  const session = await getSession();
  // Already signed in: say so (with a way to switch accounts) instead of silently bouncing back.
  if (session) return <SignedInNotice name={session.user.name} email={session.user.email} returnTo={returnTo} />;
  return <AuthForm mode={sp.modo === "registar" ? "registar" : "entrar"} returnTo={returnTo} google={googleEnabled} />;
}
