import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, expect, it } from "vitest";
import { makeSub } from "./helpers";
import type { Offer } from "@/lib/types";

// The instant demo must never reach PayPal: no credentials and no network.
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "keepalive-sim-"));
process.env.DATA_DIR = dataDir;
delete process.env.PAYPAL_CLIENT_ID;
delete process.env.PAYPAL_CLIENT_SECRET;
delete process.env.BLOB_READ_WRITE_TOKEN;
const originalFetch = globalThis.fetch;
globalThis.fetch = (() => {
  throw new Error("the instant demo must not call the network");
}) as typeof fetch;
afterAll(() => {
  globalThis.fetch = originalFetch;
  fs.rmSync(dataDir, { recursive: true, force: true });
});

const store = await import("@/lib/store");
const sim = await import("@/lib/paypal/simulator");
const execute = await import("@/lib/retention/execute");
const { PayPalError } = await import("@/lib/paypal/client");

const offer = (over: Partial<Offer>): Offer => ({
  id: `O-${Math.random().toString(36).slice(2, 8)}`,
  type: "pause",
  label: "test offer",
  mrrKeptUsd: 0,
  guardrailNotes: [],
  status: "accepted",
  ...over,
});

it("runs a whole instant-demo subscription on the simulator, with PayPal's state rules", async () => {
  const { id, approveUrl } = await sim.createSimulatedSubscription("standard");
  expect(id).toMatch(/^I-DEMO/);
  expect(approveUrl).toBe(`/demo-paypal/approve?subscription_id=${id}`);
  await store.upsertSubscriber(makeSub({ id, status: "APPROVAL_PENDING" }));

  // Checkout: the buyer approves on the simulated PayPal step.
  expect(await sim.approveSimulated(id)).toBe("subscription");
  let sub = await execute.syncSubscriber(id);
  expect(sub).toMatchObject({ status: "ACTIVE", tier: "standard", priceUsd: 22 });

  // Pause, then resume.
  expect((await execute.executeOffer(sub!, offer({ type: "pause", months: 2 }))).status).toBe("executed");
  expect((await store.getSubscriber(id))?.status).toBe("SUSPENDED");
  sub = await execute.resumeNow(id);
  expect(sub?.status).toBe("ACTIVE");

  // A 30% discount is read back from the simulator before it counts.
  const discount = await execute.executeOffer(sub!, offer({ type: "discount", discountPct: 30, months: 3 }));
  expect(discount.status).toBe("executed");
  expect((await store.getSubscriber(id))?.priceUsd).toBe(15.4);

  // A plan switch waits for the buyer's approval, like PayPal's revise.
  const revise = await execute.executeOffer((await store.getSubscriber(id))!, offer({ type: "downgrade", toTier: "lite" }));
  expect(revise).toMatchObject({ status: "awaiting_paypal_approval", approveUrl: `/demo-paypal/approve?subscription_id=${id}` });
  expect((await execute.syncSubscriber(id))?.tier).toBe("standard");
  expect(await sim.approveSimulated(id)).toBe("revise");
  expect((await execute.syncSubscriber(id))?.tier).toBe("lite");

  // Cancel, and PayPal's rules still apply afterwards.
  const cancel = await execute.executeCancel((await store.getSubscriber(id))!, "test", `cancel-${id}`);
  expect(cancel.status).toBe("executed");
  expect((await store.getSubscriber(id))?.status).toBe("CANCELLED");
  await expect(execute.executeOffer((await store.getSubscriber(id))!, offer({ type: "pause", months: 1 }))).rejects.toBeInstanceOf(PayPalError);

  // Every call is in the audit log, marked as simulated.
  const calls = (await store.readStore()).events.filter((e) => e.subscriptionId === id && e.type === "paypal.call");
  expect(calls.length).toBeGreaterThanOrEqual(7);
  expect(calls.every((e) => e.summary.endsWith("(simulated PayPal)"))).toBe(true);
});

it("leaves a subscription unchanged when the buyer cancels on the simulated step", async () => {
  const { id } = await sim.createSimulatedSubscription("lite");
  expect(await sim.declineSimulated(id)).toBe("subscription");
  expect((await sim.getSimulated(id))?.status).toBe("APPROVAL_PENDING");
  await expect(sim.approveSimulated("I-DEMOMISSING")).rejects.toBeInstanceOf(PayPalError);
});
