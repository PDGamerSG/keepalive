import { toOrbitBody } from "@/components/orrery/states";
import { MERCHANT, TIERS } from "@/lib/catalog";
import { paypalConfigured } from "@/lib/paypal/client";
import { readStore } from "@/lib/store";
import { SubscribeForm } from "./subscribe-form";
import "./shop.css";

export default async function Shop({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const { cancelled } = await searchParams;
  // Other subscribers appear only as anonymous dots: no IDs or names leave the server.
  const bodies = (await readStore()).subscribers.map((s, i) => ({ ...toOrbitBody(s), id: `subscriber-${i}` }));
  return (
    <div className="shell shop">
      <SubscribeForm
        tiers={TIERS}
        bodies={bodies}
        checkoutAvailable={paypalConfigured()}
        intro={
          <>
            <p className="page-kicker">{MERCHANT.name}, a demo merchant on PayPal</p>
            <h1 className="display page-title">Fresh-roasted coffee, every month.</h1>
            <p className="lede">
              {MERCHANT.tagline}. Billed monthly with PayPal Subscriptions, and you can cancel at any time in one click.
            </p>
            {cancelled && (
              <p className="shop-flash state state-offer" role="status">
                Checkout was cancelled, so no subscription was created.
              </p>
            )}
          </>
        }
      />
    </div>
  );
}
