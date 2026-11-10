/** Client-safe shapes returned by the public APIs. */

export interface PublicOffer {
  offer_id: string;
  type: "pause" | "downgrade" | "discount";
  label: string;
  months?: number;
  to_tier?: string;
  discount_pct?: number;
  new_monthly_price_usd: number;
  status: string;
  result?: string;
}

export interface PublicSession {
  session_id: string;
  subscription_id: string;
  outcome: "open" | "saved" | "cancelled" | "abandoned";
  messages: { from: "subscriber" | "keepalive" | "system"; text: string; offer_id?: string }[];
  offers: PublicOffer[];
  cancel_available: boolean;
  paypal_approval_url?: string | null;
}
