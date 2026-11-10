# ProofRoute technical contracts

This document defines proposed interfaces for implementation. It is not generated from existing code. The second-pass [assurance blueprint](superpowers/specs/2026-11-10-proofroute-assurance.md) is the product target; [ASSURANCE_CONTRACTS.md](ASSURANCE_CONTRACTS.md) adds the version2 scenario/audit contracts and overrides version1-only routing fields for the flagship. This document remains authoritative for the financial foundation, corrected after the [payment audit](../research/round2/payments/REPORT.md). All code snippets here are specifications, not tested application code.

## 1. Repository and package boundaries

```text
apps/web/                         Next.js UI, route handlers, session boundary
  src/app/(app)/tasks/[taskId]/    review, run and result views
  src/app/api/                    thin HTTP adapters
  src/components/                task UI and accessible primitives
  src/server/                    authenticated application services
apps/worker/src/                 job handlers and periodic recovery sweep
packages/contracts/              JSON Schema, generated types, fixtures, hashing
packages/verifier/src/            pure independent checker + bundle CLI
packages/db/src/                 Drizzle schema, migrations, transaction helpers
packages/core/src/               task, approval, solver, payment and receipt services
services/solver/                 Python OR-Tools CLI; no payment credentials
fixtures/                       synthetic inputs, prose, valid and mutated artifacts
tests/integration/               PostgreSQL and provider-adapter tests
tests/e2e/                      Playwright browser flows
scripts/                        doctor, fixture generator, sandbox smoke, receipt check
docs/                           research/design/plan/runbook
```

Use pnpm workspaces; application imports use `@proofroute/contracts`, `@proofroute/verifier`, `@proofroute/db`, and `@proofroute/core`. No payment logic lives in a React component. `packages/verifier` must not depend on `packages/core`, OR-Tools, Ollama, or PayPal. Use JSON over stdin/stdout to the Python CLI, not a separate public solver API.

## 2. Schema ownership, normalization and hashing

Commit JSON Schema Draft 2020-12 documents in `packages/contracts/schema/`. Generate TypeScript with `json-schema-to-typescript` and Pydantic v2 models with `datamodel-code-generator`; use Ajv for server validation and Pydantic for solver input. UI form schemas may use Zod but cannot redefine the wire contract. A CI `contracts:check` command re-generates into a temporary directory and fails on drift. Generated files are committed so a judge does not need code generation to read the interfaces.

Reject unknown properties (`additionalProperties: false`), unsafe integers, duplicate IDs and unsupported versions. Object relationships/matrix dimensions need additional semantic validation beyond JSON Schema. Normalize once before freezing: stable ASCII IDs, lexical stop/vehicle order, `nodeIds` as specified, no omitted optional fields in canonical documents (use explicit `null` where defined), no `NaN` or floating-point units. Use RFC 8785 canonical JSON via `json-canonicalize`; hash UTF-8 bytes with SHA-256, represented as 64 lowercase hex characters. Only Node computes authoritative hashes; Python echoes them and does not need to reproduce canonicalization.

```ts
type Sha256 = string; // exactly /^[0-9a-f]{64}$/
type Id = string;     // UUID for task/operation IDs
type NodeId = string; // /^[A-Za-z0-9_-]{1,32}$/; D0 reserved
type RouteInput = {
  schemaVersion: "route-input/v1";
  serviceDay: string; // YYYY-MM-DD, metadata for a single local day
  timeZone: string;   // validated IANA name; times below are local-day seconds
  source: "SYNTHETIC" | "UPLOADED_MATRIX";
  depotId: "D0";
  nodeIds: NodeId[]; // depot then sorted stop IDs
  stops: Array<{
    id: NodeId; label: string;
    demandGrams: number; serviceSeconds: number;
    windowOpenSeconds: number; windowCloseSeconds: number;
    xMeters: number | null; yMeters: number | null; // schematic only
  }>;
  vehicles: Array<{
    id: NodeId; capacityGrams: number;
    shiftStartSeconds: number; shiftEndSeconds: number;
  }>;
  distanceMeters: number[][];
  travelSeconds: number[][];
};
type FrozenContract = {
  schemaVersion: "proofroute-contract/v1";
  taskId: Id; version: number;
  inputHash: Sha256;
  acceptance: {
    specVersion: "cvrptw-delivery/v1";
    verifierVersion: "1.0.0";
    allStopsRequired: true;
    windowRule: "SERVICE_START_INCLUSIVE";
    maxTotalDistanceMeters: number;
  };
  quote: {
    amountCents: 450; currency: "USD";
    sellerMerchantId: string;
    approvalDeadlineAt: string; // ISO UTC, freeze + 15 minutes
  };
  execution: { maxWorkSeconds: 120; solverSecondsPerAttempt: 20; maxAttempts: 2 };
  frozenAt: string; // ISO UTC
  consent: { actorId: Id; acceptedAt: string; textVersion: "consent/v1" };
};
type PlanArtifact = {
  schemaVersion: "route-plan/v1";
  contractHash: Sha256; inputHash: Sha256;
  solver: { name: "ortools"; version: string; strategy: SolverStrategy; attempt: 1 | 2 };
  routes: Array<{ vehicleId: NodeId; stopIds: NodeId[] }>;
};
type SolverStrategy = "PATH_CHEAPEST_ARC" | "PARALLEL_CHEAPEST_INSERTION";
```

