import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { Suspense } from "react";
import { db } from "@/db";
import { account } from "@/db/schema";
import { AccountForms } from "@/components/auth/AccountForms";
import { requireUserPage } from "@/lib/session";

export const metadata: Metadata = { title: "A minha conta", robots: { index: false } };

export default function AccountPage() {
  return (
    <>
      <header className="page-head">
        <h1>A minha conta</h1>
      </header>
      <Suspense fallback={<div className="panel skeleton" style={{ height: 300 }} />}>
        <Account />
      </Suspense>
    </>
  );
}

async function Account() {
  const { user } = await requireUserPage("/conta");
  const [credential] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, user.id), eq(account.providerId, "credential")));
  return <AccountForms name={user.name} email={user.email} hasPassword={!!credential} />;
}
