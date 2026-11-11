#!/usr/bin/env node
// Checks a README against the documenting-readmes format: the team and live link
// block, the hero image, the required sections, the Mermaid diagram, wording,
// leftover placeholders and links to files that do not exist.
//
// Usage: node scripts/check-readme.mjs [path/to/README.md] [--json]
// Exit code: 0 when nothing failed, 1 when at least one check failed, 2 when
// the file cannot be read.
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const { checkReadme, summarize } = require("../lib/readme-kit.js");

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log("Usage: node scripts/check-readme.mjs [path/to/README.md] [--json]");
  process.exit(0);
}
const json = args.includes("--json");
const file = resolve(args.find((a) => !a.startsWith("--")) || "README.md");

let md;
try {
  md = readFileSync(file, "utf8");
} catch (err) {
  console.error(`Cannot read ${file}: ${err.message}`);
  process.exit(2);
}

const base = dirname(file);
const results = checkReadme(md, { exists: (p) => existsSync(resolve(base, p)) });
const sum = summarize(results);

if (json) {
  console.log(JSON.stringify({ file, ...sum, results }, null, 2));
} else {
  const tag = { ok: "PASS", warn: "WARN", bad: "FAIL" };
  console.log(`README check: ${file}\n`);
  for (const r of results) console.log(`${tag[r.level]}  ${r.text}`);
  console.log(`\n${sum.pass} / ${sum.total} passed, ${sum.bad} failed, ${sum.warn} warnings.`);
}
process.exit(sum.bad ? 1 : 0);
