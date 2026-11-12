import { MERCHANT, TIERS } from "@/lib/catalog";
import { paypalConfigured } from "@/lib/paypal/client";
import type { DemoBuyer } from "./demo-checkout";
import { SubscribeForm } from "./subscribe-form";
import "./shop.css";

/** The shared PayPal sandbox test buyer shown on the page, when the deployment sets one. */
function demoBuyer(): DemoBuyer | null {
  const email = process.env.DEMO_BUYER_EMAIL;
  const password = process.env.DEMO_BUYER_PASSWORD;
  return email && password ? { email, password } : null;
}

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
      <SubscribeForm tiers={TIERS} checkoutAvailable={paypalConfigured()} demoBuyer={demoBuyer()} />
    </div>
  );
}
