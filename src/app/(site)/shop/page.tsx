import { MERCHANT, TIERS } from "@/lib/catalog";
import { paypalConfigured } from "@/lib/paypal/client";
import type { DemoBuyer } from "./demo-checkout";
import { SubscribeForm } from "./subscribe-form";
import "./shop.css";

/**
 * The shared PayPal sandbox test buyer shown on the page, when the deployment sets one.
 * Only a real sandbox address (…@personal.example.com) is shown, never a leftover placeholder.
 */
function demoBuyer(): DemoBuyer | null {
  const email = process.env.DEMO_BUYER_EMAIL?.trim();
  const password = process.env.DEMO_BUYER_PASSWORD?.trim();
  if (!email || !password) return null;
  const sandboxAddress = /^[^\s@]+@(personal|business)\.example\.com$/i.test(email);
  const placeholder = /x{3,}@|^(REAL|PASTE)_|_HERE$|^PASSWORD/i;
  if (!sandboxAddress || placeholder.test(email) || placeholder.test(password)) return null;
  return { email, password };
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
