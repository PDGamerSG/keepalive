import { tier } from "@/lib/catalog";
import { appUrl } from "@/lib/paypal/subscriptions";
import { readStore } from "@/lib/store";
import { AgentDemo } from "./agent-demo";
import { paypalConfigured } from "@/lib/paypal/client";
import { aiConfigured } from "@/lib/ai";

export default async function AgentPage() {
  const subs = (await readStore())
    .subscribers.filter((s) => s.status === "ACTIVE")
    .map((s) => ({ id: s.id, label: `${s.name} · ${tier(s.tier).name} $${s.priceUsd}/mo`, email: s.email }));
  return (
    <div className="workspace">
      <div className="page-heading"><div>
        <h1>Your agent. Your decision.</h1>
        <p>Give Claude a brief to negotiate with KeepAlive on your behalf. It will ask you before accepting an offer. PayPal confirms the final change.</p>
      </div></div>
      <AgentDemo subscribers={subs} mcpUrl={`${appUrl()}/api/mcp`} available={paypalConfigured() && aiConfigured()} />
    </div>
  );
}
