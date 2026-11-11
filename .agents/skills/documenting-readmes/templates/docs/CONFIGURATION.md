# Configuration

Every setting {{PROJECT_NAME}} reads, its default, and the file that reads it. Copy `.env.example` to `.env` for local development. Git ignores `.env`.

## How settings are loaded

{{HOW: e.g. "Next.js loads .env, .env.local and .env.production at build time. Variables that start with NEXT_PUBLIC_ are sent to the browser; the rest stay on the server."}}

Sources: `{{FILE}}`.

## Settings

<!-- kit: one row per variable found in .env.example and in the code (process.env, import.meta.env, os.environ). Never copy a real secret value. -->

| Variable | Default | Read by | What it does |
| --- | --- | --- | --- |
| `{{NAME}}` | `{{DEFAULT_OR_NONE}}` | `{{FILE}}` | {{PURPOSE}} |

## Secrets

| Variable | Where to get it | Where to set it in production |
| --- | --- | --- |
| `{{NAME}}` | {{PROVIDER_DASHBOARD}} | {{HOST_SETTINGS_PAGE}} |

Variables exposed to the browser are public. Keep secrets in server-only variables.
