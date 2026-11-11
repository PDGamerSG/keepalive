import { Fraunces } from "next/font/google";
import { Landing } from "@/components/landing/landing";
import { appUrl } from "@/lib/paypal/subscriptions";

// The landing page sets its headlines in Fraunces with the soft axis turned up,
// so it needs the extra axes the app-wide instance in layout.tsx leaves out.
const display = Fraunces({ subsets: ["latin"], axes: ["SOFT", "opsz"], variable: "--font-ka-display" });

export default function Home() {
  return <Landing fontClass={display.variable} mcpUrl={`${appUrl()}/api/mcp`} />;
}
