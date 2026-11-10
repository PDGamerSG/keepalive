import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/** Shared Claude client + model choice. */
export const MODEL = process.env.KEEPALIVE_MODEL ?? "claude-opus-5-5";

/** Server-side refusal fallback (routes a refused request to a fallback model automatically). */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!client) {
    // Use only ANTHROPIC_API_KEY. Pin the base URL and ignore ANTHROPIC_AUTH_TOKEN /
    // ANTHROPIC_BASE_URL, which dev tools often set in the shell. Note: a shell-level
    // ANTHROPIC_API_KEY still wins over .env.local (Next.js never overrides real env vars).
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      authToken: null,
      baseURL: process.env.KEEPALIVE_ANTHROPIC_BASE_URL ?? "https://api.anthropic.com",
    });
  }
  return client;
}

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
