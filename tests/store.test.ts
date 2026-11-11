import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeSub } from "./helpers";

// The provider is external; emulate its ETag contract, keeping the store real.
const remote = vi.hoisted(() => ({ text: undefined as string | undefined, version: 0, fail: false }));
vi.mock("@vercel/blob", () => {
  class BlobPreconditionFailedError extends Error {}
  return {
    BlobPreconditionFailedError,
    get: async (_path: string, options: { access: string; useCache: boolean }) => {
      if (remote.fail) throw new Error("storage unavailable");
      if (options.access !== "private" || options.useCache !== false) throw new Error("unsafe read");
      if (remote.text === undefined) return null;
      const text = remote.text;
      const etag = String(remote.version);
      return { statusCode: 200, stream: new Response(text).body, blob: { etag } };
    },
    put: async (_path: string, text: string, options: { access: string; ifMatch?: string; allowOverwrite?: boolean; addRandomSuffix: boolean }) => {
      if (options.access !== "private" || options.addRandomSuffix !== false) throw new Error("unsafe write");
      if (options.ifMatch ? options.ifMatch !== String(remote.version) : remote.text !== undefined && !options.allowOverwrite) {
        throw new BlobPreconditionFailedError("concurrent write");
      }
      remote.text = text;
      remote.version++;
      return { etag: String(remote.version) };
    },
  };
});

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-storage-token");
  remote.text = undefined;
  remote.version = 0;
  remote.fail = false;
});
afterEach(() => vi.unstubAllEnvs());

describe("durable serverless storage", () => {
  it("a fresh function instance can read a subscriber saved by another instance", async () => {
    const first = await import("@/lib/store");
    await first.upsertSubscriber(makeSub({ id: "I-DURABLE" }));
    vi.resetModules();
    const next = await import("@/lib/store");
    expect((await next.getSubscriber("I-DURABLE"))?.email).toBe("maya@example.com");
    expect(JSON.parse(remote.text!).subscribers[0].id).toBe("I-DURABLE");
  });

  it("concurrent requests preserve both subscriber updates", async () => {
    const store = await import("@/lib/store");
    await Promise.all([
      store.upsertSubscriber(makeSub({ id: "I-FIRST" })),
      store.upsertSubscriber(makeSub({ id: "I-SECOND" })),
    ]);
    expect((await store.readStore()).subscribers.map((s) => s.id).sort()).toEqual(["I-FIRST", "I-SECOND"]);
  });

  it("a storage outage cannot silently replace existing data with an empty store", async () => {
    const store = await import("@/lib/store");
    await store.upsertSubscriber(makeSub());
    remote.fail = true;
    await expect(store.upsertSubscriber(makeSub({ id: "I-OTHER" }))).rejects.toThrow("storage unavailable");
    expect(JSON.parse(remote.text!).subscribers.map((s: { id: string }) => s.id)).toEqual(["I-TEST"]);
  });

  it("refuses ephemeral filesystem storage on Vercel when storage credentials are missing", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("VERCEL", "1");
    const store = await import("@/lib/store");
    await expect(store.readStore()).rejects.toThrow(/BLOB_READ_WRITE_TOKEN/);
  });
});
