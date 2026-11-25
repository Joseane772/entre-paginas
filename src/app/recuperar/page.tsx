"use client";

import Link from "next/link";
import { useState } from "react";
import { authError } from "@/components/auth/AuthForm";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [state, setState] = useState<{ sent?: boolean; error?: string; pending?: boolean }>({});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState({ pending: true });
    const { error } = await authClient.requestPasswordReset({
      email: String(form.get("email")),
      redirectTo: "/nova-palavra-passe",
    });
    setState(error ? { error: authError(error) } : { sent: true });
  }

  return (
    <div className="auth-card">
      <title>Recuperar palavra-passe · Entre Páginas</title>
      <h1>Recuperar palavra-passe</h1>
      {state.sent ? (
        <p>Se existir uma conta com esse email, enviámos-lhe um link para escolher uma nova palavra-passe.</p>
      ) : (
        <form method="post" onSubmit={submit} className="form" style={{ marginTop: 16 }}>
          <label className="field">
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          {state.error && <p className="form-error" role="alert">{state.error}</p>}
          <button className="btn btn-solid" type="submit" disabled={state.pending}>
            Enviar link
          </button>
        </form>
      )}
      <p className="sub" style={{ marginTop: 18 }}>
        <Link href="/entrar">Voltar a entrar</Link>
      </p>
    </div>
  );
}
