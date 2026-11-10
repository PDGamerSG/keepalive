# KeepAlive: the AI retention desk for PayPal subscriptions

> When a subscriber, or their AI agent, tries to cancel, KeepAlive negotiates a fair save inside the merchant's limits and executes it live on PayPal.

**Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) (Nov 2026).** 🚧 Work in progress. See [docs/TEAM_GUIDE.md](docs/TEAM_GUIDE.md) for status.

## Why
- Subscription merchants lose revenue every time a cancel button is one click from gone. Retention tools such as cancel flows, pause offers and win-back discounts exist for Stripe, Braintree, Chargebee and Paddle. **Merchants who bill through PayPal Subscriptions have no such layer.**
- Consumers are starting to send **AI agents** to cancel subscriptions for them. Today a merchant has nobody to answer that agent.

## What it does
1. **Cancel flow with an AI retention agent (Claude).** It learns why the subscriber is leaving and proposes **one** fitting offer: a pause, a downgrade or a temporary discount.
2. **Deterministic guardrails.** The merchant sets limits such as maximum discount, maximum pause and a monthly discount budget. The AI proposes, and the policy engine decides.
3. **Executed live on PayPal.** A pause calls `suspend`, a downgrade calls `revise` (the subscriber re-consents inside PayPal) and a discount `PATCH`es the subscription price. Every result is read back from PayPal before we show success.
4. **Agent-to-agent channel (MCP).** A subscriber's own AI agent (Claude Desktop, etc.) can request cancellation, receive machine-readable offers, relay them to its human and accept or cancel, all under the same guardrails.
5. **Merchant dashboard.** Saves, MRR kept, reasons for leaving and a full PayPal audit trail.
6. **Cancel is always one click.** Click-to-cancel friendly by design.

## PayPal + AI at a glance (for judges)
| Capability | Where |
|---|---|
| PayPal Catalog Products + Billing Plans (bootstrap) | `src/lib/paypal/subscriptions.ts` → `ensureCatalog` |
| Create subscription + buyer approval | `createSubscription`, `/shop` |
| Suspend / activate (pause & resume) | `suspendSubscription`, `activateSubscription` |
| Revise plan with PayPal re-consent (downgrade) | `reviseSubscription` |
| Price override (temporary discount) | `setSubscriptionPrice` |
| Cancel | `cancelSubscription` |
| Webhooks with signature verification | `src/app/api/webhooks/paypal/route.ts` |
| Claude retention agent (structured outputs) | `src/lib/retention/agent.ts` |
| Claude consumer agent (tool use) | `src/lib/agents/consumer.ts` |
| MCP server for external agents | `src/app/api/mcp/[transport]/route.ts` |

## Run it locally
```bash
npm install
cp .env.example .env.local   # PayPal sandbox client ID/secret + ANTHROPIC_API_KEY
npm run dev
```
Then open http://localhost:3000. Full instructions are coming as the build completes.

## Docs
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how it's built
- [docs/TEAM_GUIDE.md](docs/TEAM_GUIDE.md): how we work, plus the status board
- [docs/STRATEGY.md](docs/STRATEGY.md): why this idea (hackathon research, past winners, competitors)
- [docs/archive/proofroute](docs/archive/proofroute): the earlier ProofRoute research, kept for reference

## License
MIT (see [LICENSE](LICENSE)).
