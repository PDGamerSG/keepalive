# ProofRoute product and engineering design

**Status:** base design retained for routing/financial foundations. The [expanded assurance blueprint](2026-11-10-proofroute-assurance.md), [version2 contracts](../../ASSURANCE_CONTRACTS.md) and [extended plan](../plans/2026-11-10-proofroute-assurance.md) define the current product and execution scope. No application has been built or tested in this research session.

**Goal:** let a merchant purchase a useful dispatch plan whose explicit constraints are checked before PayPal capture.

**Product sentence:** “Buy a dispatch plan. Pay when it passes.”

**Primary user:** an occasional delivery operator or small merchant preparing one day's deliveries. **Buyer:** that merchant using a sandbox personal account. **Seller:** one computational-service merchant using a sandbox business account. The application and solver are operated by that seller. This is a purchase of planning work, not delivery execution or a marketplace payout.

Read with [technical contracts](../../TECHNICAL_CONTRACTS.md), [implementation plan](../plans/2026-11-10-proofroute.md), [validation/demo](../../VALIDATION_AND_DEMO.md), and the [research rationale](../../../research/RESEARCH_REPORT.md).

## Global constraints

- Sandbox only; currency USD; one service merchant; one AUTHORIZE purchase unit; fixed price 450 cents per accepted plan.
- No LLM, browser, CSV note, or solver may call a PayPal money-movement endpoint or change a frozen contract.
- Release the route artifact only after an authoritative, matching COMPLETED capture; store and independently verify it before capture.
- Persist a stable provider request ID before each logical payment operation; serialize settlement decisions; reconcile unknown outcomes before conflicting action.
- Use integer cents, meters, seconds, and grams; at most 100 stops and 10 vehicles; no overnight routes in supported version1/version2.
- Use a 20-second solver limit per attempt, at most two attempts, and a 120-second work deadline measured from the first authorization send, persisted before HTTP and never reset on recovery.
- Freeze a quote for 15 minutes; human review and affirmative consent are required before PayPal approval.
- Default travel data is synthetic and frozen; verification establishes compliance with those inputs, not real traffic, physical delivery, or global optimality.
- Core stack: Node 24 LTS, TypeScript, Next.js/React, PostgreSQL 16, Drizzle, a PostgreSQL jobs/outbox worker, Python 3.12, OR-Tools, and local Ollama qwen3:8b.
- Use one JSON Schema contract source with generated TypeScript/Python types; keep the TypeScript verifier independent of OR-Tools and LLM output claims.
- Public repository, recognizable open-source license, runnable judge instructions, and public YouTube video under three minutes are submission requirements.

## 1. The user problem and the transaction

A merchant has twelve deliveries, two vans, capacity limits and promised delivery windows. “Give me a route” is not a sufficient purchase specification. A plausible-looking list can omit a customer, overload a van, or arrive after the promise. An agent also needs to know whether it has purchased a usable result before charging the buyer.

ProofRoute sells one bounded result under explicit acceptance rules. The AI translates ordinary-language requirements into a proposed structured job. The merchant reviews the proposal and agrees to the resulting contract. A specialist solver searches for a plan. A separate implementation checks the output. A deterministic settlement service handles payment.

Example instructions: “Use both available vans if needed. Keep VAN-A below 600 kg. Deliver the medical stops by 11:00. Keep the total route distance within 38 km.” The screen shows exactly which rows changed, the original quoted phrases, and the final rule: **service must start by 11:00**, inclusive. If “medical stops” does not map to explicit stop IDs, or “before 11” is ambiguous, the user must resolve it in the editor before freezing.

The service earns $4.50 for an accepted plan in the demo. That price is a design hypothesis, not a validated market price, a PayPal fee quote, or proof of profitability. Existing routing software has free tiers and capable APIs. The future customer hypothesis is occasional-use and agent/API purchasing where an explicit acceptance receipt is valuable. Test that hypothesis after the hackathon.

## 2. The complete user journey

