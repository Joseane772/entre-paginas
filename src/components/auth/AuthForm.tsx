"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email ou palavra-passe errados.",
  USER_ALREADY_EXISTS: "Já existe uma conta com este email. Entra em vez de criar outra.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Já existe uma conta com este email. Entra em vez de criar outra.",
  PASSWORD_TOO_SHORT: "A palavra-passe tem de ter pelo menos 8 caracteres.",
  INVALID_EMAIL: "Este email não parece válido.",
  BANNED_USER: "Esta conta foi suspensa.",
  INVALID_ORIGIN:
    "Este endereço do site não está autorizado a criar contas nem a entrar. Abre o site pelo endereço configurado (por exemplo http://localhost:3000), ou junta este endereço a TRUSTED_ORIGINS.",
};
export const authError = (e?: { code?: string; message?: string; status?: number } | null) =>
  !e
    ? undefined
    : e.status === 429
      ? "Demasiadas tentativas. Espera um pouco e tenta de novo."
      : (e.code && MESSAGES[e.code]) || e.message || "Algo correu mal. Tenta de novo.";

export function AuthForm({
  mode,
  returnTo,
  google,
}: {
  mode: "entrar" | "registar";
  returnTo: string;
  google: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const signup = mode === "registar";

  // onSubmit rather than a form action: React resets action forms, which would clear the email on error.
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(undefined);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const { error } = signup
      ? await authClient.signUp.email({ name: String(form.get("name")).trim(), email, password })
      : await authClient.signIn.email({ email, password });
    if (error) {
      setError(authError(error));
      setPending(false);
      return;
    }
    router.replace(returnTo);
    router.refresh();
  }

  const other = `/entrar?${new URLSearchParams({ ...(signup ? {} : { modo: "registar" }), voltar: returnTo })}`;

  return (
    <div className="auth-card">
      <h1>{signup ? "Criar conta" : "Entrar"}</h1>
      <p className="sub">
        {signup
          ? "Para guardares o que lês, dares a tua opinião e importares livros."
          : "Bem-vindo de volta."}
      </p>

      {google && (
        <>
          <button
            type="button"
            className="btn"
            style={{ width: "100%", marginTop: 14 }}
            onClick={() => authClient.signIn.social({ provider: "google", callbackURL: returnTo })}
          >
            Continuar com Google
          </button>
          <div className="or">ou com email</div>
        </>
      )}

      <form method="post" onSubmit={submit} className="form" style={{ marginTop: google ? 0 : 16 }}>
        {signup && (
          <label className="field">
            Nome
            <input name="name" required maxLength={80} autoComplete="name" />
          </label>
        )}
        <label className="field">
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label className="field">
          Palavra-passe
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={signup ? "new-password" : "current-password"}
          />
          {signup && <small>Pelo menos 8 caracteres.</small>}
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-solid" type="submit" disabled={pending}>
          {pending ? "Um momento…" : signup ? "Criar conta" : "Entrar"}
        </button>
      </form>

      <p className="sub" style={{ marginTop: 18 }}>
        {signup ? "Já tens conta? " : "Ainda não tens conta? "}
        <Link href={other}>{signup ? "Entrar" : "Criar conta"}</Link>
        {!signup && (
          <>
            {" · "}
            <Link href="/recuperar">Esqueci-me da palavra-passe</Link>
          </>
        )}
      </p>
    </div>
  );
}
