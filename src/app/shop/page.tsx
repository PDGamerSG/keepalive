import { MERCHANT, TIERS } from "@/lib/catalog";
import { paypalConfigured } from "@/lib/paypal/client";
import { SubscribeForm } from "./subscribe-form";

export default async function Shop({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const { cancelled } = await searchParams;
  return (
    <div className="workspace max-w-5xl">
      <div className="page-heading">
        <div><h1>{MERCHANT.name}</h1>
        <p>{MERCHANT.tagline}. Choose your monthly ritual, billed with PayPal.</p></div>
        <span className="pill bg-save-soft text-save">Pause or cancel anytime</span>
      </div>
      {cancelled && <p role="status" className="notice mt-4">Checkout cancelled. No new subscription was approved.</p>}
      <SubscribeForm tiers={TIERS} checkoutAvailable={paypalConfigured()} />
      <p className="mt-8 text-center text-xs text-muted">
        Sandbox only: approve with your PayPal <b>sandbox personal</b> account. No real money moves.
      </p>
    </div>
  );
}
