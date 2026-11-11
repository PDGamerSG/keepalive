# Architecture

How the parts of {{PROJECT_NAME}} fit together, for anyone reading the code for the first time. The [README](../README.md) shows how to run it, [CONFIGURATION.md](CONFIGURATION.md) lists every setting, and [TROUBLESHOOTING.md](TROUBLESHOOTING.md) helps with setup problems.

Each part below has a status: **Implemented** (works end to end), **Partial** (code exists but is not wired up) or **Planned** (only the docs or the UI expect it). Every diagram is followed by the files it was drawn from.

## The parts

<!-- kit: one node per real folder, service or process. Delete nodes the project does not have. -->

```mermaid
flowchart LR
  subgraph browser["Browser"]
    UI["Pages and components<br/>{{PAGES_DIR}}"]
    CLIENT["Data fetching<br/>{{CLIENT_FILE}}"]
  end
  subgraph server["{{SERVER_NAME}}"]
    ROUTES["HTTP routes<br/>{{ROUTES_DIR}}"]
    AUTH["Sign-in<br/>{{AUTH_PROVIDER}}"]
    LOGIC["Business logic<br/>{{LIB_DIR}}"]
  end
  DB[("{{DATABASE}}")]
  EXT["{{EXTERNAL_SERVICE}}"]

  UI --> CLIENT
  CLIENT -- "REST /api/*" --> ROUTES
  ROUTES --> AUTH
  ROUTES --> LOGIC --> DB
  LOGIC -.-> EXT
```

Sources: `{{FILE}}`, `{{FILE}}`.

- **`{{DIR}}`**: {{WHAT_IT_IS_AND_ITS_STACK}}
- **`{{DIR}}`**: {{WHAT_IT_IS_AND_ITS_STACK}}
- **{{DATABASE}}**: {{WHAT_IT_STORES_AND_HOW_TO_RUN_IT}}

| Folder | What it holds | Status |
| --- | --- | --- |
| `{{DIR}}` | {{WHAT_IT_HOLDS}} | Implemented |

## Context

Who uses the site and which outside services it talks to.

```mermaid
flowchart LR
  visitor["Visitor (browser)"]
  admin["{{ADMIN_ROLE}}"]
  subgraph sys["{{PROJECT_NAME}}"]
    web["Web app"]
    db[("{{DATABASE}}")]
  end
  ext1["{{EXTERNAL_SERVICE}}"]
  ext2["{{EXTERNAL_SERVICE}}"]

  visitor --> web
  admin --> web
  web --> db
  web --> ext1
  web --> ext2
```

*C4 level 1, system context: {{PROJECT_NAME}} and the outside services it calls.*

| Outside service | Data sent | When |
| --- | --- | --- |
| {{SERVICE}} | {{DATA}} | {{TRIGGER, with file:line}} |

## Main request

What happens when a visitor {{MAIN_ACTION}}.

```mermaid
sequenceDiagram
  autonumber
  actor V as Visitor
  participant W as Web app
  participant A as API route
  participant D as {{DATABASE}}
  V->>W: {{ACTION}}
  W->>A: {{METHOD}} {{PATH}}
  A->>D: {{QUERY}}
  D-->>A: {{RESULT}}
  A-->>W: {{RESPONSE}}
  W-->>V: {{WHAT_THE_VISITOR_SEES}}
```

Sources: `{{FILE}}`.

## Data model

<!-- kit: one entity per table or collection. Skip this section if the site stores no data. -->

```mermaid
erDiagram
  USER ||--o{ POST : writes
  POST ||--o{ COMMENT : has
  USER {
    string id PK
    string email
  }
  POST {
    string id PK
    string author_id FK
    string title
  }
  COMMENT {
    string id PK
    string post_id FK
    string body
  }
```

Sources: `{{SCHEMA_FILE}}`.

| Entity | Stored in | What it holds |
| --- | --- | --- |
| {{ENTITY}} | {{TABLE_OR_COLLECTION}} | {{FIELDS}} |

## Deployment

```mermaid
flowchart LR
  dev["Push to {{BRANCH}}"] --> ci["{{CI}}<br/>lint, test, build"]
  ci --> host["{{HOST}}"]
  host --> domain["{{LIVE_DOMAIN}}"]
  host -.-> db[("{{DATABASE_HOST}}")]
```

Sources: `{{DEPLOY_CONFIG_FILE}}`. If the repository does not record how the site is deployed, say so here instead of guessing.

## What is not built yet

| Part | Status | Evidence |
| --- | --- | --- |
| {{PART}} | Partial | `{{FILE}}` |
