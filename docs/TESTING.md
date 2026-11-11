# Testing KeepAlive

See [RELEASE_QA.md](RELEASE_QA.md) for the current Vercel release checks and integration status. The manual results below are historical sandbox checks.

Test layers, each labelled honestly:

| Layer | Command | What it proves | Needs |
|---|---|---|---|
| Guardrail unit tests | `npm test` | Policy engine approves, clamps and rejects offers correctly (pause/downgrade/discount limits, budget, tenure, max offers, no repeats) | nothing |
| Engine integration tests (simulated PayPal) | `npm test` | Full session state machine: offer → PayPal call → read-back → outcome; scheduled resume and price restore; idempotency keys; no double execution; rationale never leaks | nothing (uses `tests/fake-paypal.ts`, an in-memory imitation of the PayPal endpoints) |
| Live AI eval | `npm run eval:ai` | Claude picks sensible, in-policy moves on 8 cancellation scenarios (asks first, pause for travel, downgrade for surplus, accepts a firm no, no policy leaks) | `ANTHROPIC_API_KEY` (costs a few cents) |
| Real PayPal sandbox, end to end | manual checklist below | The real Subscriptions API accepts our calls and states change on PayPal | PayPal sandbox keys + sandbox buyer account |

The simulated PayPal is **not** evidence that the real API behaves the same way. Only the manual sandbox checklist is.

## Sandbox accounts: read this first
- The **buyer** must be a sandbox **Personal account in the United States**. Create one in developer.paypal.com → Sandbox accounts → Create account → Personal → United States.
- Do not use the sandbox account that owns the REST app (the one whose Client ID is in `.env.local`). PayPal rejects it with "You are logging in to the account of the seller".
- An India-region Personal account logs in but then fails with a generic "Things don't appear to be working" page.
- If the dev server reports "credit balance is too low" while `npm run eval:ai` works, the server inherited another `ANTHROPIC_API_KEY` from its parent environment, and that wins over `.env.local`. Start it from a shell without that variable.

## Manual sandbox checklist (record results in the table)
1. `/merchant` → **Set up PayPal plans** → the PayPal activity tab shows the product + 3 plans created (201s).
2. `/shop` → subscribe (Standard) → approve with the sandbox personal account → the return page shows **ACTIVE**.
3. `/account/<id>` → Cancel → "travelling for 2 months" → accept **Pause** → the PayPal line says SUSPENDED; the sandbox business account also shows Suspended.
4. **Resume now** → ACTIVE.
5. Cancel → "too much coffee" → accept **Switch to Lite** → **Confirm in PayPal** → approve → back on the account page the notice says approved; after sync the plan is Lite (or "starts next billing cycle").
6. Cancel → "too expensive" → accept **discount** → price shows the discounted value; PayPal `GET` shows `plan_overridden: true`.
7. Cancel → decline offer → **cancel now** → CANCELLED on PayPal.
8. `/agent` → run all three presets; approve/decline in the human card.
9. MCP: `npx -y mcp-remote http://localhost:3000/api/mcp` from Claude Desktop → cancel a subscription by ID + email.
10. Webhooks (deployed URL only): sandbox app → Webhooks → add `<APP_URL>/api/webhooks/paypal` for `BILLING.SUBSCRIPTION.*` + `PAYMENT.SALE.COMPLETED`; set `PAYPAL_WEBHOOK_ID`; perform step 3; the activity log shows `webhook` events.

| Step | Result | Date / who | Notes |
|---|---|---|---|
| 1 | ✅ pass | 2026-11-11 Aditya + Claude | product + 3 plans created |
| 2 | ✅ pass | 2026-11-11 | I-EG44A5H9S43A ACTIVE after approval with US Personal buyer |
| 3 | ✅ pass | 2026-11-11 | Claude offered 2-month pause; PayPal read-back SUSPENDED |
| 4 | ✅ pass | 2026-11-11 | ACTIVE again |
| 5 | ✅ pass | 2026-11-11 | revise → buyer re-consent → plan Lite $12 confirmed by PayPal |
| 6 | ✅ pass (after fix) | 2026-11-11 | first run: PATCH applied but read-back missed the price; fixed with GET ?fields=plan. Then $15.40, plan_overridden true |
| 7 | ✅ pass | 2026-11-11 | declined downgrade → Claude accepted the no; later one-click cancel → CANCELLED. Found and fixed: cancel was disabled while paused |
| 8 | ✅ pass (Travelling, Firm cancel) | 2026-11-11 | Travelling: agent asked its human, approval → pause, SUSPENDED. Firm cancel: no offer pushed, CANCELLED on PayPal. "Too much coffee" not run separately (same downgrade path as step 5) |
| 9 | ✅ pass (raw JSON-RPC) | 2026-11-11 | request_cancellation refuses a wrong email; right email → downgrade offer; decline_offer works. Claude Desktop via mcp-remote not tried yet |
| 10 |  | | needs deployed URL |
