import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { AuditEvent, RetentionSession, StoreShape, Subscriber } from "./types";

/**
 * Tiny JSON-file store. Good enough for a hackathon demo: single process,
 * synchronous reads/writes (no interleaving), atomic rename on write.
 * PayPal remains the source of truth for subscription state.
 */

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "store.json");

function empty(): StoreShape {
  return { config: { plans: {} }, subscribers: [], sessions: [], events: [], webhookIds: [] };
}

export function readStore(): StoreShape {
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    return { ...empty(), ...(JSON.parse(raw) as StoreShape) };
  } catch {
    return empty();
  }
}

function writeStore(s: StoreShape) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2));
  fs.renameSync(tmp, FILE);
}

export function updateStore<T>(fn: (s: StoreShape) => T): T {
  const s = readStore();
  const out = fn(s);
  writeStore(s);
  return out;
}

export function recordEvent(e: Omit<AuditEvent, "id" | "at">): AuditEvent {
  const ev: AuditEvent = { id: randomUUID(), at: new Date().toISOString(), ...e };
  updateStore((s) => {
    s.events.unshift(ev);
    if (s.events.length > 500) s.events.length = 500;
  });
  return ev;
}

export function getSubscriber(id: string): Subscriber | undefined {
  return readStore().subscribers.find((x) => x.id === id);
}

export function upsertSubscriber(sub: Subscriber) {
  updateStore((s) => {
    const i = s.subscribers.findIndex((x) => x.id === sub.id);
    if (i >= 0) s.subscribers[i] = { ...s.subscribers[i], ...sub };
    else s.subscribers.unshift(sub);
  });
}

export function patchSubscriber(id: string, patch: Partial<Subscriber>) {
  updateStore((s) => {
    const i = s.subscribers.findIndex((x) => x.id === id);
    if (i >= 0) s.subscribers[i] = { ...s.subscribers[i], ...patch };
  });
}

export function getSession(id: string): RetentionSession | undefined {
  return readStore().sessions.find((x) => x.id === id);
}

export function saveSession(session: RetentionSession) {
  updateStore((s) => {
    const i = s.sessions.findIndex((x) => x.id === session.id);
    if (i >= 0) s.sessions[i] = session;
    else s.sessions.unshift(session);
  });
}
