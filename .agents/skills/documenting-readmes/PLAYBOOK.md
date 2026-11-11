# Playbook: write a website's README and docs

Follow these steps, in order, when you are asked to write or redo the README of a website or web app repository. The repository you are documenting is the **target repo**. The folder this file sits in is the **kit**. Paths that start with `kit/` are inside the kit: replace `kit/` with the kit's real location, such as `.agents/skills/documenting-readmes/`. Every other path is inside the target repo.

You produce:

| Output | Where it goes | Required |
| --- | --- | --- |
| `README.md` | Target repo root | Yes |
| `docs/ARCHITECTURE.md` | Target repo | Yes |
| `docs/images/*.png` | Target repo | Yes, at least a hero image |
| `docs/README.md`, `docs/CONFIGURATION.md`, `docs/TROUBLESHOOTING.md`, `docs/user-guide.md` | Target repo | Yes, unless the site is a single static page |
| `docs/api/`, `docs/DESIGN.md`, `docs/operations/`, `docs/security/`, `docs/testing/`, `docs/adr/`, `docs/glossary.md` | Target repo | Only when the project has that part (see step 6) |
| `THIRD_PARTY_NOTICES.md` | Target repo root | When the site bundles third-party fonts, images or code |
| The About section (website link, description, topics) | GitHub repo settings | Yes, when you can run `gh` |

## Hard rules

1. The README always opens with this block, with nothing above it. This is the On Record format and it is not optional:

   ```markdown
   # Project Name

   **Team Name**

   - Member One
   - Member Two

   Live link: [example.com](https://example.com/)
   ```

   The team line is the word `Team` followed by the team name, in bold, for example `**Team Vulcan**`. The link text is the domain without `https://`.
2. Never invent the team name, a member, the live link, a feature, a number or a license. If you cannot find it in the repo, ask the user (step 2). If they do not know, write "Not recorded in the repository" in the docs and leave it out of the README.
3. Every claim must be checkable in the code. Cite files in the docs (`src/app/api/route.ts:12`). The README does not need citations, but every sentence in it must have one you could give.
4. Diagrams show what exists. Every node is a real folder, file, service, table or process. Draw parts that are not wired up with dashed arrows and say so.
5. Write plain English. No emojis, no em dashes, no buzzwords ("seamless", "powerful", "robust", "cutting-edge", "leverage"). Sentence case headings. Active voice. Say what a thing does, with the mechanism or the number.
6. No AI or documentation-kit attribution anywhere. Never include this kit's name, repository URL, installation path, badge or credit in the target project's README, docs, About section, comments, image text, code blocks, commits, pull requests or user-facing reports. Do not announce the kit by name. Use neutral wording such as "the documentation workflow" when reporting progress. Preserve required third-party license notices without adding kit branding.
7. No local paths, usernames, tokens or secret values. Copy variable names from `.env.example`, never values from `.env`.
8. Do not delete content the target repo's current README has unless it is wrong. Move it to the right section or into a doc under `docs/`.

## Step 1: gather the facts

Read the target repo before you write anything. Look in these places and note what you find, with the file it came from.

| Fact | Where to look |
| --- | --- |
| Project name | The current README title, `package.json` `name`, the `<title>` in the root layout or `index.html`, a `brand.json` or `site.config` file |
| Team name and members | The current README, `package.json` `author` and `contributors`, `CONTRIBUTORS`, `git shortlog -sne HEAD` (a hint only: commit names are not a team) |
| Live link | `gh repo view --json homepageUrl`, `CNAME`, `package.json` `homepage`, `site` in `astro.config.*`, `metadataBase` in a Next.js layout, `siteUrl` in config files, `vercel.json`, `netlify.toml`, `.env.example` keys such as `SITE_URL` or `NEXT_PUBLIC_SITE_URL`, the current README |
| What it does and for whom | The landing page copy (the hero headline and subtitle), the current README, the repo description |
| Features | The routes or pages folder, the navigation component, the API routes |
| How it works | The framework config, the API folder, the database client, `fetch` calls to outside services, `docker-compose.yml`, server entry points |
| Tech stack and licenses | `package.json` dependencies (or `requirements.txt`, `pyproject.toml`, `go.mod`), the license field of each main package in `node_modules/<pkg>/package.json` |
| How to run it | `package.json` scripts, `.nvmrc`, `engines`, `.env.example`, `docker-compose.yml`, `Makefile` |
| Checks and CI | `package.json` lint, test and build scripts, `.github/workflows/*.yml` |
| Hosting | `vercel.json`, `netlify.toml`, `wrangler.toml`, `firebase.json`, `render.yaml`, `fly.toml`, `Dockerfile`, GitHub Pages workflow |
| Known limits | `TODO` and `FIXME` comments, disabled features, routes the UI calls that the server does not serve, missing tests, the current README |
| License | `LICENSE`, `package.json` `license` |

