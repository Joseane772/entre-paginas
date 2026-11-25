"use client";

import Link from "next/link";
import { useRef } from "react";
import { Icon } from "./icons";

/** A titled, horizontally scrolling row with "Ver tudo" and previous/next buttons. */
export function BookRow({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <section className="row" aria-label={title}>
      <div className="section-head">
        <h2>{title}</h2>
        <div className="section-tools">
          {href && (
            <Link className="pill-link" href={href}>
              Ver tudo
            </Link>
          )}
          <button type="button" className="round-btn" onClick={() => scroll(-1)} aria-label="Anteriores">
            <Icon name="left" size={18} />
          </button>
          <button type="button" className="round-btn" onClick={() => scroll(1)} aria-label="Seguintes">
            <Icon name="right" size={18} />
          </button>
        </div>
      </div>
      <div className="row-track" ref={track}>
        {children}
      </div>
    </section>
  );
}
