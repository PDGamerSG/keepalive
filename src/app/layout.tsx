import type { Metadata } from "next";
import { Cal_Sans, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const calSans = Cal_Sans({ variable: "--font-cal", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "KeepAlive: AI retention for PayPal subscriptions",
  description:
    "When a subscriber, or their AI agent, tries to cancel, KeepAlive negotiates a fair save inside the merchant's limits and executes it live on PayPal.",
};

export const dynamic = "force-dynamic";

/** Fonts and global styles only. The site and the merchant desk each bring their own frame. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} ${calSans.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
