# KeepAlive: architecture

> If you're new here, read [README](../README.md) first, then this file, then [TEAM_GUIDE](TEAM_GUIDE.md).

## The product in one paragraph

A subscription merchant who bills through **PayPal Subscriptions** (here a demo coffee brand, *Brewbox*) installs KeepAlive. When a subscriber clicks **Cancel**, or when the subscriber's **own AI agent** asks to cancel through MCP, KeepAlive's retention agent (Claude) works out *why* and proposes **one fair offer inside the merchant's limits**: pause, downgrade or a temporary discount. Accepting the offer executes it **live on PayPal** (suspend, revise with PayPal re-consent, or a price change). Declining always leads straight to a real PayPal cancellation, so the plain cancel is never more than one click away. The merchant dashboard shows saves, MRR kept and every PayPal call.

## Components

```
                ┌────────────── Next.js app (src/app) ──────────────┐
 Subscriber ───►│ /shop  /account/[id]  (cancel-flow chat)           │
 Merchant   ───►│ /merchant (AG Grid dashboard, policy editor)       │
 Judge/demo ───►│ /agent  (agent-to-agent negotiation, live)         │
 External AI ──►│ /api/mcp  (MCP server: request_cancellation, …)    │
 PayPal     ───►│ /api/webhooks/paypal (verified webhooks)           │
                └───────┬───────────────────────┬────────────────────┘
                        │                       │
               src/lib/retention/*      src/lib/paypal/*
               (engine, agent, guardrails)  (OAuth, Subscriptions v1, webhooks)
                        │                       │
                 Claude API (Anthropic SDK)   PayPal sandbox REST
                        │
                 src/lib/store.ts (JSON file store: subscribers, sessions, events)
```

| Module | File(s) | Responsibility |
|---|---|---|
| PayPal client | `src/lib/paypal/client.ts` | OAuth token cache, `PayPal-Request-Id` idempotency keys, error objects with `debug_id` |
| Subscriptions | `src/lib/paypal/subscriptions.ts` | product/plan bootstrap, create, get, suspend, activate, cancel, revise, patch price, transactions |
| Webhooks | `src/lib/paypal/webhooks.ts`, `src/app/api/webhooks/paypal/route.ts` | signature verification through `/v1/notifications/verify-webhook-signature`; status sync |
| Catalog | `src/lib/catalog.ts` | Brewbox product and the three tiers (Lite, Standard, Premium) |
| Policy and guardrails | `src/lib/policy.ts` | the merchant's limits; `checkOffer()` deterministically approves, clamps or rejects whatever the AI proposes |
| Retention agent | `src/lib/retention/agent.ts` | Claude structured output: reason category, reply, proposed offer, internal rationale |
| Engine | `src/lib/retention/engine.ts` | session state machine: start, message, offer, accept, decline, cancel; records every step |
| Executor | `src/lib/retention/execute.ts` | maps an accepted offer to PayPal calls and confirms the result by reading the subscription back |
| Consumer agent | `src/lib/agents/consumer.ts` | a Claude agent acting **for the subscriber**; calls the same tools as MCP; pauses for human approval |
| MCP | `src/app/api/mcp/route.ts` | the agent-facing endpoint for real external agents (Claude Desktop, etc.) |
| Store | `src/lib/store.ts` | Private Vercel Blob with conditional writes on hosted deployments; JSON persistence in `data/store.json` locally (git-ignored). Agent runs survive function restarts. |

## Offer → PayPal mapping

| Offer | PayPal call | Confirmation |
|---|---|---|
| `pause` (1–N months) | `POST /v1/billing/subscriptions/{id}/suspend` | read back `status == SUSPENDED`; store `resumeAt`; `activate` on resume |
| `downgrade` (to a cheaper tier) | `POST /v1/billing/subscriptions/{id}/revise` with `plan_id` | PayPal returns an **approve link**: the subscriber re-consents inside PayPal; we read back `plan_id` |
| `discount` (X% for N cycles) | `PATCH /v1/billing/subscriptions/{id}` on `plan.billing_cycles[@sequence==1].pricing_scheme.fixed_price` | read back the price; a scheduled restore runs after N cycles |
| `cancel` | `POST /v1/billing/subscriptions/{id}/cancel` | read back `status == CANCELLED` |

## Trust rules (these are also our pitch)

1. **The AI proposes, the code decides.** Every AI offer passes `checkOffer()` against the merchant policy. The model never holds PayPal credentials and cannot invent offers outside the policy.
2. **Cancel is always one step.** Every response includes a plain cancel, which fits click-to-cancel rules. The agent may make at most `maxOffersPerSession` offers.
3. **The human consents through PayPal** for anything that changes what they pay upward or to a new plan (revise re-consent).
4. **PayPal is the source of truth.** After every action we read the subscription back from PayPal before showing success.
5. **External agents get the same guardrails.** MCP tools call the same engine. A consumer agent can accept a pause or cancel; plan changes still require the human's PayPal approval.

## Data model (store.json)

- `config`: PayPal product ID, plan IDs per tier
- `subscribers[]`: `{ id (PayPal sub ID), name, email, tier, status, priceUsd, startedAt, usage }`
- `sessions[]`: retention conversations `{ id, subscriptionId, channel: "web" | "agent", messages[], offers[], outcome }`
- `events[]`: audit log of PayPal calls and webhook events `{ at, type, subscriptionId, request, response, debugId }`
- `scheduled[]`: due actions (resume after pause, restore price after discount)
