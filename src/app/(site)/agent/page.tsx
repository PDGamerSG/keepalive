import { tier } from "@/lib/catalog";
import { appUrl } from "@/lib/paypal/subscriptions";
import { readStore } from "@/lib/store";
import { AgentDemo } from "./agent-demo";
import "./agent.css";

export default async function AgentPage() {
  const subs = (await readStore()).subscribers
    .filter((s) => s.status === "ACTIVE")
    .map((s) => ({ id: s.id, label: `${s.name}, ${tier(s.tier).name} at $${s.priceUsd} a month`, email: s.email }));
  return (
    <div className="shell">
      <header className="page-head">
        <h1 className="display page-title">When the customer&apos;s AI calls to cancel</h1>
        <p className="lede">
          Claude acts for the subscriber from a plain-language brief. KeepAlive answers for the merchant. They talk through
          the same tools KeepAlive exposes over MCP. The subscriber&apos;s agent must get its human&apos;s approval before it
          accepts anything, and every accepted offer is carried out on PayPal.
        </p>
      </header>
      <AgentDemo subscribers={subs} mcpUrl={`${appUrl()}/api/mcp`} />
    </div>
  );
}
