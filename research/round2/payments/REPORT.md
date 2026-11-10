# Payment, reliability, security, and protocol audit

Research date: November 10, 2026 IST / November 9, 2026 UTC. This is a bounded public-source audit of a proposed implementation, not a payment, penetration test, production approval, or executed application verification. Research used the T3 browser in an owned background tab, rendered text and links, and local project reads. No account login, API mutation, payment, publication, or application implementation was performed.

The single-seller USD 4.50 AUTHORIZE → local solve → independent verification → stored artifact → capture workflow remains technically feasible in PayPal sandbox. Its strongest additional depth is a defensible settlement decision and recovery record, linked to a useful dispatch result. The existing design already avoids escrow, guaranteed settlement, exactly-once, and trustless claims; retain those boundaries.

## Priority corrections for the implementation handoff

| Priority | Current contract location / problem | Required correction | Basis |
|---|---|---|---|
| P0 | Technical contracts §5/§9: event ID UNIQUE before verification can let an unauthenticated request occupy a legitimate ID | Separate received envelopes from verified event deduplication. An unverified claimed ID must never suppress verification of a later delivery. See the exact inbox design below. | S45 verifies authenticity, not database admission. P07/P08 establish untrusted-input and execution-boundary controls. The poisoning attack is an inference from the proposed uniqueness rule, not a reported PayPal vulnerability. |
| P0 | §3/§6: work deadline starts at authorizationRecordedAt, which can be late after a lost response/restart | Persist authorizationStartedAt immediately before the first authorization send; never update it on retries/reconciliation. Set workDeadlineAt once to authorizationStartedAt + 120 seconds. Include provider network time, exclude time the buyer spends approving. A recovered authorization after that deadline is cleanup work, not a new solve budget. | Proposed conservative semantics; S29/S47 expose provider create_time/expiration_time, and durable journaling already exists. |
| P0 | §7 says to confirm request-ID retention later; generic guides can be misread as universal | Store endpoint-specific retry evidence/policy. Orders SDK references document 6 hours; tagged Payments SDK documents 45 days for capture and void; a newer migration guide broadly says v2 6 hours. Current REST pages omit a duration. Treat the discrepancy explicitly; use only short, approved same-operation retries and resource reads afterward. Never rotate an unknown capture's key. | P23/P24/P26 vs P18; S27 says retention is API-specific. |
| P0 | §7 does not explicitly require full response preference | Send Prefer: return=representation where full mutation response data is consumed. Still support minimal replies and void 204 without parsing a body; use linked GETs for missing required facts. | P18, P24, P26; S38/S39/S43. |
| P0 | §7 says a captured authorization cannot be voided | Exact provider rule is fully captured. Partially captured authorizations exist. For this one-final-capture product, any unexpected partial or extra capture becomes a financial incident; voiding the remainder cannot undo captured money. Never label it no charge or refunded. | S39, P24, P28/P29. |
| P0 | §6 suggests authoritative authorization EXPIRED status | Current authorization status schema has CREATED, CAPTURED, DENIED, PARTIALLY_CAPTURED, VOIDED, PENDING; no EXPIRED. If the UI uses EXPIRED, label it as derived from expiration_time plus fresh reconciliation and preserve actual provider status. Do not wait for a nonexistent status/event. | P28. |
| P0 | PaymentAdjustment enum omits partial refunds and amount | Record adjustment facts with provider ID, amount, currency, status, observed time and linked capture. Include PARTIALLY_REFUNDED/FAILED in capture handling; authorization DENIED is a different resource state. Preserve historical completed-capture fact after refund/reversal. | P29, P33/P34, S44. |
| P0 | §8: dedicated connection is underspecified for pooled cloud DBs | Session advisory locks require a direct PostgreSQL connection or session pooling. PgBouncer transaction pooling does not support session advisory locks. Connection loss can release a lock while an HTTP request still reaches PayPal: a lease is never provider fencing. | P11/P32. |
| P1 | CSV escaping lists only ASCII = + - @ | Apply safe CSV encoding to every textual cell, including stop/vehicle IDs; cover separators, quotes, CR/LF/tab and full-width formula starts. Publish lossless JSON as the machine format. Do not promise universal CSV safety across spreadsheet apps or save/reopen behavior. | P10. |
| P1 | Optional MCP lacks a precise identity/consent boundary | Derive actor from authenticated transport identity, authorize every tool execution against task ownership, and never accept actorId or user_confirmed from the model as authority. Keep PayPal approval and finance execution outside MCP. | P06/P08; exact proposal below. |

