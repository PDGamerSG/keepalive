import { NextResponse } from "next/server";
import { json } from "@/lib/http";
import { runDueActions } from "@/lib/retention/execute";

export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return json(async () => ({ done: await runDueActions() }));
}
