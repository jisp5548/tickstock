"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { markInAppNavigation } from "@/lib/navigation";

interface StockLinkProps {
  symbol: string;
  className?: string;
  /** Classes added while this stock's page is open. */
  activeClassName?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * Link to a stock page. The default prefetch only loads the shared page shell; hovering upgrades it to a
 * full prefetch so the page (and its logo view transition) is ready by the time the click lands.
 */
export function StockLink({ symbol, className = "", activeClassName = "", style, children }: StockLinkProps) {
  const href = `/stock/${symbol}`;
  const active = usePathname() === href;
  const [intent, setIntent] = useState(false);
  return (
    <Link
      href={href}
      prefetch={intent ? true : "auto"}
      onPointerEnter={() => setIntent(true)}
      onFocus={() => setIntent(true)}
      onClick={markInAppNavigation}
      aria-current={active ? "page" : undefined}
      className={`${className} ${active ? activeClassName : ""}`}
      style={style}
    >
      {children}
    </Link>
  );
}
