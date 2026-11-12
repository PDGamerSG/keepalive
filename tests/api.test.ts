import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_POLICY } from "@/lib/policy";
import { installFakePayPal } from "./fake-paypal";
import { makeSub } from "./helpers";

const originalFetch = globalThis.fetch;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "keepalive-api-"));
let fake: ReturnType<typeof installFakePayPal>;
const request = (data: unknown, method = "POST", headers = {}) => new Request("http://localhost/api/test", {
  method, headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(data),
});

beforeEach(() => {
  vi.resetModules();
  process.env.DATA_DIR = dir;
  process.env.PAYPAL_CLIENT_ID = "fake-client";
  process.env.PAYPAL_CLIENT_SECRET = "fake-secret";
  process.env.PAYPAL_WEBHOOK_ID = "WH-TEST";
  delete process.env.ADMIN_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.VERCEL;
  fs.rmSync(path.join(dir, "store.json"), { force: true });
  fake = installFakePayPal();
});
afterAll(() => { globalThis.fetch = originalFetch; fs.rmSync(dir, { recursive: true, force: true }); });

describe("checkout request validation", () => {
  it.each([null, [], { tier: "standard", name: 42, email: "a@b.com" },
    { tier: "standard", name: "Maya", email: "bad@" },
    { tier: "other", name: "Maya", email: "a@b.com" }])("rejects malformed checkout input: %j", async (data) => {
    const { POST } = await import("@/app/api/subscribe/route");
    const res = await POST(request(data));
    expect(res.status).toBe(400);
    expect(fake.calls).toHaveLength(0);
  });

  it("creates a pending subscription with normalized contact details and an approval link", async () => {
    const { POST } = await import("@/app/api/subscribe/route");
    const res = await POST(request({ tier: "standard", name: " Maya Chen ", email: " maya@example.com ", persona: "regular" }));
    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.approveUrl).toMatch(/^https:\/\/www\.sandbox\.paypal\.com\//);
    const { getSubscriber } = await import("@/lib/store");
    expect(await getSubscriber(result.subscriptionId)).toMatchObject({ name: "Maya Chen", email: "maya@example.com", status: "APPROVAL_PENDING" });
    const sent = fake.calls.find(c => c.path === "/v1/billing/subscriptions")?.body;
    expect(sent).toMatchObject({ subscriber: { email_address: "maya@example.com" } });
  });
});

describe("merchant guardrails", () => {
  it("enforces the admin token before changing policy", async () => {
    process.env.ADMIN_TOKEN = "test-admin";
    const { PUT } = await import("@/app/api/policy/route");
    expect((await PUT(request(DEFAULT_POLICY, "PUT"))).status).toBe(401);
  });
  it("rejects out-of-range limits and leaves the current policy intact", async () => {
    const { PUT, GET } = await import("@/app/api/policy/route");
    expect((await PUT(request({ ...DEFAULT_POLICY, maxPauseMonths: 99 }, "PUT"))).status).toBe(400);
    expect(await (await GET()).json()).toEqual(DEFAULT_POLICY);
  });
  it("persists valid policy changes and writes an audit event", async () => {
    const { PUT, GET } = await import("@/app/api/policy/route");
    expect((await PUT(request({ ...DEFAULT_POLICY, maxDiscountPct: 20 }, "PUT"))).status).toBe(200);
    expect((await (await GET()).json()).maxDiscountPct).toBe(20);
    const { readStore } = await import("@/lib/store");
    expect((await readStore()).events[0].type).toBe("policy.updated");
  });
});

describe("agent and account requests", () => {
  it("rejects an empty agent brief before a run is started", async () => {
    const { POST } = await import("@/app/api/agent-demo/route");
    expect((await POST(request({ subscriptionId: "I-TEST", brief: " " }))).status).toBe(400);
  });
  it("rejects a non-boolean human approval", async () => {
    const { POST } = await import("@/app/api/agent-demo/[runId]/route");
    const res = await POST(request({ approve: "false" }), { params: Promise.resolve({ runId: "unknown" }) });
    expect(res.status).toBe(400);
  });
  it("returns 404 for an unknown agent run", async () => {
    const { GET } = await import("@/app/api/agent-demo/[runId]/route");
    expect((await GET(new Request("http://localhost"), { params: Promise.resolve({ runId: "unknown" }) })).status).toBe(404);
  });
  it("refuses to resume a subscription that is already active", async () => {
    const { upsertSubscriber } = await import("@/lib/store");
    await upsertSubscriber(makeSub());
    const { POST } = await import("@/app/api/account/resume/route");
    expect((await POST(request({ id: "I-TEST" }))).status).toBe(400);
    expect(fake.calls).toHaveLength(0);
  });
});

describe("verified webhook delivery", () => {
  const event = { id: "WH-EVENT-TEST", event_type: "BILLING.SUBSCRIPTION.SUSPENDED", resource: { id: "I-TEST" } };
  async function setup() {
    const { ensureCatalog } = await import("@/lib/paypal/subscriptions");
    const { upsertSubscriber } = await import("@/lib/store");
    const { plans } = await ensureCatalog();
    await upsertSubscriber(makeSub());
    fake.addSub("I-TEST", plans.standard, "SUSPENDED");
    return import("@/app/api/webhooks/paypal/route");
  }
  it("rejects unverified events without changing the subscriber", async () => {
    const { POST } = await setup();
    delete process.env.PAYPAL_WEBHOOK_ID;
    expect((await POST(request(event))).status).toBe(400);
    const { getSubscriber } = await import("@/lib/store");
    expect((await getSubscriber("I-TEST"))?.status).toBe("ACTIVE");
  });
  it("reads the provider state and deduplicates repeat deliveries", async () => {
    const { POST } = await setup();
    expect((await POST(request(event))).status).toBe(200);
    expect(await (await POST(request(event))).json()).toMatchObject({ duplicate: true });
    const { getSubscriber, readStore } = await import("@/lib/store");
    expect((await getSubscriber("I-TEST"))?.status).toBe("SUSPENDED");
    expect((await readStore()).webhookIds).toEqual([event.id]);
  });
  it("lets PayPal retry after a temporary sync failure", async () => {
    const { POST } = await setup();
    const realFake = globalThis.fetch;
    globalThis.fetch = async (input, init) => String(input).includes("/subscriptions/I-TEST")
      ? new Response(JSON.stringify({ message: "temporary failure" }), { status: 503 }) : realFake(input, init);
    expect((await POST(request(event))).status).toBe(503);
    const { readStore, getSubscriber } = await import("@/lib/store");
    expect((await readStore()).webhookIds).not.toContain(event.id);
    globalThis.fetch = realFake;
    expect((await POST(request(event))).status).toBe(200);
    expect((await getSubscriber("I-TEST"))?.status).toBe("SUSPENDED");
  });
});
