import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/** Shared Claude client + model choice. */
export const MODEL = process.env.KEEPALIVE_MODEL ?? "claude-opus-5-5";

/** Server-side refusal fallback (routes a refused request to a fallback model automatically). */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
