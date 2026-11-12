import { expect, it } from "vitest";
import { FALLBACK_BETA, refusalFallback } from "@/lib/ai-fallback";

it("sends server-side refusal fallback only to models that have it", () => {
  expect(refusalFallback("claude-haiku-5-5")).toEqual({});
  expect(refusalFallback("claude-sonnet-5-5")).toEqual({ betas: [FALLBACK_BETA], fallbacks: "default" });
  expect(refusalFallback("claude-opus-5-5")).toEqual({ betas: [FALLBACK_BETA], fallbacks: "default" });
});
