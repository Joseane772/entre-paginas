"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

/** Shown on /entrar to someone already signed in: continue, or sign out to use another account. */
export function SignedInNotice({ name, email, returnTo }: { name: string; email: string; returnTo: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <div className="auth-card">
      <h1>Já tens sessão iniciada</h1>
      <p className="sub">
        Estás a usar a conta de <b>{name}</b> ({email}).
      </p>
      <div className="inline-actions" style={{ marginTop: 16 }}>
        <Link className="btn btn-solid" href={returnTo}>
          Continuar
        </Link>
        <button
          type="button"
          className="btn"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            await authClient.signOut();
            router.refresh(); // the page re-renders with the sign-in / sign-up form
          }}
        >
          {pending ? "Um momento…" : "Terminar sessão e usar outra conta"}
        </button>
      </div>
      <p className="sub" style={{ marginTop: 18 }}>
        Queres criar contas para outras pessoas sem sair da tua? Os administradores podem fazê-lo em{" "}
        <Link href="/admin/utilizadores">Admin → Utilizadores</Link>.
      </p>
    </div>
  );
}
