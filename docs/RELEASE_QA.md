# KeepAlive release verification

Date: 2026-11-11. Production origin: https://keepalive.pallabdas.me.

## Automated checks

- `npm test`: 55 passing offline tests. The 8 paid Claude evaluations are skipped by this command.
- `npm run lint`, `npm run typecheck`, and `npm run build` are release gates.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Earlier live Claude evaluation: 8 scenarios passed; provider usage recorded 11,249 cache-read tokens. This UI release preserves the stable cached prompts. Cache configuration and persisted consumer runs also have offline regression coverage.

Offline coverage includes policy limits, pause/resume, downgrade approval, discounts and price restoration, cancellation while paused, concurrent offer acceptance, private rationale, durable storage conflicts, cron authorization, checkout validation, policy authorization, webhook verification/deduplication/retry, and the consumer agent's explicit human-approval requirement. Unknown subscriptions are rejected before an AI call; the agent's step limit reports an unfinished run.

## Browser checks

The landing page, dashboard, shop, account portal, and agent demo share burgundy, warm cream, mint actions, and Fraunces headings. Desktop and mobile layouts were checked, including header widths of 390, 641, 700, 768, and 1280 pixels. The populated subscriber grid stays within the mobile document width and scrolls its own columns.

Verified interactions:

- Dashboard tabs by keyboard; empty states; populated subscriber rows; conversation expand/collapse; activity entries.
- Guardrail save; native numeric-range rejection; simulated connection failure followed by a successful retry.
- Shop plan selection, selected price, invalid email detection, and unavailable-checkout state.
- Agent presets, editable brief, MCP configuration disclosure, unavailable-service state, and initial navigation without an unwanted scroll.
- Paused/cancelled account states; resume-error retry; retained message draft and enabled send button after a simulated connection failure.
- Themed missing-page navigation and landing 3D stage readiness.
- MCP initialization, tool discovery, rejection of a wrong email, and lookup with matching ID/email.

Populated browser states used explicitly named fixtures in `/tmp/keepalive-ui-qa`, separate from hosted Blob storage. Message failure testing replaced browser fetch only on the local page. Automated payment tests use `tests/fake-paypal.ts`. These checks do not prove that PayPal accepted a real transaction.

## Payment integration status

The supplied screenshots contain sandbox account emails/passwords. They are stored in the ignored, private `.env.local`; they are separate from a PayPal REST application's client ID and secret.

The current hosted environment has Claude, private Blob storage, the application URL, sandbox mode, and the authenticated cron configured. It has no PayPal REST client ID/secret or registered webhook ID. Checkout and the live agent demo therefore show their unavailable states. Real hosted checkout, payment mutations, and webhook delivery have not been verified for this release. Historical sandbox results in [TESTING.md](TESTING.md) describe the earlier developer environment.

The Vercel and DNS configuration is documented in [DEPLOYMENT.md](DEPLOYMENT.md).
