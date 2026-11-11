import { defineConfig } from "vitest/config";
import base from "./vitest.config";
import { loadEnv } from "vite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const env = loadEnv("development", process.cwd(), "");

// Live Claude eval (costs tokens): npm run eval:ai
export default defineConfig({
    ...base,
    test: {
      ...base.test,
      include: ["tests/agent.eval.test.ts"],
      env: {
        RUN_AI_EVAL: "1", ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
        DATA_DIR: mkdtempSync(join(tmpdir(), "keepalive-eval-")), BLOB_READ_WRITE_TOKEN: "", VERCEL: "",
      },
    },
});