1. **Start from a real-shaped synthetic job.** Load “Morning dispatch: 12 stops / 2 vans,” or import a documented CSV plus a frozen travel matrix. A badge states `Synthetic travel estimates`. CSV-only input without a matrix cannot imply real road times; it can use an explicitly selected synthetic matrix mode.
2. **State the job in ordinary language.** The local model returns typed proposed edits and source quotes. The interface shows `AI proposal — review required`, model identity and source phrases. Extraction happens before any payment.
3. **Review the contract.** Edit windows, loads, vehicle capacity/shift and distance ceiling. Unmapped requirements, unsupported requests, and conflicts are blocking issues. A checkbox confirms the displayed service-start semantics, frozen travel assumptions and $4.50 price. The application cannot guarantee the AI found every nuance; the user is the final reviewer.
4. **Freeze and quote.** Server validates the complete input, creates immutable bytes/hashes, sets a fifteen-minute quote expiry and records consent. A frozen task cannot be edited. To change requirements, cancel its unused work and clone the reviewed input into a new task; this requires new consent/checkout. An authorization is never reused for another contract.
5. **Approve PayPal authorization.** The buyer sees the seller and $4.50 inside PayPal. Copy explains that this is a temporary authorization; charge occurs only after the plan passes. Server authorizes the approved order. Returning to the page or clicking twice cannot create a second logical order/authorization.
6. **Watch the work.** A timeline shows `Authorized → Solver running → Checking constraints → Capture processing`. It shows bounded progress events, not fabricated percentage completion. Before capture, the route sequence/export is private to the seller.
7. **Inspect the result.** After a verified completed capture, the user sees the route diagram, stop schedule, every passed acceptance check, actual computed distance, and payment receipt. Download route CSV and an offline verification bundle. Refreshing or reconnecting restores the durable result.
8. **Understand failure.** If no acceptable artifact is found by the deadline, show that outcome and `Void requested` until the provider confirms `VOIDED`. Do not label “no plan found” as proof of infeasibility or claim an instant bank refund.

## 3. Scope and ambition

### P0 — minimum credible, safe entry

- Twelve-stop/two-vehicle seed, typed input editor, actual local AI extraction with grounded proposal review, freeze and server quote.
- Real PayPal sandbox authorization, local OR-Tools solve, independent checker, durable artifact, real capture and controlled release.
- Explicit failure/timeout path with verified void; stable operation keys, task isolation, durable worker recovery and provider reconciliation.
- Basic verified webhook inbox plus polling reconciliation; callback alone never means paid.
- Task screen, clear timeline, check report, route CSV and verification bundle.
- Meaningful correctness/payment tests, complete local run instructions, license and a functioning under-three-minute video.

These are a connected product. Do not cut financial safety, honest evidence, or actual AI to add more screens.

### P1 — competitive depth after the vertical slice

- One bounded repair attempt, selected from fixed solver strategies, using counterexamples without relaxing the contract.
- Operator fault harness: missing stop, wrong hash, stale/duplicate event and lost capture response; each explicitly labeled `Injected fault`.
- Richer per-stop timeline, counterexample annotations and two clearly described solver profiles of **the same seller**.
- Offline checker CLI, metamorphic tests, actual local-model evaluation report, and a sanitized real-sandbox run report.
- Stronger worker crash/restart demonstrations, capture-versus-cancel concurrency tests, portable receipt with pinned verifier version.

### P2 — deliberately outside the deadline commitment

Authenticated read-only MCP interface, external matrix providers, validated cost models, repeat subscriptions, multiple sellers/onboarding, AP2/A2A integration, mobile driver app, live tracking, delivery proof, automatic refunds, production deployment and production security certification. None is required to tell the core story. Do not add crypto, Payouts, arbitrary-code agents, Kubernetes or a vector database.

An optional sponsor integration is justified only after P0 is stable. AG Grid Community could serve the input grid; the sponsor's AG Studio award explicitly asks for deeper Studio dashboards/agent integration. Plain grid use should not be represented as meeting that aspiration. A forty-five-day trial activated November 10 could expire near December 25; verify its precise end date and maintain access through judging/announcement if used. Sponsor chasing must not displace the core.

