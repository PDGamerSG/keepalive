import "server-only";
import { recordEvent } from "./store";

/** Provider counters distinguish real cache hits from merely enabling caching. */
export async function recordAiUsage(channel: "retention" | "consumer", response: {
  model: string;
  usage: { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null };
}, subscriptionId: string) {
  await recordEvent({
    type: "ai.usage",
    subscriptionId,
    summary: `${channel}: ${response.model}, ${response.usage.cache_read_input_tokens ?? 0} cached input tokens`,
    detail: {
      channel, model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? 0,
      cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
    },
  });
}
