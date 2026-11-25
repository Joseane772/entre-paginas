import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { Suspense } from "react";
import { db } from "@/db";
import { user } from "@/db/schema";
import { manageUser } from "@/app/admin/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { requireAdminPage } from "@/lib/session";

export const metadata: Metadata = { title: "Utilizadores", robots: { index: false } };

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="panel skeleton" style={{ height: 300 }} />}>
      <Users />
    </Suspense>
  );
}

async function Users() {
  const me = await requireAdminPage("/admin/utilizadores");
  const rows = await db.select().from(user).orderBy(desc(user.createdAt)).limit(200);
  return (
    <section className="panel">
      <h2>Utilizadores</h2>
      <p className="sub">Os 200 mais recentes.</p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Desde</th>
              <th>Papel</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.createdAt.toLocaleDateString("pt-PT")}</td>
                <td>
                  {u.role === "admin" ? "admin" : "leitor"}
                  {u.banned && <span className="pill" style={{ marginLeft: 6 }}>suspenso</span>}
                </td>
                <td>
                  {u.id === me.user.id ? (
                    <span className="muted">tu</span>
                  ) : (
                    <div className="inline-actions">
                      <ActionForm action={manageUser} className="" submit={u.role === "admin" ? "Tirar admin" : "Tornar admin"}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="op" value={u.role === "admin" ? "make-user" : "make-admin"} />
                      </ActionForm>
                      <ActionForm action={manageUser} className="" danger={!u.banned} submit={u.banned ? "Reativar" : "Suspender"}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="op" value={u.banned ? "unban" : "ban"} />
                      </ActionForm>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