Useful commands:

```bash
gh repo view --json nameWithOwner,description,homepageUrl,repositoryTopics,licenseInfo
git shortlog -sne HEAD | head -20
git ls-files | head -200
```

## Step 2: ask for what is missing

The team name, the members and the live link usually are not in the code. If any of the three is missing or uncertain, ask the user for all of them in one message before you write the README. Also ask if the site was built for an event, a course or a client, because that often belongs in the intro.

If you cannot ask (you run unattended), write the README with the facts you have, keep the missing ones as `{{TEAM_NAME}}`-style placeholders, and list them in your final report. The checker fails on placeholders, so nobody can mistake the file for finished.

## Step 3: take the screenshots

Save them under `docs/images/` with plain names: `hero.png`, `home.png`, `dashboard.png`. Read `kit/docs/screenshots.md` for the commands. In short:

```bash
npx playwright screenshot --viewport-size=1440,900 --wait-for-timeout=1500 https://example.com/ docs/images/hero.png
```

- Take them from the live site when it is up, otherwise from the local dev server.
- Use the same viewport (1440 × 900) for every shot and note it in the README.
- The hero image is the landing page. Pick two more pages that show the main features.
- If the repo already has an Open Graph image (`og.jpg`, `og.png`, `opengraph-image.*`), you may use it as the hero, the way On Record does.
- Do not include personal data, real customer names or keys in a screenshot.

If you cannot run a browser, use images already in the repo, and list the screenshots you could not take in your final report.

## Step 4: write the README

Start from `kit/templates/README.template.md`. Replace every `{{...}}` placeholder and delete every `<!-- kit: ... -->` comment.

The sections, in order:

| Section | What goes in it |
| --- | --- |
| Top block | Title, team line, member bullets, live link (hard rule 1) |
| Hero image | Centered, width 760, alt text that says what is on screen |
| Intro | Two paragraphs: what the site does and for whom, then what the repo contains |
| Features | Table of 4 to 8 rows: Feature, What it does |
| How it works | One sentence, a Mermaid flowchart, one paragraph that walks the arrows, a link to `docs/ARCHITECTURE.md` |
| Screenshots | How they were taken, a main image at width 860 with a caption, a two-column table of two more |
| Tech stack | Table: Component, Purpose, License |
| Quick start | Prerequisites with versions, setup commands, a Checks subsection, a Deploy subsection |
| Repository map | Table: Path, What it holds |
| Documentation | One line per doc you wrote |
| Known limits | Bullets. At least two. Do not soften them |
| License | License name, link to `LICENSE` and to third-party notices |

Keep the top half readable by someone who does not code. Put commands and file paths in the lower half.

## Step 5: draw the architecture diagrams

The README gets one diagram in "How it works". `docs/ARCHITECTURE.md` gets the rest. Start from `kit/templates/docs/ARCHITECTURE.md` and pick patterns from `kit/docs/diagrams.md`.

| Diagram | Mermaid type | Goes in |
| --- | --- | --- |
| Main flow: browser to app to data store and outside services | `flowchart TB` with subgraphs | README "How it works" |
| The parts: folders and processes and how they call each other | `flowchart LR` | ARCHITECTURE.md |
| Context: users and outside services (C4 level 1) | `flowchart LR` | ARCHITECTURE.md |
| Main request, step by step | `sequenceDiagram` | ARCHITECTURE.md |
| Data model | `erDiagram` | ARCHITECTURE.md, only if the site stores data |
| Deployment | `flowchart LR` | ARCHITECTURE.md |

