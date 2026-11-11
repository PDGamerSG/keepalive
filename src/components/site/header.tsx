"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "@/components/ui/icons";

const LINKS: [href: string, label: string][] = [
  ["/", "Overview"],
  ["/shop", "Shop"],
  ["/agent", "Agent demo"],
  ["/merchant", "Merchant desk"],
];

export function SiteHeader({ paypal, ai }: { paypal: boolean; ai: boolean }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <header className="site-header">
      <div className="shell site-header-row">
        <Link href="/" className="site-brand" aria-label="KeepAlive home">
          <Mark />
          <span className="display">KeepAlive</span>
        </Link>
        <nav className="site-nav" aria-label="Main">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="site-status" role="status">
          <span className={paypal ? "is-on" : undefined} title={paypal ? "PayPal sandbox connected" : "PayPal checkout is offline"}>
            {paypal ? "PayPal sandbox" : "PayPal offline"}
          </span>
          <span className={ai ? "is-on" : undefined} title={ai ? "Claude connected" : "AI conversations are offline"}>
            {ai ? "Claude" : "Claude offline"}
          </span>
        </div>
      </div>
    </header>
  );
}
