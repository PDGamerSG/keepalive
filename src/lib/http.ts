import "server-only";
import { NextResponse } from "next/server";
import { PayPalError } from "@/lib/paypal/client";
import { RetentionError } from "@/lib/retention/engine";

/** Wrap a route handler body: JSON responses + consistent error mapping. */
export async function json<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    return NextResponse.json(await fn());
  } catch (e) {
    if (e instanceof RetentionError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof PayPalError) {
      return NextResponse.json({ error: e.message, paypalDebugId: e.debugId }, { status: e.status >= 500 ? 502 : e.status });
    }
    const message = e instanceof Error ? e.message : String(e);
    console.error(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

/** Optional admin protection for merchant-only endpoints on public deployments. */
export function assertAdmin(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return;
  const got = req.headers.get("x-admin-token") ?? new URL(req.url).searchParams.get("token");
  if (got !== token) throw new RetentionError("Admin token required", 401);
}