## 4. Mathematical acceptance model

### Inputs

One depot `D0`; mandatory stops with unique ASCII IDs; vehicles with unique IDs; a square, possibly asymmetric matrix of distance meters and travel seconds; stop demand, service duration and service-start windows; vehicle load capacities and shift intervals. Matrix rows/columns follow `nodeIds = [D0, ...stopIds sorted lexicographically]`. Diagonal entries are zero; other entries are nonnegative safe integers. Forbid missing/unreachable entries in version 1 rather than silently substituting zero.

Each stop is one delivery. Loads are delivered from the depot, with **no pickup, reload, split delivery or intermediate depot**. A route's starting load is the sum of its assigned demands; checking that against capacity is sufficient for this delivery-only model. Empty routes are permitted and cost zero.

Every vehicle starts and ends at the one depot. Departure is fixed at its `shiftStartSeconds`. All local-day times are integers in `[0, 86400]`; a route cannot cross midnight. The service day/timezone are recorded for display. No daylight-saving or live-traffic conversion is part of the frozen arithmetic.

### Deterministic schedule

For route `D0 → i → j → D0`, start at the vehicle shift start with zero distance:

```text
arrival(i)      = departure(previous) + travelSeconds[previous][i]
serviceStart(i) = max(arrival(i), windowOpenSeconds(i))
departure(i)    = serviceStart(i) + serviceSeconds(i)
valid window   = serviceStart(i) <= windowCloseSeconds(i)
returnToDepot  = departure(last) + travelSeconds[last][D0]
valid shift    = returnToDepot <= shiftEndSeconds(vehicle)
```

Waiting before service is allowed. A window closes on **service start**, not arrival or completion. Service completion and depot return still count against the shift. An empty route returns at its shift start. Distance is the sum of matrix edges including the final depot return. Total distance across all routes must be at most `maxTotalDistanceMeters`, inclusive.

### Checker requirements

`verifyPlan(contract, input, artifact)` must independently check:

1. Schema versions, contract/input/artifact bindings, canonical hashes, bounds and supported acceptance specification.
2. Exactly one route entry per known vehicle, including empty vehicles; no duplicated or unknown vehicle.
3. Every mandatory stop exactly once across all routes; no unknown stop; depot never appears as a stop.
4. Each route load against its vehicle capacity.
5. Every leg, waiting period, service start, departure, depot return and shift limit using the recurrence above.
6. Total distance against the agreed ceiling.

The output is structured violations and recomputed schedules/metrics. The checker does not trust solver-supplied timestamps, distance, status, or model explanation. It does not call OR-Tools or an LLM. Full coverage plus capacity/window checks establishes feasibility under the given model; it does **not** prove minimal distance or true traffic feasibility.

If a baseline is displayed, it must pass this checker too. Compute “distance reduction” only between two valid plans under the same frozen inputs, labeled `synthetic fixture comparison`; hide the comparison if the baseline fails. No unmeasured “30% savings” claim.

## 5. AI's real role and its limits

The extraction service uses local Ollama `qwen3:8b`, JSON Schema output, temperature zero, a bounded response and a 90-second timeout. Inference occurs on the merchant's machine in the default local setup; the small solver also runs locally. Do not send addresses to an optional cloud provider without making that setting visible.

Allowed proposals are explicit operations: change a known stop's window/service duration, change a known vehicle's capacity/shift, or set the total distance ceiling. Each must include an exact source span and quote from the submitted instructions. Unsupported constraints such as “avoid dangerous roads,” multiple depots, cold-chain certification, or physical delivery guarantees become review issues. The model cannot add payees, price, currency, endpoint URLs, executable code, or settlement instructions.

Schema validation, known-ID checks and quote grounding reject invalid proposals. They cannot prove complete natural-language understanding. The mandatory review screen is the semantic authority. Log the model name/digest when available, prompt version, schema version, latency and validation result. Never store hidden reasoning or require it as evidence.

