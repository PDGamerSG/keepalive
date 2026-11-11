import type { Metadata } from "next";
import { Anybody, Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site/header";
import { aiConfigured } from "@/lib/ai";
import { paypalConfigured } from "@/lib/paypal/client";
import "./globals.css";
import "./site.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Anybody's width axis lets headlines run wide, like the engraving on an instrument.
const anybody = Anybody({ variable: "--font-anybody", subsets: ["latin"], axes: ["wdth"] });

export const metadata: Metadata = {
  title: "KeepAlive: AI retention for PayPal subscriptions",
  description:
    "When a subscriber, or their AI agent, tries to cancel, KeepAlive negotiates a fair save inside the merchant's limits and executes it live on PayPal.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const paypal = paypalConfigured();
  const ai = aiConfigured();
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${anybody.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
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
      </body>
    </html>
  );
}
