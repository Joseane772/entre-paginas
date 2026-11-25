/* eslint-disable @next/next/no-img-element -- remote covers from several hosts; sizes are small */

/** A real cover when we have one, otherwise a generated "book" in a colour derived from the title. */
export function Cover({
  title,
  author,
  url,
  size = "md",
}: {
  title: string;
  author?: string;
  url?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  if (url) {
    return (
      <div className={`cover cover-${size}`}>
        <img src={url} alt={`Capa de ${title}`} loading="lazy" />
      </div>
    );
  }
  let hue = 0;
  for (const ch of title) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
  return (
    <div
      className={`cover cover-${size} cover-generated`}
      style={{ "--h": hue } as React.CSSProperties}
      aria-hidden="true"
    >
      <b>{title}</b>
      {author && <span>{author}</span>}
    </div>
  );
}