Bounds: 1–100 stops; 1–10 vehicles; `nodeIds.length = stops.length + 1`; square matrices; meters per edge 0–10,000,000; seconds per edge 0–86,400; stop demand and capacity 0–100,000,000 grams; service 0–86,400 seconds; windows and shifts in 0–86,400 with start ≤ end. All arithmetic remains below `Number.MAX_SAFE_INTEGER`; explicitly check accumulations. `maxTotalDistanceMeters` is a positive safe integer ≤ 1,000,000,000. Schematic coordinates, when present, are integers with absolute value ≤ 1,000,000. Text labels are bounded to 120 characters and never instructions to a tool.

The contract hash covers the entire `FrozenContract`; the contract contains `inputHash`, never its own hash. The artifact hash covers `PlanArtifact`. A verification report references both hashes and the independently recomputed metrics. No timestamp is inside the pure checker's deterministic output. Database run timestamps are separate.

## 3. AI proposals and consent

```ts
type SourceSpan = { start: number; end: number; quote: string }; // UTF-16 offsets, end-exclusive
type ConstraintChange =
  | { kind: "STOP_WINDOW"; stopId: NodeId; openSeconds: number; closeSeconds: number; source: SourceSpan }
  | { kind: "STOP_SERVICE"; stopId: NodeId; serviceSeconds: number; source: SourceSpan }
  | { kind: "VEHICLE_CAPACITY"; vehicleId: NodeId; capacityGrams: number; source: SourceSpan }
  | { kind: "VEHICLE_SHIFT"; vehicleId: NodeId; startSeconds: number; endSeconds: number; source: SourceSpan }
  | { kind: "DISTANCE_LIMIT"; maxTotalDistanceMeters: number; source: SourceSpan };
type ConstraintProposal = {
  schemaVersion: "constraint-proposal/v1";
  changes: ConstraintChange[];
  issues: Array<{ code: "AMBIGUOUS" | "UNMAPPED" | "UNSUPPORTED" | "CONFLICT"; message: string; source: SourceSpan }>;
};
type ProposalResult = {
  proposal: ConstraintProposal;
  run: { model: string; modelDigest: string | null; promptVersion: "extract/v1"; latencyMs: number };
};
extractConstraints(input: RouteInput, brief: string): Promise<ProposalResult>;
applyReviewedChanges(input: RouteInput, changes: ConstraintChange[]): RouteInput;
```

`brief.slice(start, end)` must equal `quote`; validate spans including surrogate-pair cases in the test set. Applying any change requires the review endpoint's explicit `acceptedChangeIndexes` and fixes for every issue. Contradictory changes to the same target become a blocking issue, not last-write-wins. The immutable accepted input is authoritative; retained AI proposals explain provenance. Manual changes are labeled user edits and recorded separately. Only `freezeTask` calculates price/seller/deadlines and creates the consent record.

The local Ollama adapter calls `/api/chat` on configured loopback `OLLAMA_BASE_URL`, `stream: false`, `format` equal to the proposal schema, temperature 0. Put the brief and rows in a delimited data message; system instructions prohibit finance, code and arbitrary tools. Set `think: false` only after checking installed Ollama/model support. Validate response as untrusted data. One explicit retry for structural invalidity is allowed before returning a reviewable error; never fabricate fallback AI output.

## 4. Solver and verifier interface

