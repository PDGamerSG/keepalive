import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";

// Live Claude eval (costs tokens): npm run eval:ai
export default mergeConfig(
  base,
  defineConfig({
    test: { include: ["tests/agent.eval.test.ts"], env: { RUN_AI_EVAL: "1" } },
  }),
);
