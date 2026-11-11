import { SiteHeader } from "@/components/site/header";
import { aiConfigured } from "@/lib/ai";
import { paypalConfigured } from "@/lib/paypal/client";

/** The public pages: the overview, the Brewbox shop, a subscriber's account and the agent demo. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const paypal = paypalConfigured();
  const ai = aiConfigured();
  return (
    <>
      <SiteHeader paypal={paypal} ai={ai} />
      {(!paypal || !ai) && (
        <div className="site-notice" role="status">
          <div className="shell">
            {!paypal && "PayPal checkout is offline, so new subscriptions can't be created. "}
            {!ai && "AI conversations are offline. "}
            Everything else in the demo still works.
          </div>
        </div>
      )}
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="site-footer">
        <div className="shell site-footer-row">
          <span>Built for the PayPal AI Hackathon. Payments run in the PayPal sandbox. AI by Claude.</span>
          <span>Brewbox is a fictional demo merchant.</span>
        </div>
      </footer>
    </>
  );
}
