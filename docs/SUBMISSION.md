# Devpost submission draft

**Project name:** KeepAlive

**Tagline (≤ 200 chars):** When a subscriber, or their AI agent, tries to cancel, KeepAlive negotiates one fair save inside the merchant's limits and executes it live on PayPal Subscriptions.

## Inspiration
The cancel button is where subscription businesses bleed. Merchants on Stripe, Braintree, Chargebee or Paddle can plug in retention tools: cancel flows, pause offers, win-back discounts. Merchants who bill through **PayPal Subscriptions** don't have that layer. Meanwhile consumers are starting to hand chores to AI agents, and "cancel my subscriptions" is an obvious one. When a customer's agent shows up to cancel, who answers for the merchant?

## What it does
- **AI cancel flow.** When a subscriber clicks Cancel, KeepAlive's retention agent (Claude) learns why, then proposes one offer that fits: **pause** (travel, a break), **downgrade** (too much product) or a **temporary discount** (price).
- **Guardrails decide, not the AI.** The merchant sets hard limits: max pause, max discount, discount months, tenure rule, monthly discount budget and offers per conversation. Every AI proposal passes a deterministic policy engine that approves, clamps or rejects it.
- **Executed live on PayPal.** A pause calls `POST /v1/billing/subscriptions/{id}/suspend` (auto-resume via `activate`). A downgrade calls `revise` with a new `plan_id`, and **PayPal asks the subscriber to re-consent**. A discount `PATCH`es the subscription's pricing scheme for N months, then restores it. Cancel calls `cancel`. After each call we read the subscription back from PayPal before showing success.
- **Agent-to-agent commerce over MCP.** KeepAlive exposes an MCP server, so a customer's AI agent (Claude Desktop, etc.) can request cancellation, receive structured offers, relay them to its human and accept or cancel. The in-app demo shows two Claude agents negotiating, with the human approving the deal.
- **Cancel is always one click.** No dark patterns: a firm "no" ends in an immediate PayPal cancellation.
- **Merchant dashboard.** Saves, MRR kept, save rate, reasons for leaving, every conversation with the AI's internal rationale, and a PayPal audit log with `debug_id`s, built on AG Grid.
- **Two ways to try it.** Checkout runs on the real PayPal sandbox, or as an instant demo with no login: the subscription is approved on a simulated PayPal step, and its later Subscriptions calls are answered by an in-app simulator with PayPal's state rules (logged as simulated).

## How we built it
- **Next.js 16 + TypeScript** app, deployed on Vercel at https://keepalive.pallabdas.me, with state in private Vercel Blob storage and a daily Vercel Cron job for scheduled resumes and price restores.
- **PayPal:** Catalog Products and Billing Plans (bootstrap), Subscriptions v1 (create, approve, get, suspend, activate, revise, PATCH pricing, cancel, transactions), and Webhooks with `verify-webhook-signature`. Every mutating call sends a `PayPal-Request-Id` idempotency key.
- **AI:** Claude Haiku 5.5 (`claude-haiku-5-5`) through the Anthropic SDK; set `KEEPALIVE_MODEL` to use another model. The retention agent uses **structured outputs** (zod schema: reason, action, offer, reply, rationale). The subscriber's agent is a **tool-use loop** that must call `ask_my_human` before `accept_offer`. Both use **prompt caching** laid out most stable first (instructions, then the per-conversation subscriber context, then the turn), so later calls read about 1,900 tokens from cache; 8 live evals cover the retention agent's behavior.
- **MCP:** `mcp-handler` + MCP SDK v2 serving `get_subscription`, `request_cancellation`, `send_message`, `accept_offer`, `decline_offer`, `cancel_subscription` and `get_session`.
- **AG Grid** for the merchant's subscriber table.

## Challenges
- Getting the trust model right: the AI must be persuasive enough to help but never manipulative. We separated *proposal* (AI) from *decision* (code) from *execution* (PayPal) and made cancellation impossible to block.
- PayPal plan changes require buyer re-consent. We turned that into a feature: the human stays in the loop even when an AI agent negotiates.
- Trusting nothing we couldn't read back. In sandbox testing PayPal applied a discount but our first check said it hadn't: the subscription GET omits plan pricing unless you request `fields=plan`. Every action is now confirmed against PayPal's own state, and the offline test double behaves the same way.

## Accomplishments
- Real sandbox state changes for every offer type, verified by reading back from PayPal.
- Two AI agents negotiating a real PayPal subscription change, with the human approving.

## What we learned
- How PayPal Subscriptions handles revise/re-consent and price overrides.
- Sandbox realities: the buyer must be a separate (US) personal account, and a paused subscriber still has to be able to cancel in one click.
- Agent-facing commerce needs machine-readable offers *and* human consent checkpoints.

## What's next
- OAuth for subscriber identity on MCP, failed-payment recovery (dunning) using `capture` of the outstanding balance, A/B testing of offer strategies, and a PayPal app-marketplace style install for merchants.

## Built with
PayPal Subscriptions API · PayPal Catalog Products API · PayPal Webhooks · Claude Haiku 5.5 (Anthropic API) · Model Context Protocol · Next.js · TypeScript · Tailwind CSS · AG Grid · Vercel · Vercel Blob

## Links
- Repo: https://github.com/PDGamerSG/keepalive (public, MIT license)
- Hosted demo: https://keepalive.pallabdas.me
- Video: (YouTube URL)

## Built during the submission period
The project was created for this hackathon: the first commit is from 10 November 2026 and the KeepAlive app was scaffolded on 11 November 2026, inside the 1 October to 12 November 2026 submission period.

## Testing instructions for judges
Paste this into Devpost's testing-instructions field. No account or key is needed.

1. Open https://keepalive.pallabdas.me/shop, pick a plan and enter any name and email. Then either:
   - click **Try the instant demo (no PayPal login)** and **Agree and subscribe** on the simulated PayPal step, or
   - click **Subscribe with PayPal** and approve in the PayPal sandbox with a sandbox **Personal** test account (developer.paypal.com → Testing Tools → Sandbox Accounts). If the team shares a sandbox buyer, its login goes only in this private field, never in the repo.
2. On the return page click **Manage my subscription**, then **Cancel subscription**. Tell the assistant why you are leaving (for example "I'm travelling for two months" or "too much coffee") and accept or decline its offer. The PayPal status on the page changes after each action.
3. Open **/agent** to watch a customer's AI agent negotiate with the retention desk, approving or declining as the human.
4. Open **/merchant** to see saves, retained revenue, every conversation with the AI's private rationale, the guardrail settings and the PayPal call log.
5. To connect your own agent: `npx -y mcp-remote https://keepalive.pallabdas.me/api/mcp`, then ask it to cancel the subscription using its ID and the email you entered.
