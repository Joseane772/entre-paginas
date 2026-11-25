const USER_AGENT = process.env.DATA_USER_AGENT || "EntrePaginas/0.1 (development)";

export class SourceError extends Error {
  constructor(
    public source: string,
    public status: number,
    message: string,
  ) {
    super(`[${source}] ${status}: ${message}`);
  }
}

/** JSON GET with a polite User-Agent, a timeout and a couple of retries on 429/5xx. */
export async function getJson<T>(
  source: string,
  url: string,
  init: RequestInit = {},
  { retries = 2, timeoutMs = 20_000 } = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      ...init,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...init.headers },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (res.ok) return (await res.json()) as T;
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= retries) {
      throw new SourceError(source, res.status, (await res.text()).slice(0, 200));
    }
    const wait = Number(res.headers.get("retry-after")) * 1000 || 1000 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, wait));
  }
}
