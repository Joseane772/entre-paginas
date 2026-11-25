"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Icon, type IconName } from "./icons";

type Props = {
  href: string;
  icon?: IconName;
  /** Initial shown in a circle instead of an icon (the account link). */
  avatar?: string;
  className?: string;
  children: React.ReactNode;
};

function Anchor({ href, icon, avatar, className = "", children, current }: Props & { current: boolean }) {
  return (
    <Link href={href} className={`nav-item ${className}`} aria-current={current ? "page" : undefined}>
      {avatar ? (
        <span className="avatar" aria-hidden="true">
          {avatar}
        </span>
      ) : (
        icon && <Icon name={icon} />
      )}
      <span className="nav-label">{children}</span>
    </Link>
  );
}

function WithPath(props: Props) {
  const path = usePathname();
  const current = props.href === "/" ? path === "/" : path === props.href || path.startsWith(`${props.href}/`);
  return <Anchor {...props} current={current} />;
}

/**
 * Header link (a tab in the bottom bar on phones), marked current on its section. The pathname
 * is request data, so the highlighted version streams in; the fallback is the same link unmarked.
 */
export function NavLink(props: Props) {
  return (
    <Suspense fallback={<Anchor {...props} current={false} />}>
      <WithPath {...props} />
    </Suspense>
  );
}