```ts
type SolveRequest = {
  input: RouteInput; contract: FrozenContract;
  contractHash: Sha256; inputHash: Sha256;
  strategy: SolverStrategy; attempt: 1 | 2;
};
type SolveResult =
  | { status: "CANDIDATE"; artifact: PlanArtifact }
  | { status: "NO_SOLUTION_WITHIN_LIMIT"; diagnostics: string[] }
  | { status: "SOLVER_ERROR"; code: string };
runSolver(request: SolveRequest): Promise<SolveResult>;

type ViolationCode = "BINDING" | "SCHEMA" | "UNKNOWN_VEHICLE" | "DUPLICATE_VEHICLE"
  | "MISSING_VEHICLE" | "UNKNOWN_STOP" | "MISSING_STOP" | "DUPLICATE_STOP"
  | "CAPACITY" | "WINDOW" | "SHIFT" | "DISTANCE_LIMIT" | "ARITHMETIC";
type Violation = {
  code: ViolationCode; vehicleId: NodeId | null; stopId: NodeId | null;
  expected: string; actual: string;
};
type StopSchedule = {
  stopId: NodeId; arrivalSeconds: number; serviceStartSeconds: number; departureSeconds: number;
};
type VerificationReport = {
  schemaVersion: "verification-report/v1"; verifierVersion: "1.0.0";
  contractHash: Sha256; inputHash: Sha256; artifactHash: Sha256 | null;
  pass: boolean; violations: Violation[];
  totalDistanceMeters: number | null;
  routes: Array<{ vehicleId: NodeId; loadGrams: number; distanceMeters: number;
    returnSeconds: number; schedule: StopSchedule[] }>;
};
verifyPlan(contract: FrozenContract, input: RouteInput, artifact: unknown): VerificationReport;
```

Wrong bindings/schema fail closed with null totals and no route metrics; a noncanonicalizable artifact has a null artifact hash. Accepted reports always have a non-null artifact hash. Structural unknown IDs must never index `undefined` into a matrix. Collect a bounded maximum of 200 violations. Sort violations by code/vehicle/stop for stable results. The verifier can use shared schema/hash utilities, but no solver helper, time-dimension object, or LLM-generated “pass.”

OR-Tools must use a time callback of `travel[from][to] + service[from]` (depot service zero), flexible waiting slack up to 86,400, per-vehicle fixed shift start/end, and per-stop cumul range for service start. Capacity callback uses stop demand and each vehicle's capacity. All stops mandatory: do not add disjunction penalties that permit dropping stops. Use distance arc costs, a zero-slack distance dimension with start cumul zero, and a solver constraint that the sum of every vehicle end-distance cumul is at most the contract ceiling. The independent checker still recomputes that sum. A heuristic's failure is not an infeasibility certificate.

The Node runner terminates the subprocess after 25 wall-clock seconds per attempt, captures ≤256 KiB stdout and ≤64 KiB stderr, and validates JSON. Overall deadline is `authorizationStartedAt + 120s`, persisted before the first HTTP send and never reset on recovery. Store attempt records and hashes. Before starting any second attempt, require sufficient remaining time. Reuse immutable inputs; do not authorize or charge again for repair.

## 5. Durable storage model

Use PostgreSQL 16 and Drizzle migrations. Every mutation involving an external effect first writes a durable journal/job in the same transaction. Times are `timestamptz`; numeric units use checked integers/bigints converted safely into TypeScript. Store canonical text alongside jsonb and reject hash mismatch on read.

| Table | Key fields and constraints |
|---|---|
| `actors`, `sessions` | actor UUID, sandbox access role; hashed session token, expiry. No PayPal secret per browser session. |
| `tasks` | UUID, `owner_id`, `work_state`, `version`, `active_contract_id`, immutable `authorization_started_at` and `work_deadline_at`, `authorization_first_observed_at`, `cancelled_at`, timestamps. Set work deadline from first authorization send, never recovery time. Index owner/created. |
| `task_drafts`, `ai_runs` | mutable reviewed draft with revision; brief/proposal/model metadata; only owner can edit before freeze. |
| `contracts` | UUID, task/version UNIQUE, canonical input+contract text/jsonb, hashes, consent actor/time, approval deadline. UPDATE/DELETE blocked by application and immutable-row trigger. |
| `payments` | task UNIQUE, seller, amount/currency, order ID UNIQUE nullable, authorization ID UNIQUE nullable, capture ID UNIQUE nullable, application state, actual resource statuses, provider authorization create/expiry times, incident flag/reason, captured/voided facts, version. CHECK amount=450/currency=USD. |
| `payment_operations` | UUID, task, kind (`CREATE_ORDER`,`AUTHORIZE`,`CAPTURE`,`VOID`), generation, `request_id` UNIQUE, frozen request body/hash, state, first_sent_at, endpoint/policy version and evidence, automatic_retry_until, last_error_code, provider debug ID, attempts. UNIQUE(task,kind,generation). |
| `settlement_decisions` | task/generation UNIQUE, `kind` CAPTURE/VOID, reason, state ACTIVE/RESOLVED/ABORTED, artifact/report IDs, selected_at, closed_at, proof of failed-no-effect if compensation. Partial UNIQUE(task) WHERE state=ACTIVE. |
| `solver_attempts` | task/attempt UNIQUE, strategy, started/finished, solver status, artifact hash/reference, diagnostics. |
| `artifacts`, `verification_reports` | content-addressed canonical output/report; task/attempt linkage; immutable; report binds version and hashes. Require an artifact and passed report for a capture decision via service guard. |
| `jobs` | UUID, task nullable, kind, `dedupe_key` UNIQUE, JSON payload, AVAILABLE/RUNNING/DONE/FAILED, available_at, lease_owner, lease_until, attempt_count. Index status/available_at. |
| `webhook_envelopes` | local UUID, bounded exact raw body/hash and signature-relevant headers, receipt time, untrusted claimed event/transmission IDs, verification state/attempts; no uniqueness based only on claimed event ID. |
| `verified_webhook_events` | server-configured provider/environment/app + authenticated event ID UNIQUE, verified envelope reference/payload hash, event/resource type, processing state. Only signature SUCCESS can insert. A different authenticated payload for the same ID is an incident. |
| `provider_observations` | operation/task, observed resource type/ID/status, received_at, sanitized body and hash, source REST/WEBHOOK. Append-only. |
| `payment_adjustments` | immutable capture/refund/event linkage, kind PARTIAL_REFUND/REFUND/REVERSAL, integer amount/currency or null until known, actual provider status, source and observed time. Never erase completed-capture history. |
| `audit_events` | task + seq UNIQUE, kind, redacted payload, contract hash, event time. Sequence allocated in task transaction; do not insert browser-authored facts. |

