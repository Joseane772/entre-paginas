import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The Docker image runs the self-contained server; Vercel builds its own output.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // `npm run dev` opened from other devices on the home network (http://192.168.x.y:3000):
  // without this the dev server blocks its own scripts and the page never becomes interactive.
  // Private IPv4 ranges and .local names only; development only.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  experimental: {
    // forbidden() / unauthorized() for account and admin pages
    authInterrupts: true,
  },
};

export default nextConfig;