## Safe lifecycle and the information needed at each step

1. Review and freeze. The human sees normalized constraints, units, model limits, one seller, USD 4.50, the 15-minute approval deadline, and that acceptance means feasibility under the supplied matrix. Store canonical bytes, hashes, actor consent and policy/version. An LLM output cannot edit amount, seller, deadlines, approval, or payment state.
2. Create order. Commit one logical CREATE_ORDER operation and its request/body hash before sending. Intent is AUTHORIZE and one purchase unit (S42). Amount, payee and custom_id come from the frozen server record. Persist returned order ID; verify authoritative intent, amount, payee and task binding before exposing approval.
3. Buyer approval. The browser callback is a request to check/authorize the stored order; it is not evidence of approval. Match actor, task and stored order ID, then confirm provider approval through server-side processing (S43). A model-supplied flag, payer ID or redirect query cannot grant this permission.
4. First authorization send. Under the financial lane lock, persist immutable authorizationStartedAt and workDeadlineAt before HTTP. Do not include buyer thinking time in this budget. Set the operation IN_FLIGHT before send, with frozen body, stable request ID, first_sent_at and retry-policy provenance.
5. Authorization observation. Validate the returned order graph and authorization amount/currency/payee. Store authorization ID separately, provider create_time and expiration_time, actual status, observation time and provenance. CREATED maps to application AUTHORIZED only after binding checks (S43/S47); order COMPLETED alone never means paid.
6. Compute or clean up. Queue solve only if the stable deadline remains open and cancellation was not accepted. Recovery of a hold after the deadline schedules eligible cleanup; it does not restart computation. Before a second solve, check remaining time. The solver and AI do not receive payment credentials.
7. Accept a candidate. In one locked transaction, persist artifact and independent report, recheck all hashes/versions, deadline, amount/payee, cancellation and authorization eligibility, reserve CAPTURE, create the logical operation and queue it. A failing report cannot create a capture decision.
8. Execute settlement. Re-read the current operation/decision while holding a task-level financial lane on a dedicated session. Use the exact stored ID/body/key. Set amount USD 4.50 and final_capture:true explicitly; the SDK sample defaults are unsafe to copy for this product (P24). Do not keep a SQL transaction open during provider HTTP.
9. Observe completion. Require a linked capture COMPLETED, exactly USD 4.50 to the expected payee, with no contradictory/extra capture evidence. P33 shows supplementary_data.related_ids.order_id and authorization_id, payee.merchant_id, amount, status and final_capture in a GET example. Do not assume every field is present; fetch linked resources from fixed hosts and server-stored IDs when needed. Atomically persist the completed fact and release the already stored artifact.
10. Reconcile ambiguity. A timeout, connection loss, 5xx, malformed body, unknown status, failed local commit after a valid provider response, or PREVIOUS_REQUEST_IN_PROGRESS never proves no money moved. Preserve the chosen lane; read order/auth/capture and retry only the same logical operation inside its bounded policy. No fresh key, second checkout, opposite void or automatic refund may resolve uncertainty.
11. Fail safely. A definitive failed capture is eligible for compensating void only after fresh, correctly linked provider observations establish no completed/pending/partial capture. Otherwise keep reconciliation open. Authorization DENIED, capture DECLINED and capture FAILED are distinct evidence; do not infer their equivalence from HTTP code alone.
12. Release hold honestly. VOID_PENDING stays pending until a matching authorization read confirms VOIDED. A 204 is a valid successful response without a JSON body, but it does not justify invented details. A captured or partially captured amount remains a financial fact even when a remaining hold is voided.
13. Record later changes. Verified refunds/reversals append facts and adjust the receipt, never erase the original capture or released artifact. Released route feasibility remains checkable; payment finality is a separate, time-sensitive observation.

### Conservative deadline semantics

Proposed immutable fields are authorization_started_at, work_deadline_at, authorization_provider_created_at, authorization_expires_at and authorization_first_observed_at. Only the first authorization-send transaction sets the first two. Retries must not move them forward.

