"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Chat, Gauge, Mark, People, Pulse, Refresh, Sliders } from "@/components/ui/icons";
import { adminAction } from "./admin";

const NAV: { href: string; label: string; icon: ReactNode; count?: "subscribers" | "conversations" }[] = [
  { href: "/merchant", label: "Overview", icon: <Gauge /> },
  { href: "/merchant/subscribers", label: "Subscribers", icon: <People />, count: "subscribers" },
  { href: "/merchant/conversations", label: "Conversations", icon: <Chat />, count: "conversations" },
  { href: "/merchant/activity", label: "PayPal activity", icon: <Pulse /> },
  { href: "/merchant/guardrails", label: "Guardrails", icon: <Sliders /> },
];

/** A link inside the desk. It carries the admin token along when the URL has one. */
export function DeskLink({ href, className, children, ...rest }: { href: string; className?: string; children: ReactNode; "aria-current"?: "page" }) {
  const token = useSearchParams().get("token");
  return (
    <Link href={token ? `${href}?token=${encodeURIComponent(token)}` : href} className={className} {...rest}>
      {children}
    </Link>
  );
}

export function Sidebar(props: { counts: { subscribers: number; conversations: number }; paypal: boolean; ai: boolean }) {
  const path = usePathname();
  return (
    <aside className="dash-side">
      <Link href="/" className="dash-brand" aria-label="KeepAlive home">
        <Mark size={24} />
        <span className="display">KeepAlive</span>
      </Link>

      <div className="dash-merchant">
        <span className="dash-avatar" aria-hidden="true">
          B
        </span>
        <span>
          <b>Brewbox</b>
          <small>Demo merchant</small>
        </span>
      </div>

      <nav className="dash-nav" aria-label="Merchant desk">
        {NAV.map((item) => (
          <DeskLink key={item.href} href={item.href} aria-current={path === item.href ? "page" : undefined}>
            {item.icon}
            <span>{item.label}</span>
            {item.count && <b className="num">{props.counts[item.count]}</b>}
          </DeskLink>
        ))}
      </nav>

      <div className="dash-side-foot">
        <p className="dash-conn">
          <span className={props.paypal ? "live-dot" : "dash-off-dot"} />
          {props.paypal ? "PayPal sandbox connected" : "PayPal is offline"}
        </p>
        <p className="dash-conn">
          <span className={props.ai ? "live-dot" : "dash-off-dot"} />
          {props.ai ? "Claude connected" : "Claude is offline"}
        </p>
        <Link href="/" className="dash-back">
          Back to the site
        </Link>
      </div>
    </aside>
  );
}

/** The title row of a desk page, with its actions on the right. */
export function PageHead({ title, note, children }: { title: string; note?: string; children?: ReactNode }) {
  return (
    <header className="dash-head">
      <div>
        <h1 className="display">{title}</h1>
        {note && <p>{note}</p>}
      </div>
      {children}
    </header>
  );
}

/** Re-read every subscription from PayPal, and create the plans the first time. */
export function SyncActions({ needsSetup }: { needsSetup: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function act(label: string, done: string, payload: unknown) {
    setBusy(label);
    setMsg(null);
    try {
      await adminAction(payload);
      setMsg({ text: done, ok: true });
      router.refresh();
    } catch (e) {
      setMsg({ text: `${label} failed: ${e instanceof Error ? e.message : e}`, ok: false });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="dash-actions">
      <div>
        {needsSetup && (
          <button
            className="btn btn-paypal"
            disabled={!!busy}
            onClick={() => act("Set up PayPal plans", "PayPal product and three plans created.", { action: "setup" })}
          >
            {busy === "Set up PayPal plans" ? "Setting up…" : "Set up PayPal plans"}
          </button>
        )}
        <button
          className="btn btn-line"
          disabled={!!busy}
          onClick={() => act("Sync with PayPal", "Every subscription re-read from PayPal.", { action: "sync-all" })}
        >
          <Refresh />
          {busy === "Sync with PayPal" ? "Syncing…" : "Sync with PayPal"}
        </button>
      </div>
      {msg && (
        <p className={`notice ${msg.ok ? "notice-ok" : "notice-error"}`} role="status">
          {msg.text}
        </p>
      )}
    </div>
  );
}
