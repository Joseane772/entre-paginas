import { cacheLife } from "next/cache";

/**
 * Set only while building without a database (the Docker image's `next build`). Database reads
 * then get a lifetime under 5 minutes, which Next.js leaves out of the build-time prerender and
 * fills in on the first request. At runtime the variable isn't set and they cache normally.
 */
export const buildingWithoutDb = process.env.BUILD_WITHOUT_DB === "1";

/** cacheLife() for functions that read the database. */
export function dbCacheLife(profile: "minutes" | "hours") {
  if (buildingWithoutDb) cacheLife("seconds");
  else if (profile === "minutes") cacheLife("minutes");
  else cacheLife("hours");
}
