/** How a subscriber's PayPal status and retention flags read in the interface. */

export type SubscriberState = "active" | "offer" | "pending" | "paused" | "new" | "cancelled";

/** The `.badge-*` colour for a state. The same colour means the same thing on every page. */
export type Tone = "ok" | "paused" | "offer" | "gone" | "pending" | "paypal" | "dim";

export function subscriberState(s: { status: string; discountUntil?: string; pendingRevise?: unknown }): SubscriberState {
  if (s.status === "CANCELLED" || s.status === "EXPIRED") return "cancelled";
  if (s.status === "SUSPENDED") return "paused";
  if (s.status === "APPROVAL_PENDING" || s.status === "APPROVED") return "new";
  if (s.pendingRevise) return "pending";
  if (s.discountUntil) return "offer";
  return "active";
}

export const STATE_LABEL: Record<SubscriberState, string> = {
  active: "Active",
  offer: "On a discount",
  pending: "Switching plan",
  paused: "Paused",
  new: "Awaiting PayPal approval",
  cancelled: "Cancelled",
};

export const STATE_TONE: Record<SubscriberState, Tone> = {
  active: "ok",
  offer: "offer",
  pending: "pending",
  paused: "paused",
  new: "dim",
  cancelled: "gone",
};