Server source for sandbox client ID/secret and webhook ID is environment, never database fixtures. Provider observations can contain personal data: keep private, redact in exported bundles, and document retention. Prototype uses synthetic delivery details and selected sandbox IDs.

## 6. Work, payment and operation states

```ts
type WorkState = "DRAFT" | "READY" | "QUEUED" | "RUNNING" | "VERIFIED"
  | "RELEASED" | "REJECTED" | "TIMED_OUT" | "CANCELLED";
type PaymentState = "NONE" | "APPROVAL_REQUIRED" | "AUTHORIZED" | "CAPTURE_PENDING"
  | "CAPTURED" | "VOID_PENDING" | "VOIDED" | "EXPIRED" | "DECLINED" | "UNKNOWN";
type OperationState = "PLANNED" | "IN_FLIGHT" | "ACKNOWLEDGED" | "UNKNOWN" | "FAILED";
type PaymentAdjustment = "NONE" | "PARTIALLY_REFUNDED" | "REFUNDED" | "REVERSED";
type PaymentAdjustmentFact = { kind: Exclude<PaymentAdjustment, "NONE">; providerId: string;
  captureId: string; amountCents: number | null; currency: "USD"; providerStatus: string;
  source: "REST" | "VERIFIED_WEBHOOK"; observedAt: string };
type JobKind = "SOLVE" | "PAYMENT" | "WEBHOOK" | "RECONCILE" | "CLEANUP";
type Job = { id: Id; taskId: Id | null; kind: JobKind; payload: Record<string, unknown>;
  leaseOwner: string | null; leaseUntil: string | null; attemptCount: number };
```

`UNKNOWN` is an unresolved effect, not permission to start a new logical operation. Preserve last confirmed facts separately. Known provider `PENDING` capture maps to `CAPTURE_PENDING`, with no artifact release. A create/authorize call in flight is represented by its operation state; UI shows that instead of claiming authorization.

| Trigger | Required guard | Durable outcome |
|---|---|---|
| Freeze | owned draft, revision matches, no unresolved issues, valid complete input, affirmative consent | immutable contract, work READY, payment NONE |
| Create checkout | READY, quote unexpired, no active payment operation | one CREATE_ORDER operation/job with stable UUID request ID |
| Order created | observed order intent, amount, payee, task linkage match | payment APPROVAL_REQUIRED, saved order ID |
| Buyer approval callback | owned task and stored order ID; valid quote or recovery of already-sent operation | one AUTHORIZE operation, not capture |
| First authorization send | owned approved order, fresh consent/quote, no prior first-send timestamp | persist authorization_started_at and work_deadline_at=started_at+120s before HTTP; never move either on recovery |
| Authorization confirmed | matching approved order/payee/amount/auth status; deadline still open; no accepted cancellation | AUTHORIZED; first-observed/provider timestamps; work QUEUED and solve job atomically; otherwise eligible cleanup |
| Candidate passed | frozen hashes match, deadline not passed, no accepted cancellation | persist artifact+report; work VERIFIED; select CAPTURE and enqueue in same transaction |
| Final failure/deadline/cancel wins | attempts exhausted or no repair configured; no active capture choice; no unknown financial effect requiring resolution | work terminal outcome; select VOID if authorized, otherwise queue authorization recovery/cleanup |
| Capture complete | authoritative completed capture matches order/auth/payee/amount/currency and stored artifact/report | payment CAPTURED, decision RESOLVED, work RELEASED; release event |
| Void requested | exclusive VOID decision and eligible authorization | VOID_PENDING until authoritative VOIDED |
| Void observed | correctly bound provider status | VOIDED; terminal work outcome retained |
| Capture declined | definitive provider observation; reconcile auth and order | DECLINED; artifact withheld; compensating void only after proved no effect |
| Authorization expiry derived | stored expiration_time has passed; fresh linked-resource reads show no completed/pending/partial capture | application EXPIRED with source DERIVED, actual provider status preserved; no false VOIDED claim |
| Any response lost | operation exists, may have succeeded remotely | UNKNOWN; stable-key recovery/reconciliation job; no contradictory settlement |
| Stale authorization webhook after capture | capture-completed fact exists | append observation; never regress CAPTURED to AUTHORIZED |
| Refund/reversal observed later | real verified event/read tied to capture | append adjustment fact and update receipt; preserve capture history and released artifact |