A provider create_time is a cross-check, not the new clock origin. Parse it as a real timestamp, store it and compare with the first send / receive interval using an explicit small clock-skew policy. If the provider claims an unexpectedly old or future authorization, preserve the observation and stop automatic work pending investigation. Check expiration_time before capture. Timestamp absence is not permission to fabricate values.

After the quote deadline or work deadline, reads and cleanup remain allowed; do not replay an uncertain AUTHORIZE as a way of discovering its result. If the first request never reached PayPal, such a replay could create a fresh late hold. Reconcile the stored order first and surface unresolved evidence when it cannot establish whether an authorization exists.

The 120-second promise concerns acceptance and capture reservation, as the current contract specifies. A pending/uncertain provider capture can settle later. The UI must say this clearly and distinguish Work accepted from Payment completed. If an absolute latest-charge deadline is added, freeze it in consent and guard first sends and retries independently; do not silently reinterpret the work deadline as one.

## Request-ID retention: exact evidence and conservative policy

| Endpoint | Inspected endpoint-specific evidence | Current REST rendering | Safe implementation reading |
|---|---|---|---|
| POST /v2/checkout/orders | Tagged official SDK createOrder docs: 6 hours, extendable to 72 through Account Manager (P26) | S42 / P25 generic idempotency header, no duration | Persist one key; short retries only. 72 hours is not an automatic sandbox entitlement. |
| POST /v2/checkout/orders/{id}/authorize | Official SDK endpoint P23 and tagged authorizeOrder P26: 6 hours / 72 by agreement | S43 generic header, no duration | Same logical operation/key; stop mutation retries when quote/work freshness no longer permits first execution. |
| POST /v2/payments/authorizations/{id}/capture | Official SDK tag 2.5.0 captureAuthorizedPayment: 45 days (P24) | S38 generic header, no duration | The newer broad v2=6-hour statement in P18 conflicts. A proposed 15-minute cap is below both documents but is still a local policy, not a proved provider SLA. |
| POST /v2/payments/authorizations/{id}/void | Official SDK tag 2.5.0 voidPayment: 45 days (P24) | S39 generic header, no duration | Keep same key and body; verify VOIDED. Document the same conflict. |

S27 explicitly says to consult the API for whether the header is supported and how long IDs are stored; a simultaneous same-ID request can fail, and retry responses represent current resource status. None of these sources grants indefinite deduplication or exactly-once settlement. P18's prose telling readers to generate fresh keys must not be interpreted as permission to rotate an unresolved capture's logical identity.

Add a versioned endpoint capability record to configuration / runbook, not a new service: endpoint path/method, source/version/date, documented retention, discrepancy note, automatic retry cap, and retry deadline calculated from immutable first_sent_at. On an unconfirmed/changed endpoint contract, automatic mutation replay defaults to disabled; GET reconciliation remains enabled. If the implementation accepts P24/P26 as evidence, its explicitly documented 15-minute cap fits both published durations. Keep this choice visible in measured results.

## Authorization, capture, void and adjustment mapping

S29 says authorizations are valid for 29 days, recommends capture within the three-day honor period, and states that capture remains subject to risk and money availability. This is not a payout guarantee or escrow. Actual expiration_time is the resource fact. The two-minute prototype should not implement reauthorization: reauthorization creates a new authorization ID and money/consent complexity.

| Resource / status | Local consequence |
|---|---|
| Order APPROVED | Eligible to attempt the stored AUTHORIZE operation only within consent/freshness guards. No payment completion. |
| Order COMPLETED | Inspect linked resources. An AUTHORIZE order can be completed with only an authorization. |
| Authorization CREATED | AUTHORIZED after exact binding checks; retain expiry and any known capture facts. |
| Authorization PENDING | Await/reconcile; no solve/capture/release based on a guessed hold. |
| Authorization DENIED | Authorization declined. No capture; reconcile any ambiguity from earlier requests. |
| Authorization CAPTURED | Reconcile capture resources. This status alone cannot release an artifact. |
| Authorization PARTIALLY_CAPTURED | Unexpected for this product: incident, output withheld, reconcile all captures and totals. A void only releases remaining authorization. |
| Authorization VOIDED | Record closed hold. Do not overwrite a completed-capture fact from another valid observation. |
| Authorization expiration_time passed | Derived expiry only after resource reconciliation; do not expect provider EXPIRED enum. |
| Capture PENDING | CAPTURE_PENDING. Withhold output; record status_details and poll. |
| Capture COMPLETED | Release only after exact binding, amount and stored accepted-artifact checks. Gross amount, not seller net, must equal 450 cents. |
| Capture DECLINED / FAILED | Distinct definitive resource observations, followed by no-effect checks before a void decision. |
| Capture PARTIALLY_REFUNDED / REFUNDED | Preserve capture history; append adjustment amount/ID/status. Do not restore a paid/download entitlement by rewriting past events. |
| PAYMENT.CAPTURE.REVERSED event | Verified event hint → read/reconcile and record an adjustment; REVERSED is not listed in current capture_status enum (P29). |

