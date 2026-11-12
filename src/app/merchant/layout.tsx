import { Suspense } from "react";
import { Sidebar } from "@/components/merchant/shell";
import { aiConfigured } from "@/lib/ai";
import { paypalConfigured } from "@/lib/paypal/client";
import { readStore } from "@/lib/store";
import "./merchant.css";

/** The merchant desk: a sidebar and one page per job. */
export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const store = await readStore();
  return (
    <div className="dash">
      <Suspense>
        <Sidebar
          counts={{ subscribers: store.subscribers.length, conversations: store.sessions.length }}
          paypal={paypalConfigured()}
          ai={aiConfigured()}
        />
      </Suspense>
      <main id="main" className="dash-main">
        <Suspense>{children}</Suspense>
      </main>
    </div>
  );
}