`finishWithinSeconds` is enforced when verification/settlement selection commits. A database clock, not a browser timestamp, decides expiry. `VERIFIED` is not terminal if capture remains unresolved. External provider events can show a financial incident after release; the application must record that honestly rather than rewrite history.

When repair is enabled, a rejected candidate is an attempt outcome while work stays `RUNNING`; only the final exhausted/deadline outcome becomes `REJECTED`/`TIMED_OUT`. With repair disabled, one attempt is sufficient; two is a maximum, not a promise. Authorization resource `CREATED` is the provider status that maps to our application `AUTHORIZED` after linkage validation. An Orders response can say `COMPLETED` after authorization without any capture: **order COMPLETED never means paid**. Only the linked capture resource's completed status can release output. Unknown or partial authorization statuses require reconciliation rather than a guessed mapping.

Current inspected authorization statuses are CREATED/CAPTURED/DENIED/PARTIALLY_CAPTURED/VOIDED/PENDING, without an EXPIRED enum. Capture statuses include COMPLETED/DECLINED/FAILED/PENDING/PARTIALLY_REFUNDED/REFUNDED; a verified reversal event is a separate observation. Unexpected partial/extra capture, wrong amount/payee or missing accepted artifact creates a financial incident. Never compress these resource facts into a universal numeric status order. Use the gross customer capture amount, not seller net after fees, for the450-cent binding. See payment-audit sources P28/P29/P33/P34.

## 7. Payment adapter and exact provider calls

```ts
type PaymentContext = { taskId: Id; contractHash: Sha256; orderId: string | null;
  authorizationId: string | null; amountCents: 450; currency: "USD"; sellerMerchantId: string };
type ProviderObservation = { resourceType: "ORDER" | "AUTHORIZATION" | "CAPTURE";
  id: string; status: string; raw: unknown; debugId: string | null };
interface PayPalGateway {
  createOrder(ctx: PaymentContext, requestId: Id): Promise<ProviderObservation>;
  authorizeOrder(ctx: PaymentContext, requestId: Id): Promise<ProviderObservation>;
  captureAuthorization(ctx: PaymentContext, requestId: Id): Promise<ProviderObservation>;
  voidAuthorization(ctx: PaymentContext, requestId: Id): Promise<ProviderObservation | null>;
  getOrder(orderId: string): Promise<ProviderObservation>;
  getAuthorization(authorizationId: string): Promise<ProviderObservation>;
  getCapture(captureId: string): Promise<ProviderObservation>;
  verifyWebhook(headers: Record<string,string>, event: unknown): Promise<boolean>;
}
```

Use `https://api-m.sandbox.paypal.com` only. Fail startup if `PAYPAL_ENV` is not `sandbox`. Get OAuth access tokens server-side at `/v1/oauth2/token`, cache until shortly before expiry, and redact credentials. HTTP timeout 10 seconds; a timeout on a mutation is an unknown effect, not a failure assertion.

