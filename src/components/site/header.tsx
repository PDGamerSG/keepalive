"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "@/components/ui/icons";

/** Full label, and a shorter one for phone widths. */
const LINKS: [href: string, label: string, short: string][] = [
  ["/", "Overview", "Overview"],
  ["/shop", "Shop", "Shop"],
  ["/agent", "Agent demo", "Agent"],
  ["/merchant", "Merchant desk", "Merchant"],
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
          {LINKS.map(([href, label, short]) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}>
              <span className="label-long">{label}</span>
              <span className="label-short">{short}</span>
            </Link>
          ))}
        </nav>
        <div className="site-status" role="status">
          <span className={paypal ? "is-on" : undefined} title={paypal ? "PayPal sandbox connected" : "PayPal checkout is offline"}>
            <span className="label-long">{paypal ? "PayPal sandbox" : "PayPal offline"}</span>
            <span className="label-short">PayPal</span>
          </span>
          <span className={ai ? "is-on" : undefined} title={ai ? "AI connected" : "AI conversations are offline"}>
            {ai ? "AI online" : "AI offline"}
          </span>
        </div>
      </div>
    </header>
  );
}
