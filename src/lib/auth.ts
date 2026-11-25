import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { count } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendMail } from "@/lib/email";

const vercelUrl = (host?: string) => (host ? `https://${host}` : undefined);

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Who becomes an admin on sign-up: anyone listed in ADMIN_EMAILS; if that's empty, the first
 * account created (handy for a fresh self-hosted copy). `npm run make-admin` promotes later.
 */
async function roleForNewUser(email: string) {
  if (adminEmails.length) return adminEmails.includes(email.toLowerCase()) ? "admin" : "user";
  const [{ n }] = await db.select({ n: count() }).from(schema.user);
  return n === 0 ? "admin" : "user";
}

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
    : undefined;

export const googleEnabled = !!google;

const baseURL =
  process.env.BETTER_AUTH_URL ??
  vercelUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  vercelUrl(process.env.VERCEL_URL);

/** localhost, 127.0.0.1 and [::1] are the same machine, so the site URL works with any of them. */
const LOOPBACK = ["localhost", "127.0.0.1", "[::1]"];
function loopbackAliases(url?: string) {
  try {
    const u = new URL(url ?? "");
    return LOOPBACK.includes(u.hostname) ? LOOPBACK.map((h) => `${u.protocol}//${h}${u.port ? `:${u.port}` : ""}`) : [];
  } catch {
    return [];
  }
}

const staticOrigins = [
  vercelUrl(process.env.VERCEL_URL),
  vercelUrl(process.env.VERCEL_BRANCH_URL),
  ...loopbackAliases(baseURL),
  // Other addresses the site is reached at (e.g. a LAN IP), comma-separated in TRUSTED_ORIGINS.
  ...(process.env.TRUSTED_ORIGINS ?? "").split(",").map((o) => o.trim().replace(/\/+$/, "")),
].filter((u): u is string => !!u);

export const auth = betterAuth({
  appName: "Entre Páginas",
  baseURL,
  // In development (`npm run dev`) the site is opened at whatever address `next dev` prints
  // (localhost, 127.0.0.1, the LAN IP), so accept requests from the address they were made to.
  trustedOrigins: async (request) => {
    const host = process.env.NODE_ENV === "development" ? request?.headers.get("host") : null;
    return host ? [...staticOrigins, `http://${host}`] : staticOrigins;
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      rateLimit: schema.rateLimit,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendMail(
        user.email,
        "Recuperar a palavra-passe",
        `Olá ${user.name},\n\nPara escolher uma nova palavra-passe, abre este link (válido durante 1 hora):\n${url}\n\nSe não pediste isto, ignora este email.`,
      );
    },
  },
  socialProviders: google ? { google } : {},
  account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
  user: { deleteUser: { enabled: true } },
  session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
  rateLimit: { enabled: true, storage: "database", modelName: "rateLimit" },
  databaseHooks: {
    user: {
      create: {
        before: async (u) => ({ data: { ...u, role: await roleForNewUser(u.email) } }),
      },
    },
  },
  plugins: [admin(), nextCookies()], // nextCookies must be last
});

export type Session = typeof auth.$Infer.Session;