| Operation | Endpoint and required behavior |
|---|---|
| Create order | `POST /v2/checkout/orders`; `intent: AUTHORIZE`; exactly one `purchase_units` entry; amount `{currency_code:"USD",value:"4.50"}`; `custom_id: taskId`; expected merchant payee; no buyer-supplied amount. Save operation and request ID first. |
| Authorize | `POST /v2/checkout/orders/{storedOrderId}/authorize` only after buyer approval. Save returned `payments.authorizations[0].id` separately. Fetch order if response is partial/uncertain. |
| Capture | `POST /v2/payments/authorizations/{storedAuthorizationId}/capture`, body `{amount:{currency_code:"USD",value:"4.50"},final_capture:true}`. Matching capture must be `COMPLETED` to release. |
| Void | `POST /v2/payments/authorizations/{storedAuthorizationId}/void`; 200/204 may be returned. Follow with authorization read until confirmed. A fully captured authorization cannot be voided; a partial capture is an incident, and voiding the remainder does not refund the captured amount. |
| Reconcile | GET order, authorization and/or capture by server-stored IDs. Validate relationships and totals; provider fields absent in one response require linked-resource fetch, not invented values. |
| Verify event | `POST /v1/notifications/verify-webhook-signature` with configured webhook ID, event and PayPal transmission headers. Only `verification_status: SUCCESS` permits processing. |

Send `Prefer: return=representation` on mutation calls where representation fields are consumed, but still support a minimal response and void204 without parsing a JSON body. The saved official references explicitly list `PayPal-Request-Id` for the four mutation endpoints. Persist one UUID per logical operation and reuse it with the identical request body on recovery. Endpoint-specific official SDK docs list six hours for Orders and45 days for Payments capture/void, while a broader newer migration guide says v2 six hours; current REST rendering omits the duration. Preserve this conflict in endpoint retry-policy metadata rather than declaring a universal retention SLA. A proposed same-operation retry cap of15 minutes is below both durations, subject to evidence/current endpoint support and action freshness. Fresh AUTHORIZE sends/replays after quote/work expiry are prohibited: read/reconcile instead, since a replay could create a late hold if the first send never arrived. Capture retries preserve the pre-deadline accepted decision and never change its terms. After policy expiry, reconcile/investigate; never generate a fresh capture key because the old one timed out.

For v6, load `https://www.sandbox.paypal.com/web-sdk/v6/core`, initialize from the current official reference, create a PayPal one-time payment session, and pass an order promise resolving to `{ orderId }`. `onApprove({orderId})` calls our server authorize endpoint. No SDK sample's immediate capture call belongs here. Verify UI copy/commit settings against the official SDK so a temporary authorization is accurately explained. If SDK integration consumes more than 45–60 minutes without progress, follow the order's official buyer-approval redirect link and process its return with the same server checks; retain AUTHORIZE intent.

## 8. Settlement serialization and recovery protocol

Pseudo-interface (all mutations include session owner checks at the HTTP boundary):

```ts
freezeTask(actorId: Id, taskId: Id, expectedRevision: number, review: ReviewedDraft): Promise<FrozenTaskView>;
requestCheckout(actorId: Id, taskId: Id): Promise<CheckoutView>;
requestAuthorization(actorId: Id, taskId: Id, orderId: string): Promise<TaskView>;
requestCancellation(actorId: Id, taskId: Id): Promise<TaskView>;
recordCandidate(taskId: Id, artifact: PlanArtifact): Promise<VerificationReport>;
chooseSettlement(taskId: Id, kind: "CAPTURE" | "VOID", reason: string): Promise<Id>;
executePaymentOperation(operationId: Id): Promise<void>;
reconcileTask(taskId: Id): Promise<void>;
releaseArtifact(actorId: Id, taskId: Id): Promise<VerificationBundle>;
```

`ReviewedDraft`, `FrozenTaskView`, `CheckoutView`, `TaskView` and `VerificationBundle` are the wire shapes in sections 9–10; export generated types for those names too.

Settlement algorithm:

```text
BEGIN
  lock task and payment rows in that order
  reject duplicate choice by returning the existing active decision
  if CAPTURE: require work VERIFIED, passed report, immutable artifact,
              now <= workDeadline, no accepted cancellation, AUTHORIZED funds
  if VOID: require no active capture decision and no unresolved capture effect
  insert active settlement decision (partial unique index)
  insert PLANNED operation with stable UUID request_id and frozen body
  insert payment job with unique dedupe_key
  append audit event; increment task/payment versions
COMMIT

claim job with lease
mark operation IN_FLIGHT and persist first_sent_at BEFORE HTTP
call fixed provider endpoint outside SQL transaction
if transport/5xx ambiguity: store UNKNOWN and enqueue reconciliation
else validate and append authoritative observation in a new transaction
apply guarded state transition + any release/cleanup job atomically
```

An expired lease is not permission for two workers to send money concurrently. Before an effect, acquire a **session-level PostgreSQL advisory lock keyed by task** on a dedicated direct/session-pooled connection, re-read the operation and confirm lane ownership. PgBouncer transaction pooling does not preserve this lock contract. Use a lossless64-bit key mapping, bounded acquisition and release in `finally`; never return a locked connection to a general pool. A dropped DB session can release the lock while an HTTP request still reaches PayPal, so stop new sends and preserve the chosen lane for same-operation recovery. A lease/version check fences local database commits, not the remote provider. The provider key protects same-operation replay within retention. These layers are not a distributed atomic transaction or a universal exactly-once guarantee.

