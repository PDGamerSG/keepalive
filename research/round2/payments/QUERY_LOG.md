# Payments query and navigation log

Specialist browser research captured November9 UTC / November10 IST,2026. The primary agent reconstructed this log from saved raw captures; it is not a claim that every navigation or attempted search was retained. Queries are decoded from captured Google URLs. No source application/payment was executed.

## Captured searches

- `site:developer.paypal.com "PayPal-Request-Id" "72 hours" "capture"` — [raw/Q1-search.json](raw/Q1-search.json); timestamp 2026-11-09T21:02:33.934Z.
- `site:developer.paypal.com "Transaction Search" "three hours"` — [raw/Q2-search.json](raw/Q2-search.json); timestamp 2026-11-09T21:02:34.412Z.
- `site:developer.paypal.com "AUTHORIZATION_ALREADY_CAPTURED" "PREVIOUS_REQUEST_IN_PROGRESS"` — [raw/Q3-search.json](raw/Q3-search.json); timestamp 2026-11-09T21:02:34.966Z.

## Opened and attempted sources

| Capture | Status | URL / retained evidence |
|---|---|---|
| [P01-negative-testing-overview](raw/P01-negative-testing-overview.json) | OPENED_TEXT | [PayPal negative testing overview](https://developer.paypal.com/negative-testing/overview) — Prefer specific REST headers guide; not actual provider effects. |
| [P02-negative-test-headers](raw/P02-negative-test-headers.json) | OPENED_TEXT | [PayPal REST negative response headers](https://developer.paypal.com/negative-testing/request-headers) — Sandbox-only simulated downstream response; not actual settlement. |
| [P03-typescript-server-sdk](raw/P03-typescript-server-sdk.json) | OPENED_TEXT | [Official TypeScript SDK](https://github.com/paypal/PayPal-TypeScript-Server-SDK) — Inspected2.5.0 reference; not installed/executed. |
| [P04-ap2-specification-live](raw/P04-ap2-specification-live.json) | OPENED_TEXT | [AP2 versioned payment specification](https://ap2-protocol.org/ap2/specification/) — Old root path404; compliance requires actual credential/role implementation. |
| [P04-ap2-specification](raw/P04-ap2-specification.json) | ERROR_PAGE | [AP2 versioned payment specification](https://ap2-protocol.org/specification/) — Old root path404; compliance requires actual credential/role implementation. |
| [P05-acp-checkout](raw/P05-acp-checkout.json) | ERROR_PAGE | [ACP documentation entry](https://www.agenticcommerce.dev/docs/checkout) — Overview only; stable-version detail comes from repository, not failed path. |
| [P05-acp-docs-live](raw/P05-acp-docs-live.json) | OPENED_TEXT | [ACP documentation entry](https://www.agenticcommerce.dev/docs) — Overview only; stable-version detail comes from repository, not failed path. |
| [P06-mcp-authorization](raw/P06-mcp-authorization.json) | OPENED_TEXT | [MCP authorization boundary](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization) — Transport authorization is not purchase intent; stdio differs. |
| [P07-owasp-prompt-injection](raw/P07-owasp-prompt-injection.json) | OPENED_TEXT | [Prompt injection controls](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) — Schema/delimiters/temperature alone do not establish security. |
| [P08-owasp-agent-security](raw/P08-owasp-agent-security.json) | OPENED_TEXT | [Execution-side agent authorization](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html) — Applies as design guidance; no penetration test performed. |
| [P09-owasp-ssrf](raw/P09-owasp-ssrf.json) | OPENED_TEXT | [SSRF boundary](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) — Avoid arbitrary URL fetch entirely in prototype; guidance not a test result. |
| [P10-owasp-csv-injection](raw/P10-owasp-csv-injection.json) | OPENED_TEXT | [CSV injection and spreadsheet limits](https://community.owasp.org/attacks/CSV_Injection) — No universal spreadsheet safety; preserve lossless JSON. |
| [P11-postgres-explicit-locking](raw/P11-postgres-explicit-locking.json) | OPENED_TEXT | [PostgreSQL locks](https://www.postgresql.org/docs/16/explicit-locking.html) — Cooperative local DB locks do not fence remote provider effects. |
| [P12-pg-boss-repository](raw/P12-pg-boss-repository.json) | OPENED_TEXT | [PostgreSQL queue option](https://github.com/timgit/pg-boss) — Choose one queue; retry guarantee is not exactly-once PayPal settlement. |
| [P12-pg-boss](raw/P12-pg-boss.json) | SELECTED_EXCERPT | [PostgreSQL queue option](https://pgboss.io/) — Choose one queue; retry guarantee is not exactly-once PayPal settlement. |
| [P13-paypal-sdk-retries](raw/P13-paypal-sdk-retries.json) | OPENED_TEXT | [SDK retries](https://github.com/paypal/PayPal-TypeScript-Server-SDK/blob/2.5.0/doc/retry-configuration.md) — Defaults require explicit policy; mutations not blindly retried. |
| [P14-acp-repository](raw/P14-acp-repository.json) | OPENED_TEXT | [ACP stable version/limits](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol) — Mutable main; protocol implementation does not imply platform distribution. |
| [P15-paypal-payments-errors-live](raw/P15-paypal-payments-errors-live.json) | OPENED_TEXT | [PayPal error semantics](https://developer.paypal.com/api/payments/v2/errors/auth_capture_currency_mismatch) — Old generic errors path not found; exact endpoint issue scope matters. |
| [P15-paypal-payments-errors](raw/P15-paypal-payments-errors.json) | ERROR_PAGE | [PayPal error semantics](https://developer.paypal.com/api/rest/reference/payments/v2/errors/) — Old generic errors path not found; exact endpoint issue scope matters. |
| [P16-paypal-authorization-honor](raw/P16-paypal-authorization-honor.json) | GENERIC_LANDING | [Authorization guide access attempt](https://developer.paypal.com/checkout) — Not a source for honor-period/reauthorization details; original S29 is the inspected guide. |
| [P17-paypal-transaction-search-live](raw/P17-paypal-transaction-search-live.json) | OPENED_TEXT | [Transaction Search lag and identity](https://developer.paypal.com/api/transaction-search/v1/search-get) — Detail URL404; reporting absence not proof no capture. |
| [P17-paypal-transaction-search](raw/P17-paypal-transaction-search.json) | OPENED_TEXT | [Transaction Search lag and identity](https://developer.paypal.com/api/transaction-search/v1) — Detail URL404; reporting absence not proof no capture. |
| [P17-transaction-search-details](raw/P17-transaction-search-details.json) | ERROR_PAGE | [Transaction Search lag and identity](https://developer.paypal.com/api/transaction-search/v1/transactions-list) — Detail URL404; reporting absence not proof no capture. |
| [P18-paypal-payments-migration](raw/P18-paypal-payments-migration.json) | PARTIAL_CAPTURE | [PayPal migration/capability guide](https://developer.paypal.com/api/rest/integration/payments-api/v1-v2-migration) — 42000 of46474 chars retained; conflicts with tagged Payments45day retention, recorded explicitly. |
| [P19-acp-checkout-rfc](raw/P19-acp-checkout-rfc.json) | OPENED_TEXT | [ACP checkout RFC](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol/blob/main/rfcs/rfc.agentic_checkout.md) — Current proposals may exceed latest stable; do not claim compliance. |
| [P20-postgres-row-security](raw/P20-postgres-row-security.json) | OPENED_TEXT | [Tenant RLS caveats](https://www.postgresql.org/docs/16/ddl-rowsecurity.html) — Owner checks still required; no isolation test performed. |
| [P21-paypal-capture-sdk-reference](raw/P21-paypal-capture-sdk-reference.json) | ERROR_PAGE | [Capture SDK documentation attempt](https://developer.paypal.com/sdk/payments/v2/authorizations-capture) — No capture implementation evidence from this path; use P24/S38. |
| [P22-paypal-void-sdk-reference](raw/P22-paypal-void-sdk-reference.json) | ERROR_PAGE | [Void SDK documentation attempt](https://developer.paypal.com/sdk/payments/v2/authorizations-void) — No void implementation evidence from this path; use P24/S39. |
| [P23-paypal-authorize-sdk-reference](raw/P23-paypal-authorize-sdk-reference.json) | OPENED_TEXT | [Orders authorize SDK reference](https://developer.paypal.com/sdk/orders/v2/orders-authorize) — Specific Orders SDK reference, not universal retention. |
| [P24-paypal-sdk-payment-controller](raw/P24-paypal-sdk-payment-controller.json) | OPENED_TEXT | [Tagged Payments controller](https://github.com/paypal/PayPal-TypeScript-Server-SDK/blob/2.5.0/doc/controllers/payments.md) — Override finalCapture:false/minimal examples; retention conflict with P18 remains. |
| [P25-paypal-create-order-recheck](raw/P25-paypal-create-order-recheck.json) | OPENED_TEXT | [Create order REST recheck](https://developer.paypal.com/api/orders/v2/orders-create) — Documentation not account capability or execution proof. |
| [P26-paypal-sdk-orders-controller](raw/P26-paypal-sdk-orders-controller.json) | OPENED_TEXT | [Tagged Orders controller](https://github.com/paypal/PayPal-TypeScript-Server-SDK/blob/2.5.0/doc/controllers/orders.md) — SDK camelCase serialization differs from REST; not executed. |
| [P27-ap2-agent-authorization](raw/P27-ap2-agent-authorization.json) | OPENED_TEXT | [AP2 authorization roles](https://ap2-protocol.org/ap2/agent_authorization/) — No model boolean is authority; current agent-to-agent delegation out of inspected spec scope. |
| [P28-paypal-authorization-status](raw/P28-paypal-authorization-status.json) | OPENED_TEXT | [Authorization status enum](https://developer.paypal.com/api/payments/v2/definitions/authorization_status) — CREATED/CAPTURED/DENIED/PARTIALLY_CAPTURED/VOIDED/PENDING; no EXPIRED enum. |
| [P29-paypal-capture-status](raw/P29-paypal-capture-status.json) | OPENED_TEXT | [Capture status enum](https://developer.paypal.com/api/payments/v2/definitions/capture_status) — COMPLETED/DECLINED/FAILED/PENDING/PARTIALLY_REFUNDED/REFUNDED; preserve fact distinctions. |
| [P30-pg-boss-adapters](raw/P30-pg-boss-adapters.json) | OPENED_TEXT | [Transactional queue enqueue](https://pgboss.io/api/adapters) — Atomic DB journal+enqueue only; HTTP cannot roll back. |
| [P31-paypal-inflight-error](raw/P31-paypal-inflight-error.json) | OPENED_TEXT | [In-flight request error](https://developer.paypal.com/api/payments/v2/errors/previous_request_in_progress) — Backoff/reconcile; not definitive no effect. |
| [P32-pgbouncer-features](raw/P32-pgbouncer-features.json) | OPENED_TEXT | [Session pooling compatibility](https://www.pgbouncer.org/features.html) — Transaction pooling incompatible with chosen session lock design. |
| [P33-paypal-capture-get](raw/P33-paypal-capture-get.json) | OPENED_TEXT | [Authoritative capture linkage](https://developer.paypal.com/api/payments/v2/captures-get) — Fields may be absent; fetch linked resources rather than inventing facts. |
| [P34-paypal-capture-schema](raw/P34-paypal-capture-schema.json) | OPENED_TEXT | [Capture/adjustment schema](https://developer.paypal.com/api/payments/v2/definitions/capture) — Append partial refund/reversal observations; copied JSON is not independently authenticated. |

Missing retrieval timestamps were not invented. Duplicate rendered attempts/code excerpts are counted as separate captures, not separate projects or distinct resources. Full details and hashes: [SOURCES.json](SOURCES.json).