Rules that keep GitHub rendering them:

- Quote every label: `api["API routes<br/>src/app/api"]`. Labels with parentheses, slashes or colons break when unquoted.
- Use `<br/>` for a line break inside a label. Put the plain-words name first and the real component second.
- Node ids are short and plain (`web`, `api`, `db`). Never use `end` as an id.
- Solid arrows for requests. Dashed arrows (`-.->`) for background work, streams and parts that are not wired yet.
- Below each diagram in the docs, write `Sources:` and the files the diagram came from.
- Keep a diagram under about 15 nodes. Split it if it grows past that.

The README "How it works" diagram in On Record is the reference. See `kit/examples/on-record/README.md`.

## Step 6: write the docs

Copy the templates you need from `kit/templates/docs/` into the target repo's `docs/`, fill them, and delete the ones that do not apply.

| Template | Write it when |
| --- | --- |
| `docs/README.md` | Always: it is the index of the other docs |
| `docs/ARCHITECTURE.md` | Always |
| `docs/CONFIGURATION.md` | The site reads environment variables |
| `docs/TROUBLESHOOTING.md` | Always, with problems the setup makes likely |
| `docs/user-guide.md` | The site has more than one page |
| `docs/api/README.md` | The site has its own API routes |
| `docs/DESIGN.md` | The site has design tokens, a theme file or a design system |
| `docs/operations/deployment.md` | The hosting setup is in the repo |
| `docs/security/threat-model.md` | The site has accounts, stores personal data, takes payments or holds API keys |
| `docs/testing/test-plan.md` | The repo has tests |
| `docs/adr/` | The user asks for decision records, or the repo is for a course or review |
| `docs/glossary.md` | The code uses terms a newcomer would not know |
| `THIRD_PARTY_NOTICES.md` | The site bundles third-party fonts, images, icons or code |

Every doc follows the same rules as the README: plain English, cite files, mark what is not built.

## Step 7: check

Run the checker on the README and fix every FAIL. Fix WARN lines unless you have a reason, and give that reason in your report.

```bash
node kit/scripts/check-readme.mjs README.md
```

Exit code 0 means no check failed. The checker also confirms that every local link and image in the README points to a file that exists.

Then check the Mermaid blocks. If the target repo can install packages, render them once:

```bash
npx -y @mermaid-js/mermaid-cli -i README.md -o /tmp/readme-check.md
```

A syntax error fails the command and names the line. The first run downloads a headless browser, so skip it on slow connections and rely on the label rules in step 5.

Last, reread the README as a stranger: does the first screen say what the site is, who built it and where it lives?

## Step 8: set the About section

The About box at the top right of the GitHub page shows the website link, the description and the topics. Set all three:

```bash
node kit/scripts/set-about.mjs --repo owner/repo \
  --url https://example.com/ \
  --description "One sentence about what the site does." \
  --topics nextjs,tailwindcss,supabase
```

The script runs `gh repo edit` and prints what GitHub stored. It needs `gh` signed in with admin or maintain access to the repo. Without that access, give the user the command and the manual steps in `kit/docs/about-section.md`.

The description is the one-line description from the README intro, not the URL. The website field already shows the link. Topics are 3 to 8 lowercase words for the framework, the language and what the site is about.

The social preview image (the picture shown when the repo link is shared) cannot be set from the command line. Tell the user to upload `docs/images/hero.png` under Settings, General, Social preview.

## Step 9: commit, only when asked

Do not commit or push unless the user asked you to. When they did:

- Commit the README, the docs and the images together, with a message such as `docs: rewrite README and add architecture docs`.
- No `Co-Authored-By` trailers and no "generated with" lines.
- Push to a branch and open a pull request unless the user said to push to the default branch.

## Step 10: report

End with a short report to the user:

Describe the target project's changes only. Do not name or link the documentation kit or its repository.

- The files you wrote or changed.
- The checker result (`N / M passed`), and any WARN you left with the reason.
- What you could not find and left out, or left as a placeholder.
- What the user must do by hand: the social preview image, the About section if you could not run `gh`, screenshots you could not take.
