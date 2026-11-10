import type { Subscriber } from "./types";

/**
 * Demo customer histories. A fresh sandbox subscription always "joined today";
 * these let a judge or demo recorder give the retention agent realistic context
 * (what the merchant would already know from its own systems).
 */
export const PERSONAS = {
  new: { label: "New customer (joined today)", tenureDays: 0, usage: { boxesReceived: 0, skippedLastMonth: false, supportTickets: 0 } },
  regular: { label: "Regular for 6 months", tenureDays: 182, usage: { boxesReceived: 6, skippedLastMonth: false, supportTickets: 0 } },
  loyal_skipping: {
    label: "Loyal for 14 months, skipped last month",
    tenureDays: 425,
    usage: { boxesReceived: 13, skippedLastMonth: true, supportTickets: 0 },
  },
  unhappy: { label: "4 months, 2 support tickets", tenureDays: 120, usage: { boxesReceived: 4, skippedLastMonth: false, supportTickets: 2 } },
} as const;

export type PersonaId = keyof typeof PERSONAS;

export function personaFields(id: string | undefined): Pick<Subscriber, "createdAt" | "usage"> {
  const p = PERSONAS[(id as PersonaId) in PERSONAS ? (id as PersonaId) : "new"];
  return {
    createdAt: new Date(Date.now() - p.tenureDays * 86_400_000).toISOString(),
    usage: { ...p.usage },
  };
}
