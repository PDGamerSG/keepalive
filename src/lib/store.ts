import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { BlobError, BlobNotFoundError, BlobPreconditionFailedError, get, head, put } from "@vercel/blob";
import type { AuditEvent, RetentionSession, StoreShape, Subscriber } from "./types";

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "store.json");
const BLOB_PATH = "keepalive/store.json";

function empty(): StoreShape {
  return { config: { plans: {} }, subscribers: [], sessions: [], events: [], webhookIds: [], agentRuns: {} };
}

function blobConfigured(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  if (process.env.VERCEL) throw new Error("Set BLOB_READ_WRITE_TOKEN: Vercel requires durable private storage.");
  return false;
}

function readFileStore(): StoreShape {
  try {
    return { ...empty(), ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return empty();
    throw error;
  }
}

async function readBlob() {
  // Conditional writes need the ETag from the Blob API (head). The ETag header on the
  // content download is not accepted by put({ ifMatch }), so every write would fail.
  // Read the ETag before the content: a write that lands in between makes the
  // conditional put fail and retry instead of overwriting newer data.
  let etag: string;
  try {
    etag = (await head(BLOB_PATH)).etag;
  } catch (error) {
    if (error instanceof BlobNotFoundError) return { store: empty(), etag: undefined };
    throw error;
  }
  // Read origin storage directly: checkout and approval must see the latest state.
  const result = await get(BLOB_PATH, { access: "private", useCache: false });
  if (!result) return { store: empty(), etag: undefined };
  if (result.statusCode !== 200) throw new Error("Unexpected storage response");
  return {
    store: { ...empty(), ...await new Response(result.stream).json() } as StoreShape,
    etag,
  };
}

export async function readStore(): Promise<StoreShape> {
  return blobConfigured() ? (await readBlob()).store : readFileStore();
}

/** Callbacks only mutate data: a concurrent remote write may require replay. */
export async function updateStore<T>(fn: (s: StoreShape) => T): Promise<T> {
  if (!blobConfigured()) {
    // Keep local read/modify/write synchronous to avoid interleaving in one process.
    const store = readFileStore();
    const result = fn(store);
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${FILE}.${randomUUID()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
    fs.renameSync(tmp, FILE);
    return result;
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    const { store, etag } = await readBlob();
    const result = fn(store);
    try {
      await put(BLOB_PATH, JSON.stringify(store), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: Boolean(etag),
        ...(etag ? { ifMatch: etag } : {}),
        contentType: "application/json",
      });
      return result;
    } catch (error) {
      const conflict = error instanceof BlobPreconditionFailedError ||
        (!etag && error instanceof BlobError && /already exists/i.test(error.message));
      if (!conflict || attempt === 7) throw error;
    }
  }
  throw new Error("Storage update could not be committed");
}

export async function recordEvent(e: Omit<AuditEvent, "id" | "at">): Promise<AuditEvent> {
  const ev: AuditEvent = { id: randomUUID(), at: new Date().toISOString(), ...e };
  await updateStore((s) => {
    s.events.unshift(ev);
    if (s.events.length > 500) s.events.length = 500;
  });
  return ev;
}

export async function getSubscriber(id: string): Promise<Subscriber | undefined> {
  return (await readStore()).subscribers.find((x) => x.id === id);
}

export async function upsertSubscriber(sub: Subscriber) {
  await updateStore((s) => {
    const i = s.subscribers.findIndex((x) => x.id === sub.id);
    if (i >= 0) s.subscribers[i] = { ...s.subscribers[i], ...sub };
    else s.subscribers.unshift(sub);
  });
}

export async function patchSubscriber(id: string, patch: Partial<Subscriber>) {
  await updateStore((s) => {
    const i = s.subscribers.findIndex((x) => x.id === id);
    if (i >= 0) s.subscribers[i] = { ...s.subscribers[i], ...patch };
  });
}

export async function getSession(id: string): Promise<RetentionSession | undefined> {
  return (await readStore()).sessions.find((x) => x.id === id);
}

export async function saveSession(session: RetentionSession) {
  await updateStore((s) => {
    const i = s.sessions.findIndex((x) => x.id === session.id);
    if (i >= 0) s.sessions[i] = session;
    else s.sessions.unshift(session);
  });
}
