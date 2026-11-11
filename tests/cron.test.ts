import { afterEach, expect, it, vi } from "vitest";
const run = vi.hoisted(() => vi.fn(async () => ["resumed I-DUE"]));
vi.mock("@/lib/retention/execute", () => ({ runDueActions: run }));
const { GET } = await import("@/app/api/cron/route");
afterEach(() => { vi.unstubAllEnvs(); run.mockClear(); });

it("rejects unauthenticated scheduler requests without executing payment actions", async () => {
  vi.stubEnv("CRON_SECRET", "scheduled-secret");
  const response = await GET(new Request("https://keepalive.pallabdas.me/api/cron"));
  expect(response.status).toBe(401);
  expect(run).not.toHaveBeenCalled();
});

it("allows the scheduled job with the configured bearer secret", async () => {
  vi.stubEnv("CRON_SECRET", "scheduled-secret");
  const response = await GET(new Request("https://keepalive.pallabdas.me/api/cron", {
    headers: { authorization: "Bearer scheduled-secret" },
  }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ done: ["resumed I-DUE"] });
});