The solver solves the combinatorial problem. The LLM does not need to generate a full route. A later repair planner may select only `PATH_CHEAPEST_ARC` or `PARALLEL_CHEAPEST_INSERTION` with the same hard constraints and fixed time limit. The independent checker still decides acceptance. At most two attempts total; no open-ended agent loop.

If Ollama is unavailable, report `AI unavailable` and allow manual structured input for resilience. That fallback is not the AI demo. The submitted video must show actual inference or transparently labeled footage from a real recorded inference run.

## 6. System architecture and authority

```text
Browser ── session + CSRF ── Next.js server / application services
                                  │
                 ┌────────────────┴─────────────────┐
                 │ PostgreSQL: immutable contracts,  │
                 │ operations, jobs, artifacts,      │
                 │ webhook inbox, audit events       │
                 └───────────────┬───────────────────┘
                                 │ leased jobs
                      Node worker (trusted operator)
                      ├─ AI proposal adapter → local Ollama
                      ├─ solver subprocess → Python OR-Tools
                      ├─ independent TypeScript checker
                      └─ settlement adapter → PayPal sandbox
```

AI extraction can be synchronous before authorization with a timeout, while compute/settlement use durable jobs. Use a separate Node worker process so the Next.js request lifecycle is never the only owner of long computation. PostgreSQL stores the small artifacts as JSON plus canonical text/hash, avoiding a separate object store in this prototype.

The Python solver reads JSON on stdin and emits JSON on stdout; diagnostics go to stderr. Spawn with an explicit executable/argument list and `shell: false`; no uploaded code or command interpolation. Bound concurrency to one solver process by default; reserve settlement capacity so optimization cannot starve payment cleanup.

The checker is an independent **implementation** operated by the platform. It is not an independent institution, cryptographic proof system, third-party auditor, or trustless fair-exchange protocol. Hashes detect mutation and bind records; they do not prove the seller is honest or that a service was physically performed.

## 7. State and financial invariants

Work states: `DRAFT → READY → QUEUED → RUNNING → VERIFIED → RELEASED`; alternate terminal work outcomes are `REJECTED`, `TIMED_OUT`, or `CANCELLED`. Work `VERIFIED` can wait while payment is pending or unresolved. Release never follows a client callback alone.

Payment projection: `NONE → APPROVAL_REQUIRED → AUTHORIZED → CAPTURE_PENDING → CAPTURED`, or `AUTHORIZED → VOID_PENDING → VOIDED`. `UNKNOWN`, `DECLINED`, and `EXPIRED` are explicit outcomes. The operation journal represents in-flight create/authorize states. Refund/reversal observations are separate adjustment facts; they never erase historical capture completion or make an old webhook roll state backward.

- One frozen contract, price, seller and PayPal order binding per task.
- One active settlement decision per task: capture or void, chosen under a database lock. Capture selection requires verified stored output and no accepted cancellation.
- Cancellation before capture reservation wins and schedules void. After capture reservation it returns `409 SETTLEMENT_IN_PROGRESS`; the user sees reconciliation rather than a false cancellation success.
- Unknown or provider-pending outcomes reserve the settlement lane. No timeout-driven contradictory action.
- A definitively failed capture may lead to a **serialized compensating void** only after authoritative reads prove no capture/pending capture and an eligible authorization. Record a new decision generation; never treat a timeout as that proof.
- Never hold a SQL transaction open across a PayPal request. Save intent/key, commit, call provider, then commit observations and follow-up jobs atomically.
- Persist canonical accepted output and report before capture. If capture completes and the worker crashes, a later reconciler releases that stored output.
- Once the work deadline passes, unaccepted work cannot become payable. If capture was already reserved in time, resolve that chosen operation rather than silently switch to void.
- An accepted cancellation racing an unknown authorization is recovered after authorization reconciliation, then voided. The worker must not leave an orphan hold.
- “Void requested” differs from `VOIDED`; “capture pending” differs from `CAPTURED`; “no result found” differs from mathematically infeasible.