Unexpected extra captures, wrong merchant, wrong amount/currency, mismatched order/auth relationships, or a missing immutable accepted artifact are incidents. Do not silently fit them into normal success/failure. Keep totals per currency in checked integer minor units; never add USD and another currency, subtract fees to decide whether the customer paid 450 cents, or equate a void with a refund.

## Webhook admission, authenticity, replay, and acknowledgement

The current persist-then-verify approach is sound only if admission cannot poison authenticated identity.

Proposed tables:

- webhook_envelopes: local UUID primary key; received_at; environment and app configuration selected by server route; bounded exact raw body; raw_body_sha256; required bounded header fields; claimed_event_id and transmission_id explicitly untrusted; verification state PENDING/VALID/INVALID/ERROR; verification attempts; processing link.
- verified_webhook_events: server-configured provider/environment/app identity + provider_event_id unique; verified envelope ID; authenticated payload hash; event_type/resource ID; verified_at; durable processing state. Only a successful authenticity check can insert here.
- Keep identical-delivery dedup optional and keyed by a hash of body plus signature-relevant headers, never solely by claimed_event_id. Include transmission headers because a genuine redelivery can have different signatures/transmission metadata.

HTTP flow: enforce method/content type/body/header bounds; insert envelope and verification job in the same commit; acknowledge 200/202 after that durable commit. Return a non-2xx on temporary DB failure. Reject malformed/oversized/rate-limited input with suitable 4xx. If storage capacity is exhausted, do not falsely acknowledge a dropped event.

Worker flow: call the fixed sandbox verify-webhook-signature endpoint using the configured webhook ID, original event and required transmission headers. Only verification_status:SUCCESS can promote. Transient verifier failures retry internally; a received event remains quarantined without money effects. A definitively invalid envelope can be retained briefly for diagnostics and then expired; it never reserves the verified event ID.

After promotion, a unique verified ID deduplicates processing across workers. A later successful verification of the same ID with a different payload hash is an incident requiring reconciliation, not an overwrite or blind second application. Treat authenticated events as hints: resolve the stored order/auth/capture, fetch authoritative resources, validate amounts/payee/relationships, and apply the same monotonic financial facts as the REST path.

S45 says deliveries can retry up to 25 times over three days. A blanket five-minute timestamp-rejection rule would reject legitimate retries. Signature validity is not freshness or one-time execution; verified-event dedup must outlive the supported retry window (plus clock skew and the chosen recovery/retention policy). Do not use timestamps alone as replay protection. Keep payment-operation and completed-capture records for their business retention period even after raw event PII is deleted.

S45 says simulator mock events are not postback-verifiable. Keep three evidence classes separate: fake-provider fixtures, simulator transport tests, and real sandbox events generated by this app. None should be relabeled as the others.

Use the existing postback strategy for the prototype. If local signature verification is added later, S45's certificate download example must be hardened: certificate URL comes from an untrusted header until verified. Apply fixed host/path policy, HTTPS, response size/time/cache bounds and no unchecked redirects; do not create an arbitrary URL fetcher. P09 supports these controls. Signature verification does not authenticate an offline exported payment receipt.

## PostgreSQL jobs, locks, and viable implementation resources

The operation journal, guarded state transitions and stored result are the financial protocol. The job runner is a delivery mechanism. Keep those responsibilities explicit even if a library supplies the queue.

