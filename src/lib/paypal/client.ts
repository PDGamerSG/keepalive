import "server-only";
import { randomUUID } from "node:crypto";
import { recordEvent } from "@/lib/store";

/**
 * Minimal PayPal REST client (sandbox by default).
 * - Caches the OAuth2 client-credentials token until shortly before expiry.
 * - Sends a PayPal-Request-Id on every mutating call so retries are idempotent.
 * - Logs every call (method, path, status, debug_id) into the audit log so the
 *   merchant dashboard can show exactly what happened on PayPal.
 */

export const PAYPAL_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export class PayPalError extends Error {
  constructor(
    message: string,
    public status: number,
    public debugId: string | undefined,
    public details: unknown,
  ) {
    super(message);
    this.name = "PayPalError";
  }
}

export function paypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) {
    throw new PayPalError(
      "PayPal is not configured: set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env.local",
      500,
      undefined,
      null,
    );
  }
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new PayPalError(
      `PayPal OAuth failed (${res.status}): ${body.error_description ?? body.error ?? "unknown"}`,
      res.status,
      res.headers.get("paypal-debug-id") ?? undefined,
      body,
    );
  }
  cachedToken = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return cachedToken.value;
}

export interface PayPalRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Stable idempotency key; a random one is generated for mutating calls when omitted. */
  requestId?: string;
  /** Subscription the call relates to (for the audit log). */
  subscriptionId?: string;
  /** Short human label for the audit log, e.g. "suspend subscription". */
  label?: string;
  prefer?: "return=representation" | "return=minimal";
}

export async function paypal<T = unknown>(path: string, opts: PayPalRequestOptions = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (method !== "GET") headers["PayPal-Request-Id"] = opts.requestId ?? randomUUID();
  if (opts.prefer) headers["Prefer"] = opts.prefer;

  const res = await fetch(`${PAYPAL_BASE}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: "no-store",
  });
  const debugId = res.headers.get("paypal-debug-id") ?? undefined;
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (method !== "GET" || !res.ok) {
    await recordEvent({
      type: "paypal.call",
      subscriptionId: opts.subscriptionId,
      summary: `${opts.label ?? `${method} ${path}`} → ${res.status}`,
      detail: { method, path, status: res.status, debugId, request: opts.body ?? null },
    });
  }

  if (!res.ok) {
    const d = data as { message?: string; details?: { issue?: string; description?: string }[] } | null;
    const issue = d?.details?.[0];
    throw new PayPalError(
      `PayPal ${method} ${path} failed (${res.status}): ${issue?.issue ?? d?.message ?? "error"}${
        issue?.description ? ` – ${issue.description}` : ""
      }`,
      res.status,
      debugId,
      data,
    );
  }
  return data as T;
}
