"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { authError } from "@/components/auth/AuthForm";
import { authClient } from "@/lib/auth-client";

export default function ResetPasswordPage() {
  return (
    <div className="auth-card">
      <title>Nova palavra-passe · Entre Páginas</title>
      <h1>Nova palavra-passe</h1>
      <Suspense>
        <ResetForm />
      </Suspense>
    </div>
  );
}

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<{ done?: boolean; error?: string; pending?: boolean }>({});

  if (!token || params.get("error"))
    return (
      <p>
        Este link já não é válido. <Link href="/recuperar">Pede um novo</Link>.
      </p>
    );

  async function submit(form: FormData) {
    setState({ pending: true });
    const { error } = await authClient.resetPassword({ newPassword: String(form.get("password")), token: token! });
    setState(error ? { error: authError(error) } : { done: true });
  }

  if (state.done)
    return (
      <p>
        Palavra-passe alterada. <Link href="/entrar">Entrar</Link>
      </p>
    );
  return (
    <form action={submit} className="form" style={{ marginTop: 16 }}>
      <label className="field">
        Nova palavra-passe
        <input name="password" type="password" required minLength={8} autoComplete="new-password" />
        <small>Pelo menos 8 caracteres.</small>
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="btn btn-solid" type="submit" disabled={state.pending}>
        Guardar
      </button>
    </form>
  );
}
