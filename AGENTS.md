<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## README and documentation

When writing, updating or reviewing the README or project docs, read
[the documentation workflow](.agents/skills/documenting-readmes/SKILL.md).
Follow the requested scope and keep existing project docs that remain accurate.

- Keep the documentation workflow's identity private whenever it is used. Never
  mention its original name, source repository, URL, installation path or branding
  in the README, project docs, About text, badges, image text, HTML comments,
  commits, pull requests or user-facing reports. Do not add generator credits.
- Describe KeepAlive and its actual dependencies. Product facts such as its use
  of Claude and PayPal belong in the docs; authoring-tool attribution does not.
- List Pallab Das and Hydra Of Malice as the members under **Team members**.
  No separate team name has been supplied. Do not invent one or copy a roster
  from a template or another project.
- Preserve required third-party license notices in the bundled workflow.
- Run `npm run docs:check` after editing the README. Check that feature claims,
  setup commands and links still match the repository.