P11: advisory locks are cooperative; session locks survive transaction rollback and need a matching unlock for every acquisition. They are released at session end. Use a dedicated checked-out direct/session-pooled connection, stable task lock key/namespace, bounded lock acquisition and finally cleanup. Do not return a locked connection to the general pool. Avoid lossy JavaScript Number conversion of 64-bit lock keys.

P32: PgBouncer transaction pooling explicitly does not support session advisory locks. A local direct PostgreSQL 16 connection is the simplest baseline. If a cloud provider exposes only transaction pooling, use its direct endpoint for this lane or choose a different explicitly designed serialization mechanism; a regular connection object is not proof of a stable backend session.

Failure cases to handle:

- Lease expires while worker is alive: no fresh financial operation; successor re-reads the reserved lane.
- Database connection drops after HTTP starts: remote effect may still complete; stop further sends, retain IN_FLIGHT/UNKNOWN journal and reconcile. AbortController cancels local waiting, not the provider transaction.
- Provider succeeds, local commit fails: successor recovers by same operation/key/resource reads, not repeating a new capture.
- Deadlock/serialization failure: retry the short database transaction; never wrap a provider call in a generic transaction-retry closure.
- Solver blocks event loop or exceeds timeout: independent subprocess watchdog; queue heartbeat is not the solver's runtime limit.
- Worker sees stale version: do not commit its derived state, but preserve/forward received provider evidence for reconciliation where possible; a lost local fence does not invalidate a real remote capture.
- Session lock collision between different task hashes: may reduce concurrency, but must never cause a skipped lane check. Use consistent task/payment/decision lock order.

pg-boss is a viable optional replacement for the custom jobs table, not an additional queue beside it. The maintained project currently documents Node >=22.12 / PostgreSQL >=13 (P12; site shows 12.38.1). P30 provides fromDrizzle(tx, sql) so journal/decision writes and boss.send occur in one transaction, and rollback also removes the job. This reduces hand-written lease/retry code. Pin a compatible version after checking local Node. Keep HTTP effects outside transactional worker callbacks: PostgreSQL rollback cannot roll back PayPal. Queue retry guarantees do not establish exactly-once external effects.

If the custom queue is retained for time, prove claim/heartbeat/fencing/sweep behavior with real PostgreSQL tests. Do not implement LISTEN/NOTIFY, the dashboard, proxy and multiple backends solely because the library advertises them.

## Client libraries, samples, and provider error testing

Use one narrow PayPalGateway behind the existing interface. Either direct fixed-host REST with Node fetch or the official pinned @paypal/paypal-server-sdk can work. Do not maintain two production adapters. The tagged SDK is a useful reference even if direct REST is chosen.

P03/P13/P24/P26 show these integration details:

- Official repository recommends @paypal/paypal-server-sdk@2.5.0 at inspection; controllers cover Orders and Payments plus other products. Pin the actual version used and review its generated types.
- Client timeout defaults to 0; explicitly set the planned 10-second timeout.
- Logging examples enable request body/response headers. Replace them with redacted metadata before copying.
- SDK model properties are camelCase (finalCapture, currencyCode), REST JSON is snake_case (final_capture, currency_code). Verify actual serialized request shape in adapter tests.
- Payments sample uses finalCapture:false and prefer:return=minimal. Override finalCapture:true, exact 450-cent amount, stable paypalRequestId, and return=representation for this product.
- Retry configuration documents maxNumberOfRetries:0, retryOnTimeout:true and default retry methods GET/PUT. Explicitly configure mutation behavior; never add unjournaled generic POST retries.
- Webhook signature verification is not listed among these SDK controllers; keep the fixed REST postback path rather than assuming it exists.

P02 documents PayPal-Mock-Response with JSON mock_application_codes for Orders v2 and Payments v2 create/authorize/capture/void/resource reads. It is sandbox-only and does not call downstream services. Add a dedicated negative-test configuration that cannot be enabled by browser/model input and never enable it on the real happy-path evidence run. P01 labels negative testing beta and mixes classic-account setup instructions; P02 is the more specific REST-header procedure.

P31 explicitly documents PREVIOUS_REQUEST_IN_PROGRESS and advises spacing requests. This is backoff/reconciliation, not a permanent decline. P15 documents AUTH_CAPTURE_CURRENCY_MISMATCH; request body repair must not silently create a new logical authorization/capture on a different frozen quote.

