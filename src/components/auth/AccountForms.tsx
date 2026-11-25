"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authError } from "@/components/auth/AuthForm";
import { authClient } from "@/lib/auth-client";

type Msg = { ok?: string; error?: string };

function Status({ msg }: { msg: Msg }) {
  if (msg.error) return <p className="form-error" role="alert">{msg.error}</p>;
  if (msg.ok) return <p className="form-ok">{msg.ok}</p>;
  return null;
}

export function AccountForms({ name, email, hasPassword }: { name: string; email: string; hasPassword: boolean }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Msg>({});
  const [password, setPassword] = useState<Msg>({});
  const [del, setDel] = useState<Msg & { confirm?: boolean }>({});

  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <section className="panel">
        <h2>Perfil</h2>
        <p className="sub">{email}</p>
        <form
          className="form"
          action={async (f) => {
            const { error } = await authClient.updateUser({ name: String(f.get("name")).trim() });
            setProfile(error ? { error: authError(error) } : { ok: "Guardado." });
            if (!error) router.refresh();
          }}
        >
          <label className="field">
            Nome (aparece nas tuas opiniões)
            <input name="name" defaultValue={name} required maxLength={80} />
          </label>
          <Status msg={profile} />
          <div>
            <button className="btn btn-solid" type="submit">Guardar</button>
          </div>
        </form>
      </section>

      {hasPassword && (
        <section className="panel">
          <h2>Palavra-passe</h2>
          <form
            className="form"
            action={async (f) => {
              const { error } = await authClient.changePassword({
                currentPassword: String(f.get("current")),
                newPassword: String(f.get("new")),
                revokeOtherSessions: true,
              });
              setPassword(error ? { error: authError(error) } : { ok: "Palavra-passe alterada. As outras sessões foram terminadas." });
            }}
          >
            <label className="field">
              Palavra-passe atual
              <input name="current" type="password" required autoComplete="current-password" />
            </label>
            <label className="field">
              Nova palavra-passe
              <input name="new" type="password" required minLength={8} autoComplete="new-password" />
            </label>
            <Status msg={password} />
            <div>
              <button className="btn btn-solid" type="submit">Alterar</button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <h2>Sessão e dados</h2>
        <div className="inline-actions">
          <button
            className="btn"
            type="button"
            onClick={async () => {
              await authClient.signOut();
              router.replace("/");
              router.refresh();
            }}
          >
            Terminar sessão
          </button>
          <a className="btn" href="/conta/dados">
            Descarregar os meus dados
          </a>
        </div>
      </section>

      <section className="panel">
        <h2>Apagar conta</h2>
        <p className="sub">
          Apaga a conta, o teu estado de leitura e as tuas opiniões. Não é possível recuperar depois.
        </p>
        {!del.confirm ? (
          <button className="btn btn-danger" type="button" onClick={() => setDel({ confirm: true })}>
            Apagar a minha conta
          </button>
        ) : (
          <form
            className="form"
            action={async (f) => {
              const { error } = await authClient.deleteUser(
                hasPassword ? { password: String(f.get("password")) } : {},
              );
              if (error) return setDel({ confirm: true, error: authError(error) });
              router.replace("/");
              router.refresh();
            }}
          >
            {hasPassword && (
              <label className="field">
                Confirma com a tua palavra-passe
                <input name="password" type="password" required autoComplete="current-password" />
              </label>
            )}
            <Status msg={del} />
            <div className="inline-actions">
              <button className="btn btn-danger" type="submit">Apagar definitivamente</button>
              <button className="btn" type="button" onClick={() => setDel({})}>Cancelar</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
