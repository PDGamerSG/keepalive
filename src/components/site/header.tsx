"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: [href: string, label: string][] = [
  ["/", "Overview"],
  ["/shop", "Brewbox shop"],
  ["/agent", "Agent to agent"],
  ["/merchant", "Merchant desk"],
];

/** The KeepAlive mark: a core with one subscriber in orbit. */
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="ka-mark">
      <defs>
        <radialGradient id="ka-core" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#b8a4ff" />
          <stop offset="100%" stopColor="#5b4bd6" />
        </radialGradient>
      </defs>
      <ellipse cx="16" cy="16" rx="13.5" ry="6.2" fill="none" stroke="rgba(184,164,255,0.55)" strokeWidth="1.2" transform="rotate(-24 16 16)" />
      <circle cx="16" cy="16" r="5.2" fill="url(#ka-core)" />
      <g className="ka-mark-body">
        <circle cx="28.4" cy="10.4" r="2.3" fill="#6ef0c4" />
      </g>
    </svg>
  );
}

export function SiteHeader({ paypal, ai }: { paypal: boolean; ai: boolean }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <header className="site-header">
      <div className="shell site-header-row">
        <Link href="/" className="site-brand" aria-label="KeepAlive home">
          <Mark />
          <span className="display display-tight">KeepAlive</span>
        </Link>
        <nav className="site-nav" aria-label="Main">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="site-status" role="status">
          <span className={paypal ? "state state-paypal" : "state state-dim"} title={paypal ? "PayPal sandbox connected" : "PayPal checkout is offline"}>
            {paypal ? "PayPal sandbox" : "PayPal offline"}
          </span>
          <span className={ai ? "state state-core" : "state state-dim"} title={ai ? "Claude connected" : "AI conversations are offline"}>
            {ai ? "Claude" : "Claude offline"}
          </span>
        </div>
      </div>
    </header>
  );
}
