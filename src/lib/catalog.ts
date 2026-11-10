import type { TierId } from "./types";

/** Demo merchant: Brewbox, a specialty-coffee subscription billed through PayPal. */
export const MERCHANT = {
  name: "Brewbox",
  tagline: "Fresh-roasted specialty coffee, delivered monthly",
  productName: "Brewbox Coffee Subscription",
};

export interface Tier {
  id: TierId;
  name: string;
  priceUsd: number;
  description: string;
  perks: string[];
}

export const TIERS: Tier[] = [
  {
    id: "lite",
    name: "Lite",
    priceUsd: 12,
    description: "One 250g bag a month",
    perks: ["1 bag / month", "Roaster's choice"],
  },
  {
    id: "standard",
    name: "Standard",
    priceUsd: 22,
    description: "Two 250g bags a month",
    perks: ["2 bags / month", "Pick your roast level", "Free shipping"],
  },
  {
    id: "premium",
    name: "Premium",
    priceUsd: 36,
    description: "Three bags plus a rare micro-lot",
    perks: ["3 bags / month", "Monthly rare micro-lot", "Free shipping", "Brew guides"],
  },
];

export const TIER_ORDER: TierId[] = ["lite", "standard", "premium"];

export function tier(id: TierId): Tier {
  const t = TIERS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown tier ${id}`);
  return t;
}

export function cheaperTiers(id: TierId): Tier[] {
  const idx = TIER_ORDER.indexOf(id);
  return TIER_ORDER.slice(0, idx).map(tier);
}
