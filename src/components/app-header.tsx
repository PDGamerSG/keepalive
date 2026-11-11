"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [["/merchant", "Dashboard"], ["/shop", "Brewbox shop"], ["/agent", "Agent demo"]] as const;

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link href="/" className="app-brand" aria-label="KeepAlive home">KeepAlive<span aria-hidden="true">.</span></Link>
        <span className="sandbox-badge"><span aria-hidden="true" />PayPal sandbox</span>
        <nav aria-label="Main navigation" className="app-nav">
          {links.map(([href, label]) => (
            <Link key={href} href={href} aria-current={pathname.startsWith(href) ? "page" : undefined}>{label}</Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