Implement exact transition guards and recovery cases from the technical contracts. These safeguards are required in P0 even if the operator dashboard is basic.

## 8. Screens and visual direction

Use a calm dispatch workspace: warm near-white background, dark navy text/navigation, blue primary actions, restrained green verified states and amber pending states. The application has one clear workflow, not a generic dashboard with unrelated metrics. Typography: a readable system sans; monospace only for IDs/hashes. Avoid decorative 3D globes and fake “live AI confidence” indicators.

| Screen | Required content and interactions |
|---|---|
| Dispatch workspace | Seed job/import, stop table, two vehicle cards, plain-language brief, model availability. Defaults visible and editable. |
| Contract review | Proposed edits beside quoted source; unresolved issue list; units and service-start semantics; frozen-data badge; $4.50 quote and expiry; explicit consent. |
| Checkout/run | PayPal authorization action, seller/amount, temporary-hold explanation, then an accessible chronological event list. Retry UI attaches to the existing operation. |
| Accepted plan | Schematic route diagram, per-vehicle stop timeline/load/distance, passed check list, receipt, CSV and verification bundle downloads. Label schematic as synthetic. |
| Failed plan | Concrete counterexample, final work result, authoritative payment status, retry as a new task. No “paid” badge while pending. |
| Operator lab (P1) | Owner-authenticated fault injection, replay labels, operation attempts and provider debug IDs, redacted JSON; no arbitrary payment override button. |

At desktop widths, show the stop grid and contract/run panel side by side. Below 900px stack them; below 600px use stop cards or a horizontally scrollable labeled table. Status uses icon + text, not color alone. Keyboard access, visible focus, associated labels, error summaries, reduced motion and an aria-live status region are required. Poll every two seconds while active, back off after one minute, and stop on terminal state; do not announce every unchanged poll.

## 9. Security, privacy and access

- All task/artifact/status endpoints scope queries to the authenticated owner. An unguessable ID is not authorization.
- Local judge mode uses a server-configured access code to create an HttpOnly session; hosted mode requires isolated owner accounts/allowlisted sandbox testers. Secrets stay server-side.
- Apply CSRF/origin checks to mutations, including payment creation/authorization/cancellation. PayPal webhook route is exempt from browser CSRF but requires provider verification.
- Reject oversized/unknown-schema payloads; max upload 1 MiB, CSV max 100 data rows, no formulas/macros. Escape exported CSV cells beginning `=`, `+`, `-`, `@` if textual.
- Provider reads use fixed `api-m.sandbox.paypal.com` endpoints constructed from validated IDs. Do not follow URLs from model output, webhooks, or uploaded files.
- No client-selected price, seller account or authorization ID. Buyer approval authorizes exactly the server quote tied to the approved contract.
- Do not log tokens, full payment credentials, real addresses, or payer personal data into public receipts. Synthetic judge data is the default. Provide selected sandbox transaction IDs only where useful.
- Verify webhooks using PayPal's postback signature endpoint and the configured webhook ID before downstream effects. Never trust simulator events as equivalent to verified live sandbox webhooks.

## 10. Acceptance and measures of success

The entry is ready only when one real sandbox success and one real pre-capture failure/void have been recorded, and a judge can reproduce the workflow. The first successful run must show actual local inference, actual OR-Tools computation, independent verification, and authoritative PayPal evidence. Mocked provider tests are valuable but must be labeled.

Record measured values rather than invented goals: extraction semantic success on the fixed review set, solver latency and feasibility acceptance on seeded fixtures, checker runtime, retries/recovery outcomes, and actual end-to-end time. A 100-stop cap is an input limit, not a performance claim. Target a reliable 12–20-stop demonstration first.

The next investment after the hackathon is customer validation and a real travel-data adapter. The prototype's strongest evidence is a useful plan and a recoverable payment lifecycle under stated assumptions.