Required deterministic provider-adapter cases: minimal body; void 204; 200 replay vs 201 first response; 401 refresh before send; 403 permission refusal; 404 linked-resource uncertainty; 409 previous request in progress; 422 authorization expired/voided/already captured/currency mismatch where the current endpoint documents that exact issue; 429/backoff; 5xx; timeout before commit; timeout after commit; malformed/truncated response; wrong merchant/amount/order/auth; pending capture then completion; failed capture then proved-no-effect void; partial capture; partial refund; reversal; old valid webhook; forged-ID poisoning; lost DB connection while HTTP proceeds; stale worker commit. Document issue codes from the endpoint used rather than assuming one global error taxonomy.

Fake-provider timeout-after-commit tests prove local protocol behavior. PayPal negative testing proves selected provider response handling. Real sandbox capture/void and actual app webhooks prove integration. Reporting must keep those evidence types separate.

## Agent protocols and exact optional MCP boundary

| Protocol | What the primary source actually provides | Appropriate ProofRoute use / limit |
|---|---|---|
| AP2 v0.2 (P04/P27) | Trusted Surface MUST be deterministic. Checkout and Payment mandates are cryptographic credentials; merchant/processor verification is deterministic. Closed mandates bind to merchant-signed checkout; unknown constraints fail; receipts are signed. Agent-to-agent delegation is explicitly outside current specification. | Borrow exact constraint evaluation and reviewed-consent discipline. Current hash + database consent + PayPal approval is not an AP2 mandate chain or compliance proof. Do not call the app AP2-compatible without implementing and testing the actual versioned profile and role responsibilities. |
| ACP (P05/P14/P19) | Open checkout interface. Repo says beta and latest stable 2026-04-17; main RFC is mutable and contains newer proposals. Checkout idempotency scopes authenticated identity + endpoint; exact body equivalence; recovery points for foreign mutations. | Keep internal service interfaces adaptable. Do not expose a superficial checkout route and claim ACP compliance, list automatically in ChatGPT, or transplant ACP idempotency into PayPal retention assumptions. Public implementation and platform distribution are different things. |
| MCP 2025-11-25 (P06) | HTTP OAuth authorization, protected-resource metadata, resource indicators, token audience validation, PKCE and no token passthrough. Transport/tool access is not purchase-specific user intent. Stdio deployments have a different authorization environment. | If optional remote MCP is added, use maintained authentication support and exact audience/issuer/scope checks, then owner checks on every tool execution. Do not pass PayPal OAuth tokens through as MCP tokens. |

Recommended P1 read-only tools are get_task_status, list_acceptance_checks and get_released_receipt. Each resolves actor from verified token subject/issuer mapping, uses server-enforced task ownership, applies task release guards, limits payload size, and records client ID/tool/scope/target/request ID. A model-supplied actorId, tenantId, role or user_confirmed parameter never grants authority. Tokens should grant tasks:read and/or receipts:read only; tool discovery is not permission and execution rechecks current scope/ownership. Tools cannot call create-order, authorize, capture, void or refund.

If draft creation/proposal tools are later desired, add a separate drafts:write scope with no financial effects. Human UI review freezes the contract and PayPal displays the actual seller and amount. Keeping approval in the browser is a product boundary, not an approval question for this research.

If action approvals are added, bind actor, transport client/tool, task, normalized parameter hash, contract hash, expiry and policy version. Atomically consume approval into one logical operation; retries refer to that operation rather than reusing a boolean or consuming approval repeatedly. A changed target/amount/contract requires new review. P08 explicitly requires execution-side verification and atomic consumption.

## Security controls that matter for this product

Prompt injection: P07 stresses that delimiters, keyword filters, low temperature and schema validity are not security boundaries. A malicious brief or CSV label may still produce schema-valid bad constraints. The strong boundary is the existing proposal allowlist + source-span checks + human reviewed freeze + deterministic verifier + no payment tools/credentials in the model. Test direct, indirect, encoded, multilingual and benign cases with instrumented no-money tools, and report observed outcomes rather than a security score.

