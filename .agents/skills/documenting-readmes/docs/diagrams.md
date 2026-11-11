# Architecture diagrams for websites

Mermaid patterns to copy into a README or `docs/ARCHITECTURE.md`. GitHub renders a ```` ```mermaid ```` block as a diagram, so the diagram lives in the Markdown and changes in the same pull request as the code.

Pick the pattern closest to the project, then rename every node to a real folder, file, service or table. Delete nodes the project does not have.

## The reference: On Record

The "How it works" diagram from [On Record](https://github.com/PDGamerSG/On-Record). Each node says what happens in plain words, then names the real component. Subgraphs group the parts of one package. Dashed arrows mark background flows.

```mermaid
flowchart TB
  audio["Meeting audio<br/>microphone or file"]
  subgraph listener["Listener · wsw_brain.listen"]
    direction LR
    vad["Find speech<br/>Silero VAD"] --> voices["Tell voices apart<br/>speaker embeddings"] --> asr["Transcribe<br/>faster-whisper or Saaras"]
  end
  extract["Extract decisions and action items<br/>Gemma 4 · brain/extract.py"]
  db[("FalkorDB<br/>meetings, people, utterances,<br/>decisions, action items")]
  subgraph assistant["Assistant · wsw_brain.brain"]
    direction LR
    question["Question<br/>typed or spoken"] --> retrieve["Retrieve evidence<br/>full-text, vector, speaker, recent"] --> answer["Answer with Gemma 4<br/>citing the lines it used"]
  end
  web["Web app<br/>lanes, transcript, insights"]

  audio --> listener
  listener -. utterances .-> db
  listener -. utterances .-> extract
  extract -. insights .-> db
  db --> assistant
  db -. "live updates (SSE)" .-> web
```

## Static site

A site built to HTML at deploy time, with no server of its own. Astro, Hugo, Jekyll, Eleventy, or Vite with no API.

```mermaid
flowchart LR
  content["Pages and posts<br/>src/content"] --> build["Build<br/>astro build"]
  build --> dist["Static files<br/>dist/"]
  dist --> cdn["Host and CDN<br/>GitHub Pages"]
  visitor["Visitor<br/>browser"] --> cdn
  visitor -.-> forms["Contact form<br/>Formspree"]
```

## Single-page app with its own API

A React, Vue or Svelte front end that calls a separate server.

```mermaid
flowchart TB
  visitor["Visitor<br/>browser"]
  subgraph web["Web app · apps/web (React, Vite)"]
    direction LR
    pages["Pages<br/>src/pages"] --> client["API client<br/>src/api/client.ts"]
  end
  subgraph api["API · apps/api (Express)"]
    direction LR
    routes["Routes<br/>src/routes"] --> service["Business logic<br/>src/services"]
  end
  db[("PostgreSQL<br/>users, orders")]
  pay["Payments<br/>Stripe"]

  visitor --> pages
  client -- "REST /api/*" --> routes
  service --> db
  service -.-> pay
```

## Full-stack framework

Next.js, Nuxt, SvelteKit or Remix, where pages and API routes live in one app.

```mermaid
flowchart TB
  visitor["Visitor<br/>browser"]
  subgraph app["Next.js app · src/app"]
    direction LR
    rsc["Server components<br/>src/app/(site)"] --> actions["Server actions<br/>src/app/actions.ts"]
    routes["Route handlers<br/>src/app/api"]
  end
  auth["Sign-in<br/>Auth.js, GitHub OAuth"]
  db[("Supabase Postgres<br/>profiles, posts")]
  ai["Text model<br/>OpenAI API"]

  visitor --> rsc
  visitor --> routes
  rsc --> auth
  actions --> db
  routes --> db
  routes -.-> ai
```

## Realtime

Live updates over WebSockets or Server-Sent Events.

```mermaid
flowchart LR
  a["Visitor A<br/>browser"] -- "WebSocket /ws" --> hub["Realtime server<br/>server/socket.ts"]
  b["Visitor B<br/>browser"] -- "WebSocket /ws" --> hub
  hub --> store[("Redis<br/>rooms, presence")]
  hub -. "broadcast" .-> a
  hub -. "broadcast" .-> b
```

## Context (C4 level 1)

Who uses the site and which outside services it calls. Put it near the top of `docs/ARCHITECTURE.md`.

```mermaid
flowchart LR
  visitor["Visitor"]
  admin["Site admin"]
  subgraph sys["Project name"]
    web["Web app"]
    db[("Database")]
  end
  mail["Email<br/>Resend"]
  pay["Payments<br/>Stripe"]

  visitor --> web
  admin --> web
  web --> db
  web --> mail
  web --> pay
```

## A request, step by step

```mermaid
sequenceDiagram
  autonumber
  actor V as Visitor
  participant W as Web app
  participant A as /api/orders
  participant D as PostgreSQL
  participant S as Stripe
  V->>W: Clicks "Pay"
  W->>A: POST /api/orders
  A->>D: Insert order (pending)
  A->>S: Create checkout session
  S-->>A: Session URL
  A-->>W: 201 with the session URL
  W-->>V: Redirect to Stripe checkout
  S-)A: Webhook: payment succeeded
  A->>D: Mark order paid
```

## Data model

```mermaid
erDiagram
  USER ||--o{ ORDER : places
  ORDER ||--|{ ORDER_ITEM : contains
  PRODUCT ||--o{ ORDER_ITEM : "is in"
  USER {
    uuid id PK
    string email
  }
  ORDER {
    uuid id PK
    uuid user_id FK
    string status
  }
  ORDER_ITEM {
    uuid order_id FK
    uuid product_id FK
    int quantity
  }
  PRODUCT {
    uuid id PK
    string name
    int price_cents
  }
```

## Deployment

```mermaid
flowchart LR
  push["Push to main"] --> ci["GitHub Actions<br/>lint, test, build"]
  ci --> host["Vercel<br/>production"]
  pr["Pull request"] --> preview["Vercel<br/>preview URL"]
  host --> domain["example.com"]
  host -.-> db[("Neon Postgres")]
```

## State of one record

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Published: author publishes
  Published --> Archived: admin archives
  Archived --> Published: admin restores
  Published --> [*]
```

## Rules that keep GitHub rendering

| Rule | Why |
| --- | --- |
| Quote every label: `api["API routes<br/>src/app/api"]` | Parentheses, slashes, colons and `@` in an unquoted label stop the parser |
| Use `<br/>` for a line break inside a label | A real newline inside a label is a syntax error |
| Use short plain ids: `web`, `api`, `db` | Ids with spaces fail, and the id `end` is reserved |
| `[( )]` draws a database cylinder: `db[("PostgreSQL")]` | Readers spot the data store at a glance |
| Solid arrows for requests, dashed `-.->` for background work and unwired parts | The dashed line tells the reader the flow is not a direct call |
| Label an arrow with its protocol when it matters: `-- "REST /api/*" -->` | The reader sees how the parts talk |
| `direction LR` inside a subgraph lays out its steps in a row | A pipeline reads left to right while the overall diagram flows top to bottom |
| Keep a diagram under about 15 nodes | Larger diagrams shrink to unreadable text on GitHub. Split them |
| No `click` lines and no custom `style` colours | `click` does nothing on GitHub, and fixed colours clash with dark mode |

To find a syntax error before you push, paste the block into [mermaid.live](https://mermaid.live), or render the whole file:

```bash
npx -y @mermaid-js/mermaid-cli -i README.md -o /tmp/readme-check.md
```
