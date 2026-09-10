"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  return (
    <header className="site-header shell">
      <Link className="wordmark" href="/" aria-label="Luma home">
        Luma
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
          Shop
        </Link>
        <Link
          href="/orders"
          prefetch={false}
          aria-current={pathname === "/orders" ? "page" : undefined}
        >
          Orders
        </Link>
      </nav>
    </header>
  );
}