Jobs are claimed with `FOR UPDATE SKIP LOCKED`, lease 30 seconds and heartbeat every 10 seconds. A worker's solver process has an independent timeout. Retrying creates a new **attempt row**, not a new logical payment operation/request ID. Use exponential retry delays 2/5/15/30 seconds, then a bounded 60-second reconciliation cadence. Money uncertainty never becomes an automatic “success” or a new checkout.

Every 15 seconds a sweep reclaims expired leases, reconciles unknown/in-flight provider operations, resumes stored verified artifacts after capture, and terminates overdue work. It also recovers authorizations whose callback/queue commit was interrupted. An approved-but-not-yet-authorized order is queried/reconciled according to the operation journal; no second authorization is guessed into existence.

If a capture definitively failed with no effect, mark its decision ABORTED only after authoritative order/auth/capture observations prove there is no completed/pending capture. In the same locked transaction create a VOID decision with generation+1, referencing those observations. If proof is incomplete, keep the lane reserved and surface `Needs reconciliation`. Do not send a conflicting void. A cancellation received after capture reservation returns 409 and cannot force this compensation path.

## 9. HTTP API and UI views

All JSON responses carry `requestId`; errors use `{error:{code,message,details},requestId}`. Mutations require same-origin session/CSRF, except the verified provider webhook. Idempotent application requests can return an existing operation view with HTTP 200/202. Reject an unknown task as 404, including another owner's task.

| Endpoint | Body / response | Guards and errors |
|---|---|---|
| `POST /api/session` | `{accessCode}` → session cookie | throttle; configured secret code; never public ledger access |
| `POST /api/tasks` | `{fixtureId:"morning-12"}` or validated input → `{taskId,revision}` | owner assigned server-side |
| `PATCH /api/tasks/:id/draft` | `{expectedRevision,input,brief}` → revised draft | 409 STALE_REVISION / CONTRACT_FROZEN |
| `POST /api/tasks/:id/proposals` | `{expectedRevision}` → ProposalResult | AI timeout 503 AI_UNAVAILABLE; no payment effects |
| `POST /api/tasks/:id/freeze` | ReviewedDraft → FrozenTaskView | 422 REVIEW_REQUIRED / INVALID_INPUT; 409 stale |
| `POST /api/tasks/:id/checkout` | `{}` → CheckoutView | 409 QUOTE_EXPIRED; no price/order ID in body |
| `POST /api/tasks/:id/authorize` | `{orderId}` → TaskView | stored-order equality + owner; 409 ORDER_MISMATCH / APPROVAL_REQUIRED |
| `POST /api/tasks/:id/cancel` | `{}` → TaskView | 409 SETTLEMENT_IN_PROGRESS after capture reservation |
| `GET /api/tasks/:id` | → TaskView | safe status only; route contents withheld until release |
| `GET /api/tasks/:id/events?after=:seq` | → ordered audit page | owner-scoped; max 100 |
| `GET /api/tasks/:id/bundle` | → VerificationBundle | 409 NOT_RELEASED until completed capture |
| `GET /api/tasks/:id/routes.csv` | → recomputed schedule CSV | same release guard; formula escaping |
| `POST /api/paypal/webhook` | provider raw event/headers → 200/202 | bounded durable inbox, signature verification before effects |
| `POST /api/lab/:id/fault` (P1) | allowlisted fault name → task view | owner/operator, `ENABLE_FAULT_LAB=true`; badge every affected event |

```ts
type ReviewedDraft = {
  expectedRevision: number; input: RouteInput; maxTotalDistanceMeters: number;
  acceptedChangeIndexes: number[]; resolvedIssues: Array<{ issueIndex: number; resolution: string }>;
  confirmConsent: true;
};
type FrozenTaskView = { taskId: Id; contract: FrozenContract; contractHash: Sha256; inputHash: Sha256 };
type CheckoutView = { taskId: Id; orderId: string | null; approvalUrl: string | null;
  operationId: Id; status: "CREATING" | "APPROVAL_REQUIRED" | "UNKNOWN" };
type TaskView = {
  taskId: Id; workState: WorkState; paymentState: PaymentState; paymentAdjustment: PaymentAdjustment;
  latestOperation: { kind: string; state: OperationState } | null;
  contractHash: Sha256 | null; amountCents: 450 | null; currency: "USD";
  workDeadlineAt: string | null; lastEventSeq: number;
  resultAvailable: boolean; needsReconciliation: boolean;
};
```

