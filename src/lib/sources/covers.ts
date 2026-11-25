/**
 * Cover checks. Sources sometimes attach the wrong image to an edition (a selfie uploaded to
 * Open Library as the cover of a Portuguese edition, a publisher banner, a 1×1 placeholder).
 * Before using a cover we download it and look at its dimensions: book covers are portrait,
 * roughly 2:3. That catches most wrong images; ones with book-like proportions still need a
 * human (see `npm run check-covers`, which also builds a contact sheet).
 */

const USER_AGENT = process.env.DATA_USER_AGENT || "EntrePaginas/0.1 (development)";

export type ImageSize = { width: number; height: number };

/** Width and height from the first bytes of a JPEG, PNG, GIF or WebP file. */
export function imageSize(b: Uint8Array): ImageSize | null {
  const u16be = (i: number) => (b[i] << 8) | b[i + 1];
  const u16le = (i: number) => b[i] | (b[i + 1] << 8);
  const u32be = (i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  // PNG: IHDR right after the signature.
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { width: u32be(16), height: u32be(20) };
  // GIF
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return { width: u16le(6), height: u16le(8) };
  // WebP (RIFF....WEBP)
  if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45) {
    const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (chunk === "VP8 ") return { width: u16le(26) & 0x3fff, height: u16le(28) & 0x3fff };
    if (chunk === "VP8L") {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    return null;
  }
  // JPEG: walk the segments to the first start-of-frame marker.
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
        i += 2;
        continue;
      }
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) return { height: u16be(i + 5), width: u16be(i + 7) };
      i += 2 + u16be(i + 2);
    }
  }
  return null;
}

/** `unverified`: the download failed (network, HTTP error, empty body), so the image wasn't judged. */
export type CoverCheck =
  | { ok: true; size: ImageSize }
  | { ok: false; reason: string; size?: ImageSize; unverified?: boolean };

/** Proportions accepted as a book cover: height ÷ width. Covers are about 1.5. */
const MIN_RATIO = 1.15;
const MAX_RATIO = 2.1;
const MIN_WIDTH = 60;

/** Judge an image by its size alone. */
export function judgeCover(size: ImageSize | null): CoverCheck {
  if (!size) return { ok: false, reason: "não é uma imagem" };
  if (size.width < MIN_WIDTH || size.height < MIN_WIDTH) return { ok: false, reason: "imagem vazia ou minúscula", size };
  const ratio = size.height / size.width;
  if (ratio < MIN_RATIO) return { ok: false, reason: ratio < 1 ? "imagem deitada" : "imagem quase quadrada", size };
  if (ratio > MAX_RATIO) return { ok: false, reason: "imagem demasiado estreita", size };
  return { ok: true, size };
}

/** Download a cover (the medium size, for Open Library) and judge it. */
export async function checkCover(url: string): Promise<CoverCheck> {
  const probe = url.replace(/-L\.jpg$/, "-M.jpg");
  try {
    const res = await fetch(probe, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}`, unverified: true };
    const body = new Uint8Array(await res.arrayBuffer());
    if (!body.length) return { ok: false, reason: "resposta vazia", unverified: true };
    return judgeCover(imageSize(body));
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "falhou", unverified: true };
  }
}

/**
 * The first candidate that looks like a book cover, in the order given (duplicates skipped).
 * Stops after `maxChecks` downloads so a book with dozens of editions doesn't stall an import.
 * If none passes but some couldn't be downloaded (the source was down or rate-limiting), the
 * first of those is used unchecked: better than leaving the book without a cover.
 */
export async function pickCover(
  candidates: (string | null | undefined)[],
  { maxChecks = 8, log }: { maxChecks?: number; log?: (msg: string) => void } = {},
): Promise<string | null> {
  const seen = new Set<string>();
  let unverified: string | null = null;
  for (const url of candidates) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    if (seen.size > maxChecks) break;
    const check = await checkCover(url);
    if (check.ok) return url;
    if (check.unverified) unverified ??= url;
    log?.(`capa recusada (${check.reason}${check.size ? `, ${check.size.width}×${check.size.height}` : ""}): ${url}`);
  }
  return unverified;
}
