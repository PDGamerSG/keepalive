/** Beta header for server-side refusal fallback. */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

/**
 * Request fields for server-side refusal fallback: a request the model declines
 * is re-run on a fallback model inside the same call. Haiku models have no
 * server-side fallback (a fallback list on them is a 400), so they get none and
 * a refusal is handled by the caller (both agents fail safe on `refusal`).
 */
export function refusalFallback(model: string): { betas?: string[]; fallbacks?: "default" } {
  return /haiku/i.test(model) ? {} : { betas: [FALLBACK_BETA], fallbacks: "default" };
}