Checkout creation can be queued: browser polls until `orderId` is present, then starts PayPal. `approvalUrl` must come from an authoritative order response and be constrained to approved sandbox PayPal hosts before redirect; never accept a model/upload URL.

Webhook strategy: commit a bounded raw envelope and verification job before acknowledging200/202. Unverified claimed IDs cannot reserve authenticated identity or suppress later verification. Only postback `SUCCESS` promotes into `verified_webhook_events`; verified identity is provider/environment/app/event ID. Same authenticated ID with a different payload hash is an incident. Process verified events as hints and fetch authoritative resources to bind amount/payee/linkage. Handle `PAYMENT.AUTHORIZATION.CREATED`, `PAYMENT.AUTHORIZATION.VOIDED`, and v2 `PAYMENT.CAPTURE.COMPLETED`, `PENDING`, `DECLINED`, `REFUNDED`, `REVERSED`. Unknown event names are safely recorded/ignored. Do not reject legitimate delayed retries with a blanket short timestamp window; signature verification and durable verified-event dedup are separate controls. Keep dedup for at least the documented three-day delivery retry horizon plus chosen recovery margin. Rate-limit quarantine and expire invalid junk. Database failure before durable receipt returns non-2xx; no money effects occur before authenticity checks.

## 10. Portable verification bundle and receipt

```ts
type VerificationBundle = {
  schemaVersion: "proofroute-bundle/v1";
  input: RouteInput; inputHash: Sha256;
  contract: FrozenContract; contractHash: Sha256;
  artifact: PlanArtifact; artifactHash: Sha256;
  report: VerificationReport;
  payment: { environment: "sandbox"; orderId: string; authorizationId: string;
    captureId: string; status: "COMPLETED"; amountCents: 450; currency: "USD";
    observedAt: string; adjustment: PaymentAdjustment; adjustmentFacts: PaymentAdjustmentFact[] };
  provenance: { verifierVersion: "1.0.0"; sourceRevision: string; datasetLabel: string;
    computationMode: "ACTUAL_LOCAL"; paymentEvidenceMode: "REAL_SANDBOX" | "MOCK_TEST" };
};
```

The actual run path may export only `REAL_SANDBOX`; mocked integration tests export separate fixtures labeled `MOCK_TEST`. Bundle files and source IDs provide reproducibility, **not a cryptographic attestation that PayPal processed money**. The offline checker rehashes documents, re-runs the pure checker, compares the report, and prints a clear warning that offline verification validates plan integrity/feasibility, while payment status requires the trusted server/provider. A copied provider JSON cannot independently authenticate itself.

CLI contract: `pnpm verify:bundle path/to/bundle.json` exits 0 only for matching hashes and a passing plan; exits 1 on mutation/violation; exits 2 on unsupported schema. It must not contact the internet or expose secrets. `sourceRevision` is the actual pinned application revision, not a guessed future SHA.

## 11. Configuration and dependency choices

Proposed `.env.example` names: `DATABASE_URL`, `SESSION_SECRET`, `JUDGE_ACCESS_CODE`, `PAYPAL_ENV=sandbox`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MERCHANT_ID`, `PAYPAL_WEBHOOK_ID`, `APP_BASE_URL`, `OLLAMA_BASE_URL=http://127.0.0.1:11434`, `OLLAMA_MODEL=qwen3:8b`, `SOLVER_PYTHON`, `ENABLE_FAULT_LAB=false`. Only the client ID may be exposed through a client configuration endpoint. No secret gets a `NEXT_PUBLIC_` prefix.

Prefer direct `fetch` for the four PayPal operations rather than an agent wrapper whose tool semantics may differ. Pin installed package versions in the pnpm lock and Python lock after the first successful smoke test. Select Node24 LTS with a compatible stable Next.js/React pair and Python3.12 for solver wheels; do not rely on the observed global Node26/Python3.15 defaults. OR-Tools9.15.6755 and SDK2.5.0 were inspected references, not installed dependencies. If using the official SDK, explicitly set timeout/retry/logging and verify its camelCase-to-REST serialization. Dependencies serve the task: no Redis (PostgreSQL jobs), no ORM duplication, no external map key required, no separate solver web service.

Local run uses Docker Compose for PostgreSQL and optionally an app/worker/solver image; Ollama can remain host-native. Docker containers on macOS reach host Ollama through an explicit `host.docker.internal` configuration. A hosted judge deployment needs a reachable AI provider or a documented local inference path; a cloud host cannot call the user's loopback Ollama. If hosting adds risk, submit the complete reproducible local build permitted by the rules.
