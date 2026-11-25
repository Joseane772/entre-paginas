import type { Metadata } from "next";
import { count, eq, gt, sql } from "drizzle-orm";
import { Suspense } from "react";
import { db } from "@/db";
import { importEvents, readingStatus, reviews, user, workOverrides, works } from "@/db/schema";
import { requireAdminPage } from "@/lib/session";

export const metadata: Metadata = { title: "Administração", robots: { index: false } };

export default function AdminHome() {
  return (
    <Suspense fallback={<div className="panel skeleton" style={{ height: 200 }} />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  await requireAdminPage("/admin");
  const n = async (q: Promise<{ n: number }[]>) => (await q)[0].n;
  const [users, full, stubs, statuses, revs, overrides, imports] = await Promise.all([
    n(db.select({ n: count() }).from(user)),
    n(db.select({ n: count() }).from(works).where(eq(works.status, "full"))),
    n(db.select({ n: count() }).from(works).where(eq(works.status, "stub"))),
    n(db.select({ n: count() }).from(readingStatus)),
    n(db.select({ n: count() }).from(reviews)),
    n(db.select({ n: count() }).from(workOverrides)),
    n(db.select({ n: count() }).from(importEvents).where(gt(importEvents.createdAt, sql`now() - interval '24 hours'`))),
  ]);
  const stats: [string, number][] = [
    ["Leitores", users],
    ["Livros completos", full],
    ["Livros só conhecidos pela saga", stubs],
    ["Livros nas estantes", statuses],
    ["Opiniões", revs],
    ["Correções feitas no site", overrides],
    ["Importações nas últimas 24 h", imports],
  ];
  return (
    <section className="panel">
      <h2>Resumo</h2>
      <div className="table-wrap">
        <table className="table">
          <tbody>
            {stats.map(([label, v]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{v.toLocaleString("pt-PT")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
