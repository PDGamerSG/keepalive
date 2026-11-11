import { NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/paypal/webhooks";
import { getSubscriber, readStore, recordEvent, updateStore } from "@/lib/store";
import { syncSubscriber } from "@/lib/retention/execute";

interface WebhookEvent {
  id: string;
  event_type: string;
  summary?: string;
  resource?: { id?: string; billing_agreement_id?: string };
}

/**
 * PayPal webhooks. Unverified events are stored as untrusted and ignored.
 * Only verified events (deduped by event id) trigger a re-read of the subscription from PayPal.
 */
export async function POST(req: Request) {
  const event = (await req.json().catch(() => null)) as WebhookEvent | null;
  if (!event?.id || !event.event_type) return NextResponse.json({ error: "bad event" }, { status: 400 });

  let verified = false;
  try {
    verified = await verifyWebhook(req.headers, event);
  } catch {
    verified = false;
  }
  if (!verified) {
    await recordEvent({ type: "webhook.unverified", summary: `${event.event_type} (ignored: signature not verified)` });
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if ((await readStore()).webhookIds.includes(event.id)) return NextResponse.json({ ok: true, duplicate: true });
  await updateStore((s) => {
    s.webhookIds.unshift(event.id);
    s.webhookIds.length = Math.min(s.webhookIds.length, 1000);
  });

  const subId = event.event_type.startsWith("BILLING.SUBSCRIPTION")
    ? event.resource?.id
    : event.resource?.billing_agreement_id;
  await recordEvent({ type: "webhook", subscriptionId: subId, summary: `${event.event_type}${event.summary ? `: ${event.summary}` : ""}` });
  if (subId && (await getSubscriber(subId))) {
    try {
      await syncSubscriber(subId);
    } catch (e) {
      await recordEvent({ type: "webhook.sync_error", subscriptionId: subId, summary: String(e) });
    }
  }
  return NextResponse.json({ ok: true });
}