SSRF: prohibit fetching URLs from briefs, rows, artifacts or model output. Construct provider paths from fixed sandbox base and validated stored IDs. Constrain approval redirects to exact trusted sandbox hosts/path policy; disable automatic HTTP redirects for backend provider calls. Validate Ollama configuration as loopback on startup; no user/model override. A postback signature verifier needs no application-side fetch of paypal-cert-url. P09 explains why domain allowlists alone do not solve DNS rebinding when arbitrary URLs are accepted; the best prototype choice is not to accept them.

CSV: encode cells correctly and decide whether the CSV targets humans or machines. P10 says no universal spreadsheet sanitization exists; Excel can remove common escapes on save/reopen. Prefix dangerous human-view text as required by the supported spreadsheet policy and include a note that the canonical JSON bundle preserves exact labels. Do not use CSV as the signed/hash-authoritative data.

Tenant isolation: authenticate every read/download/event/AI endpoint and owner-scope joins to artifact, report, payment and event records; IDs are not authorization. Worker jobs derive owner from the stored task, never the payload. Never share a global AI history across tenants. Test actor B against actor A's status, events, receipt, CSV, draft revision, cancel and proposal routes. If RLS is added, P20 says table owners and BYPASSRLS/superuser roles normally bypass it; use a distinct runtime role, understand FORCE ROW LEVEL SECURITY and pooled-session context, and keep service ownership checks. Merely enabling RLS is not a tenant-isolation proof.

Audit/export: logs may contain prompts, PayPal debug IDs and personal information. Redact before UI/export, cap length, render as text and preserve event metadata/source. An append-only application table is not immutable against a database administrator. A hash chain can reveal some edits only if a trusted earlier anchor is retained outside that database; it does not establish third-party payment authenticity.

## Operator audit and related depth worth building

Keep a compact authenticated operations view in the same application:

- Reconciliation queue: task, last confirmed financial facts, selected settlement lane, first-send age, last provider read, next retry, automatic retry deadline, incident reason.
- Evidence panel: contract/input/artifact/report hashes, reason capture or void was selected, exact successful acceptance checks, provider links/IDs redacted for the viewer, observation source/time, gross/fee/net separately when present.
- Actions: Reconcile now and Retry eligible same operation only. Both invoke the same guarded service. No force capture, mark paid, rewrite provider status, delete incident or release artifact override.
- Audit replay: reconstruct state from stored decision/operation/observation facts and compare with the current projection. Flag contradictions and missing durable artifact/report; never invent history to make the projection agree.
- Drill-down fault lab: labelled missing stop, wrong contract hash, lost response after provider commit, webhook poisoning, stale webhook and restart recovery. Every injected outcome is labelled, and mutation controls remain behind the real settlement guard.
- Export an incident report with source revision, policy version, canonical hashes, timestamps, operation IDs, observed statuses and remaining unknowns. Public bundle omits credentials/PII and says payment evidence is seller-observed sandbox data.

These features add substantial engineering depth to dispatch assurance and receipts without introducing arbitrary microservices, extra money recipients, autonomous buying, or a second payment product.

Proposed small operator endpoints: GET /api/ops/reconciliation with filters/pagination; POST /api/ops/tasks/:id/reconcile returning an existing/deduplicated read job; GET /api/ops/tasks/:id/evidence returning a redacted report; optional POST /api/ops/operations/:id/retry only after endpoint policy/lane/identity/deadline checks. Actor is an explicit operator role; ordinary task owners cannot grant it. App access code is acceptable for the local judge prototype, not evidence of production authentication.

Transaction Search (P17) can support a later audit report, not the release decision. Its transactions can take up to three hours to appear, it requires reporting/search/read scope, and transaction IDs are not unique within reporting (balance-affecting and non-balance-affecting records can share one). Do not use absent reporting rows as proof of no capture. Prefer direct stored order/auth/capture reads for minute-scale recovery.

## Concrete schema and API deltas for the root design

