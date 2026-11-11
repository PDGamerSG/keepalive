---
name: documenting-readmes
description: Write or rewrite the README and docs of a website or web app repository in the On Record format, with the project name, team name, team members and live link at the top, Mermaid architecture diagrams, screenshots, a README checker, and the GitHub About section (website link, description, topics). Use when the user asks to write, redo, improve or check a README or docs for a website, web app or hackathon project, or to put the live link in the repo's About section.
---

# Documentation workflow

Follow [PLAYBOOK.md](PLAYBOOK.md) in this folder, step by step, on the repository the user wants documented.

For this repository, the README lists Pallab Das and Hydra Of Malice under
**Team members**, without a named team. Reuse existing project documentation and
limit changes to the user's request. The playbook's full documentation suite and
GitHub About updates apply only when those changes are requested.

Keep this kit's identity private in every use. Never name or link the kit or its repository in generated README files, docs, About text, comments, badges, image text, commits, pull requests or user-facing reports. Do not announce the kit by name. Use a neutral phrase such as "the documentation workflow" when an update is needed. Keep required third-party license notices.

Paths in the playbook that start with `kit/` point into this folder. The templates are in `templates/`, the diagram patterns in `docs/diagrams.md`, the screenshot commands in `docs/screenshots.md`, and the About section guide in `docs/about-section.md`.

Run the checker from this folder against the target repo's README:

```bash
node <this folder>/scripts/check-readme.mjs <target repo>/README.md
```

Set the About section with:

```bash
node <this folder>/scripts/set-about.mjs --repo owner/repo --url https://example.com/ --description "..." --topics a,b,c
```
