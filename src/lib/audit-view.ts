import type { AuditEvent } from "./types";

/**
 * Audit events as the merchant desk shows them.
 *
 * AI usage events saved before 2026-11-12 put the model ID in the summary
 * ("consumer: <model>, 1470 cached input tokens") and the detail. The desk
 * does not name the model, so strip it here, before the events reach a page.
 */
export function viewEvents(events: AuditEvent[]): AuditEvent[] {
  return events.map((event) => {
    if (event.type !== "ai.usage") return event;
    const detail =
      event.detail && typeof event.detail === "object"
        ? Object.fromEntries(Object.entries(event.detail).filter(([key]) => key !== "model"))
        : event.detail;
    return { ...event, summary: event.summary.replace(/^(\w+): [^,]+, /, "$1: "), detail };
  });
}
