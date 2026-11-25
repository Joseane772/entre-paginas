import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { Icon, type IconName } from "@/components/icons";
import { db } from "@/db";
import { account } from "@/db/schema";
import { AccountForms } from "@/components/auth/AccountForms";
import { isAdmin, requireUserPage } from "@/lib/session";

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
  const session = await requireUserPage("/conta");
  const { user } = session;
  const menu: [string, IconName, string][] = [
    ["/estante", "shelf", "A minha estante"],
    ["/recomendacoes", "sparkle", "Recomendações para ti"],
    ["/questionario", "user", "Os teus gostos de leitura"],
    ...(isAdmin(session) ? ([["/admin", "gear", "Administração"]] as [string, IconName, string][]) : []),
  ];
  const [credential] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, user.id), eq(account.providerId, "credential")));
  return (
    <>
      <ul className="menu-list">
        {menu.map(([href, icon, label]) => (
          <li key={href}>
            <Link href={href}>
              <span className="menu-icon">
                <Icon name={icon} />
              </span>
              {label}
              <Icon name="right" size={18} />
            </Link>
          </li>
        ))}
      </ul>
      <AccountForms name={user.name} email={user.email} hasPassword={!!credential} />
    </>
  );
}
