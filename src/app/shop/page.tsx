import { MERCHANT, TIERS } from "@/lib/catalog";
import { SubscribeForm } from "./subscribe-form";

export default async function Shop({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const { cancelled } = await searchParams;
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="text-center">
        <p className="text-sm text-muted">Demo merchant</p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl mt-1">☕ {MERCHANT.name}</h1>
        <p className="mt-3 text-muted">{MERCHANT.tagline}. Billed monthly with PayPal.</p>
        {cancelled && <p className="mt-4 pill bg-amber-100 text-amber-900">Checkout cancelled: no subscription was created.</p>}
      </div>
      <SubscribeForm tiers={TIERS} />
      <p className="mt-8 text-center text-xs text-muted">
        Sandbox only: approve with your PayPal <b>sandbox personal</b> account. No real money moves.
      </p>
    </div>
  );
}
