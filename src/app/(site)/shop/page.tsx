import { MERCHANT, TIERS } from "@/lib/catalog";
import { paypalConfigured } from "@/lib/paypal/client";
import { SubscribeForm } from "./subscribe-form";
import "./shop.css";

export default async function Shop({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const { cancelled } = await searchParams;
  return (
    <div className="shell">
      <header className="page-head">
        <p className="page-note">{MERCHANT.name}, a demo merchant on PayPal</p>
        <h1 className="display page-title">Fresh-roasted coffee, every month.</h1>
        <p className="lede">
          {MERCHANT.tagline}. Billed monthly with PayPal Subscriptions, and you can cancel at any time in one click.
        </p>
        {cancelled && (
          <p className="notice notice-warn shop-flash" role="status">
            Checkout was cancelled, so no subscription was created.
          </p>
        )}
      </header>
      <SubscribeForm tiers={TIERS} checkoutAvailable={paypalConfigured()} />
    </div>
  );
}
