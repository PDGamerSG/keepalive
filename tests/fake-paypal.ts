/**
 * Test-only in-memory imitation of the PayPal REST endpoints KeepAlive calls.
 * Lets us test the engine's state machine without network access. Real sandbox
 * behaviour is verified separately (see docs/TESTING.md).
 */

interface FakeSub {
  id: string;
  status: string;
  plan_id: string;
  plan_overridden?: boolean;
  price?: string;
}

export function installFakePayPal() {
  const subs = new Map<string, FakeSub>();
  const calls: { method: string; path: string; body: unknown; requestId?: string | null }[] = [];
  const seenRequestIds = new Map<string, Response>();
  let planCounter = 0;

  const json = (status: number, body?: unknown) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", "paypal-debug-id": "fake-debug" },
    });

  const fake = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = (init?.method ?? "GET").toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body).startsWith("grant") ? "{}" : String(init.body)) : undefined;
    const headers = new Headers(init?.headers);
    const requestId = headers.get("PayPal-Request-Id");
    const path = url.pathname;
    calls.push({ method, path, body, requestId });

    if (path === "/v1/oauth2/token") return json(200, { access_token: "fake-token", expires_in: 32400 });
    if (path === "/v1/catalogs/products" && method === "POST") return json(201, { id: "PROD-FAKE" });
    if (path === "/v1/billing/plans" && method === "POST") return json(201, { id: `P-FAKE-${++planCounter}` });

    const m = path.match(/^\/v1\/billing\/subscriptions\/([^/]+)(?:\/(\w+))?$/);
    if (m) {
      const sub = subs.get(m[1]);
      if (!sub) return json(404, { name: "RESOURCE_NOT_FOUND", message: "not found" });
      const action = m[2];
      if (requestId && seenRequestIds.has(requestId)) return seenRequestIds.get(requestId)!.clone();
      let res: Response;
      if (!action && method === "GET") {
        res = json(200, {
          id: sub.id,
          status: sub.status,
          plan_id: sub.plan_id,
          plan_overridden: sub.plan_overridden ?? false,
          // Real PayPal only includes `plan` when asked with ?fields=plan.
          plan: sub.price && url.searchParams.get("fields")?.includes("plan") ? { billing_cycles: [{ sequence: 1, pricing_scheme: { fixed_price: { value: sub.price } } }] } : undefined,
        });
      } else if (!action && method === "PATCH") {
        const op = (body as { path: string; value: { value: string } }[])[0];
        if (!op.path.includes("pricing_scheme/fixed_price")) return json(422, { name: "UNPROCESSABLE_ENTITY" });
        sub.price = op.value.value;
        sub.plan_overridden = true;
        res = json(204);
      } else if (action === "suspend") {
        if (sub.status !== "ACTIVE") return json(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "SUBSCRIPTION_STATUS_INVALID" }] });
        sub.status = "SUSPENDED";
        res = json(204);
      } else if (action === "activate") {
        if (sub.status !== "SUSPENDED") return json(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "SUBSCRIPTION_STATUS_INVALID" }] });
        sub.status = "ACTIVE";
        res = json(204);
      } else if (action === "cancel") {
        sub.status = "CANCELLED";
        res = json(204);
      } else if (action === "revise") {
        res = json(200, {
          plan_id: (body as { plan_id: string }).plan_id,
          links: [{ rel: "approve", href: `https://www.sandbox.paypal.com/webapps/billing/subscriptions/update?ba_token=FAKE-${sub.id}` }],
        });
      } else {
        return json(404, {});
      }
      if (requestId) seenRequestIds.set(requestId, res.clone());
      return res;
    }
    return json(404, { message: `fake PayPal has no route for ${method} ${path}` });
  };

  globalThis.fetch = fake as typeof fetch;
  return {
    subs,
    calls,
    addSub: (id: string, plan_id: string, status = "ACTIVE") => subs.set(id, { id, status, plan_id }),
    /** Simulate the subscriber approving a revise inside PayPal. */
    approveRevise: (id: string, plan_id: string) => {
      const s = subs.get(id)!;
      s.plan_id = plan_id;
    },
  };
}
