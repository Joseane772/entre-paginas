/** Only same-site paths are allowed as "return to" targets (no open redirects). */
export function safePath(p: unknown, fallback = "/"): string {
  return typeof p === "string" && p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/\\") ? p : fallback;
}
