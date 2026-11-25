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

/**
 * True for addresses only reachable on a local network: localhost, private IPv4 ranges,
 * IPv6 loopback/link-local/unique-local, and .local names. IP literals and .local only, so a
 * public domain pointed at a private IP (DNS rebinding) doesn't count.
 */
function isLocalNetworkHost(host: string) {
  const name = host.replace(/:\d+$/, "").replace(/^\[|\]$/g, "").toLowerCase();
  if (name === "localhost" || name.endsWith(".local") || name === "::1") return true;
  const v4 = name.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
  }
  return /^(fe80|fc|fd)[0-9a-f]*:/.test(name);
}

export const auth = betterAuth({
  appName: "Entre Páginas",
  baseURL,
  // Besides the configured URL, accept requests made from the address they were sent to when
  // that address is on the local network (another device at home opening http://192.168.1.20:3000),
  // and in development from any address `next dev` is opened at. Same-origin only: a page on
  // another site sends its own Origin and is still refused.
  trustedOrigins: async (request) => {
    const host = request?.headers.get("host");
    if (!host || (process.env.NODE_ENV !== "development" && !isLocalNetworkHost(host))) return staticOrigins;
    return [...staticOrigins, `http://${host}`, `https://${host}`];
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
        // An admin adding a reader on /admin/utilizadores may give the admin role; public
        // sign-ups can't send a role (the admin plugin marks it input: false).
        before: async (u) => ({
          data: { ...u, role: (u as { role?: string }).role === "admin" ? "admin" : await roleForNewUser(u.email) },
        }),
      },
    },
  },
  plugins: [admin(), nextCookies()], // nextCookies must be last
});

export type Session = typeof auth.$Infer.Session;
