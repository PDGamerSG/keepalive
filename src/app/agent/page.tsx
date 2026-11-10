import { tier } from "@/lib/catalog";
import { appUrl } from "@/lib/paypal/subscriptions";
import { readStore } from "@/lib/store";
import { AgentDemo } from "./agent-demo";

export default function AgentPage() {
  const subs = readStore()
    .subscribers.filter((s) => s.status === "ACTIVE")
    .map((s) => ({ id: s.id, label: `${s.name} · ${tier(s.tier).name} $${s.priceUsd}/mo`, email: s.email }));
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="pill bg-save-soft text-save">Agentic commerce</p>
      <h1 className="font-[family-name:var(--font-display)] text-4xl mt-3">When the customer&apos;s AI calls to cancel</h1>
      <p className="mt-2 text-muted max-w-3xl">
        On the left, <b>Claude acts for the subscriber</b> with a plain-language brief. On the right, <b>KeepAlive answers for
        the merchant</b>. They talk through the same tools KeepAlive exposes over MCP. The subscriber&apos;s agent must get its
        human&apos;s approval before accepting anything, and every accepted offer is executed on PayPal.
      </p>
      <AgentDemo subscribers={subs} mcpUrl={`${appUrl()}/api/mcp`} />
    </div>
  );
}
