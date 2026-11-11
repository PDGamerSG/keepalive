/** How subscribers appear on the orrery. Kept free of three.js so pages can import it cheaply. */

export type Tier = "lite" | "standard" | "premium";
export type BodyState = "active" | "offer" | "pending" | "paused" | "new" | "cancelled";

export interface OrbitBody {
  id: string;
  tier: Tier;
  state: BodyState;
  priceUsd: number;
}

/** The one body the page is about: the visitor in the shop, or the subscriber on their account page. */
export interface FocusBody {
  tier: Tier;
  state: BodyState;
}

export function bodyState(s: { status: string; discountUntil?: string; pendingRevise?: unknown }): BodyState {
  if (s.status === "CANCELLED" || s.status === "EXPIRED") return "cancelled";
  if (s.status === "SUSPENDED") return "paused";
  if (s.status === "APPROVAL_PENDING" || s.status === "APPROVED") return "new";
  if (s.pendingRevise) return "pending";
  if (s.discountUntil) return "offer";
  return "active";
}

export const STATE_LABEL: Record<BodyState, string> = {
  active: "Active",
  offer: "On a discount",
  pending: "Switching plan",
  paused: "Paused",
  new: "Awaiting PayPal approval",
  cancelled: "Cancelled",
};

/** The `.state-*` class for each state's colour. */
export const STATE_TONE: Record<BodyState, string> = {
  active: "orbit",
  offer: "offer",
  pending: "core",
  paused: "stasis",
  new: "dim",
  cancelled: "exit",
};

export function toOrbitBody(s: {
  id: string;
  tier: Tier;
  status: string;
  priceUsd: number;
  discountUntil?: string;
  pendingRevise?: unknown;
}): OrbitBody {
  return { id: s.id, tier: s.tier, state: bodyState(s), priceUsd: s.priceUsd };
}
