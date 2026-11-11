import type { Tone } from "@/lib/subscriber-state";

/** Words and colours the merchant desk uses for stored values. */

export const REASON_LABEL: Record<string, string> = {
  too_expensive: "Too expensive",
  not_using_enough: "Not using enough",
  temporary_break: "Temporary break or travel",
  product_issue: "Product issue",
  switching_competitor: "Switching to a competitor",
  moving_or_life_change: "Moving or life change",
  other: "Other",
};

export const OUTCOME_TONE: Record<string, Tone> = { saved: "ok", cancelled: "gone", open: "pending", abandoned: "dim" };
export const OUTCOME_LABEL: Record<string, string> = { saved: "Saved", cancelled: "Cancelled", open: "Open", abandoned: "Abandoned" };

export const planName = (tier: string) => tier.charAt(0).toUpperCase() + tier.slice(1);

/** The colour of an audit event, from its type. */
export function eventTone(type: string): Tone {
  if (type.startsWith("paypal")) return "paypal";
  if (type.startsWith("guardrail")) return "offer";
  return "dim";
}