1. tasks: immutable authorization_started_at; work_deadline_at set with it; provider authorization create/expiry/first-observed fields on payment record. Keep provider timestamps distinct from local receipt timestamps.
2. payment_operations: immutable endpoint/policy version, automatic_retry_until, body hash and first_sent_at; stable request_id already exists. Preserve UNKNOWN until proof, not retry exhaustion.
3. payments: actual resource status fields/facts, incident flag/reason, historical completed capture fact and separate current adjustments. Do not overload one enum with resource state, operation progress and incident.
4. adjustment facts: linked capture/refund/event ID, amount/currency, actual provider status, source and observed_at; support partial refund and reversal separately.
5. webhook_envelopes and verified_webhook_events replace pre-verification event-ID uniqueness. Verification jobs reference local envelope IDs; financial jobs reference operations, not arbitrary provider payloads.
6. provider_observations: include source resource version/status_details, provider create/update time where present, linkage facts, raw-body hash and receive time; retain append-only behavior.
7. optional action_approvals/MCP mapping only if those P1 write tools are actually built; do not add a token subsystem for read-only local demo status.
8. add the minimal operator read/reconcile endpoints above; all money retries still call existing executePaymentOperation.
9. update PaymentAdjustment / receipt types to show amounts and observed-at, source and derived-vs-provider status. A portable route bundle remains independently checkable for routing; it is not an independently authenticated PayPal payment proof.

## Sandbox access, gated capabilities, and claims

Accessible public implementation path: ordinary sandbox app credentials, separate buyer/seller sandbox accounts, Orders v2 AUTHORIZE, Payments v2 capture/void/read, browser PayPal approval, documented REST negative-testing headers, and real app sandbox webhooks when reachable HTTPS is available. Account-specific success still needs actual smoke tests; public documentation is not a guarantee for every sandbox account. Local polling recovery is sufficient when a public webhook endpoint is unavailable.

Not needed: production credentials, platform fees, delayed seller disbursement, multiple sellers, merchant onboarding, vaulting or reauthorization. P18 says platform_fees/disbursement_mode needs PayPal Complete Payments Platform approval and the AS2 order-intent pattern is limited release / Account Manager enabled. These are separate from this project's ordinary AUTHORIZE flow. Never describe the authorization as escrow, a platform-held wallet, guaranteed funds, or an AP2 credential.

AP2/ACP specifications and samples are publicly readable, but adoption, trusted credential providers, platform distribution, and a real PayPal/AP2 payment role require additional implementation/relationships. The ACP site explicitly says implementing the protocol does not automatically list products in ChatGPT (captured home in the research session; P14 points to platform-specific integrations). No production deployment or partnership feature is required for the hackathon prototype.

## Curated resources in implementation order

| Resource | Use | Copy/adopt limit |
|---|---|---|
| S42/S43/S38/S39/S47 and P33 | Exact create/authorize/capture/void and authoritative read graph | Preserve AUTHORIZE intent; do not copy capture-on-approval snippets. |
| P24/P26 | Official pinned TypeScript controller examples and request-ID evidence | Override minimal/finalCapture:false examples; distinguish SDK camelCase from REST. |
| P13/P03 | Timeout/retry/logging/client setup | Explicit safe defaults and redaction; no unjournaled retry wrapper. |
| P02/P31/P15 | Provider negative responses and in-flight error semantics | Sandbox labelled test run; downstream side effects are not exercised by mocks. |
| S45/S44, P07/P08/P09 | Webhook trust, spoof/replay/SSRF/agent execution controls | Verified event identity only after authenticity; do not copy certificate fetch naively. |
| P11/P32 | PostgreSQL/advisory lock connection semantics | Direct/session pooling; leases do not fence provider effects. |
| P12/P30 | Optional pg-boss + Drizzle transactional enqueue | Choose queue implementation once; external effect still needs journal. |
| P28/P29/P33/P34 | Current payment enums, IDs, amount/payee and refund distinctions | Preserve unknown/incident; no universal numeric status rank. |
| P17 | Operator reporting reconciliation | Delayed; never gate capture release on a reporting search. |
| P04/P27/P14/P19/P06 | AP2/ACP/MCP primary specs and protocol scope | Pin versions; no compliance/distribution claim from analogous design. |
| P10/P20 | CSV and tenant defense details | Spreadsheet-specific limits; owner/BYPASSRLS caveat. |

See SOURCES.json for exact source URLs, titles, versions/dates, sections, claims and limitations; QUERY_LOG.md for navigation failures and searches. This audit found documentation feasibility and design corrections. Actual implementation must still prove request serialization, concurrency, restart recovery, one real sandbox capture, one confirmed void, and authentic app webhooks/polling behavior.
