import { expect, it } from "vitest";
import { viewEvents } from "@/lib/audit-view";

it("hides the model ID in usage events saved before the desk stopped recording it", () => {
  const [old, current, other] = viewEvents([
    { id: "1", at: "", type: "ai.usage", summary: "consumer: some-model-1, 1470 cached input tokens", detail: { channel: "consumer", model: "some-model-1" } },
    { id: "2", at: "", type: "ai.usage", summary: "retention: 0 cached input tokens", detail: { channel: "retention" } },
    { id: "3", at: "", type: "paypal.call", summary: "create plan Lite → 201", detail: { debugId: "abc" } },
  ]);
  expect(old.summary).toBe("consumer: 1470 cached input tokens");
  expect(old.detail).toEqual({ channel: "consumer" });
  expect(current.summary).toBe("retention: 0 cached input tokens");
  expect(other).toEqual({ id: "3", at: "", type: "paypal.call", summary: "create plan Lite → 201", detail: { debugId: "abc" } });
});
