import { Landing } from "@/components/landing/landing";
import { appUrl } from "@/lib/paypal/subscriptions";

export default function Home() {
  return <Landing mcpUrl={`${appUrl()}/api/mcp`} />;
}
