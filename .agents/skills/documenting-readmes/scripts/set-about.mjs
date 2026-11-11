#!/usr/bin/env node
// Sets the About section of a GitHub repository (website link, description and
// topics) with the GitHub CLI, then reads it back so you can see what GitHub
// stored.
//
// Usage:
//   node scripts/set-about.mjs --repo owner/repo --url https://example.com \
//     --description "One line about the site" --topics react,vite,portfolio
//
// --repo is optional inside a clone of the repository. --dry-run prints the
// gh command without running it. Needs gh, signed in with access to the repo.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { parseArgs } from "node:util";

const require = createRequire(import.meta.url);
const { parseTopics } = require("../lib/readme-kit.js");

const usage = `Usage: node scripts/set-about.mjs [--repo owner/repo] [--url https://...]
       [--description "..."] [--topics a,b,c] [--dry-run]`;

let values;
try {
  ({ values } = parseArgs({
    options: {
      repo: { type: "string" },
      url: { type: "string" },
      description: { type: "string" },
      topics: { type: "string" },
      "dry-run": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  }));
} catch (err) {
  console.error(`${err.message}\n${usage}`);
  process.exit(2);
}
if (values.help) {
  console.log(usage);
  process.exit(0);
}

const repo = (values.repo || "").trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/, "").replace(/\/$/, "");
const url = (values.url || "").trim();
const description = (values.description || "").trim();
const topics = parseTopics(values.topics);

if (!url && !description && !topics.length) {
  console.error(`Nothing to set. Pass at least one of --url, --description or --topics.\n${usage}`);
  process.exit(2);
}
if (url && !/^https:\/\/[^\s/]+\.[^\s]+$/i.test(url)) {
  console.error(`--url must be a full https:// address, got "${url}".`);
  process.exit(2);
}
if (repo && !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
  console.error(`--repo must look like owner/repo, got "${repo}".`);
  process.exit(2);
}

const edit = ["repo", "edit"];
if (repo) edit.push(repo);
if (url) edit.push("--homepage", url);
if (description) edit.push("--description", description);
for (const t of topics) edit.push("--add-topic", t);

if (values["dry-run"]) {
  console.log(["gh", ...edit].map((a) => (/[\s'"]/.test(a) ? JSON.stringify(a) : a)).join(" "));
  process.exit(0);
}

try {
  execFileSync("gh", edit, { stdio: "inherit" });
  const view = ["repo", "view"];
  if (repo) view.push(repo);
  view.push("--json", "nameWithOwner,description,homepageUrl,repositoryTopics");
  const about = JSON.parse(execFileSync("gh", view, { encoding: "utf8" }));
  const names = (about.repositoryTopics || []).map((t) => t.name || (t.topic && t.topic.name)).filter(Boolean);
  console.log(`About section of ${about.nameWithOwner}`);
  console.log(`  Website:     ${about.homepageUrl || "(none)"}`);
  console.log(`  Description: ${about.description || "(none)"}`);
  console.log(`  Topics:      ${names.length ? names.join(", ") : "(none)"}`);
} catch (err) {
  console.error(err.code === "ENOENT"
    ? "The GitHub CLI (gh) is not installed or not on PATH. Get it from https://cli.github.com/ and run gh auth login."
    : `gh failed: ${err.message}`);
  process.exit(1);
}
