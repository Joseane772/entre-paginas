import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { googleEnabled } from "@/lib/auth";
import { safePath } from "@/lib/safe-path";
import { getSession } from "@/lib/session";

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
  if (await getSession()) redirect(returnTo);
  return <AuthForm mode={sp.modo === "registar" ? "registar" : "entrar"} returnTo={returnTo} google={googleEnabled} />;
}
