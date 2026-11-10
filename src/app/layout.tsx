import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { aiConfigured } from "@/lib/ai";
import { paypalConfigured } from "@/lib/paypal/client";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KeepAlive: AI retention for PayPal subscriptions",
  description:
    "When a subscriber, or their AI agent, tries to cancel, KeepAlive negotiates a fair save inside the merchant's limits and executes it live on PayPal.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const missing = [!paypalConfigured() && "PayPal sandbox keys", !aiConfigured() && "ANTHROPIC_API_KEY"].filter(Boolean);
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line bg-paper/80 backdrop-blur sticky top-0 z-20">
          <nav className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-6 text-sm">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-espresso text-white text-xs">KA</span>
              <span className="font-[family-name:var(--font-display)] text-lg">KeepAlive</span>
            </Link>
            <Link href="/shop" className="text-muted hover:text-foreground">Brewbox shop</Link>
            <Link href="/agent" className="text-muted hover:text-foreground">Agent-to-agent</Link>
            <Link href="/merchant" className="text-muted hover:text-foreground">Merchant dashboard</Link>
            <span className="ml-auto pill bg-crema text-espresso">PayPal sandbox</span>
          </nav>
        </header>
        {missing.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm">
            <div className="mx-auto max-w-6xl px-4 py-2">
              Setup needed: add {missing.join(" and ")} to <code>.env.local</code> (see <code>.env.example</code>), then restart.
            </div>
          </div>
        )}
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line text-xs text-muted">
          <div className="mx-auto max-w-6xl px-4 py-5 flex flex-wrap gap-4 justify-between">
            <span>KeepAlive, built for the PayPal AI Hackathon. Payments run in PayPal sandbox. AI by Claude.</span>
            <span>Brewbox is a fictional demo merchant.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
