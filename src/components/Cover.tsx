/* eslint-disable @next/next/no-img-element -- remote covers from several hosts; sizes are small */

/** Stable hue (0–359) from a title, for generated covers and book bindings. */
export function titleHue(title: string) {
  let hue = 0;
  for (const ch of title) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
  return hue;
}

/**
 * A book cover: the real one when we have it, otherwise a generated "book" in a colour derived
 * from the title. By default it's drawn as a closed book (binding, page edge and a ribbon
 * bookmark); `flat` gives just the cover, for small lists.
 */
export function Cover({
  title,
  author,
  url,
  size = "md",
  flat = false,
}: {
  title: string;
  author?: string;
  url?: string | null;
  size?: "sm" | "md" | "lg";
  flat?: boolean;
}) {
  const hue = titleHue(title);
  const face = url ? (
    <div className={`cover cover-${size}`}>
      <img src={url} alt={`Capa de ${title}`} loading="lazy" />
    </div>
  ) : (
    <div className={`cover cover-${size} cover-generated`} aria-hidden="true">
      <b>{title}</b>
      {author && <span>{author}</span>}
    </div>
  );
  if (flat) return <div style={{ "--h": hue } as React.CSSProperties}>{face}</div>;
  return (
    <div className={`book book-${size}`} style={{ "--h": hue } as React.CSSProperties}>
      {face}
    </div>
  );
}
