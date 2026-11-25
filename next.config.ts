import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The Docker image runs the self-contained server; Vercel builds its own output.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  experimental: {
    // forbidden() / unauthorized() for account and admin pages
    authInterrupts: true,
  },
};

export default nextConfig;
