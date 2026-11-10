# ProofRoute Dispatch Assurance: integrated implementation plan

**Execution authority:** implement this plan in order. It incorporates the [sixteen base tasks](2026-11-10-proofroute.md); those tasks supply detailed payment, storage and test recipes rather than a second project to finish first. [ASSURANCE_CONTRACTS.md](../../ASSURANCE_CONTRACTS.md) governs the version2 product; [TECHNICAL_CONTRACTS.md](../../TECHNICAL_CONTRACTS.md) governs finance, sessions, journal and recovery. The [assurance blueprint](../specs/2026-11-10-proofroute-assurance.md) governs product scope. Corrected contracts override an older base-plan snippet if they differ.

**Outcome:** a merchant imports a dispatch plan, reviews actual AI-extracted promises, sees an exact scenario failure, buys a rescue through PayPal sandbox, and receives a useful independently checked replacement after completed capture. One shared route sequence must pass all required frozen scenarios. The application does not yet exist.

**Stack:** Node24 LTS, stable Next.js16/React pair, TypeScript, Tailwind/accessibility primitives, PostgreSQL16, Drizzle, one PostgreSQL jobs/outbox implementation, JSON Schema/Ajv/generated bindings, Python3.12, OR-Tools9.15.6755 as inspected candidate, local Ollama/qwen3:8b, Vitest, pytest, Playwright. Resolve compatible package patches and lock them during setup. Direct fixed-host PayPal REST is the default adapter; official SDK2.5.0 is a reference/alternative, not a second adapter.

## Deadline and scope control

Hard deadline: **November12 20:00 UTC = November13 01:30 IST, 2026**. At the November10 14:55 IST research checkpoint, about58h35m remained. Recalculate at actual start. A44–58-focused-hour flagship is tight inside that elapsed window, before sleep and submission processing. Do not equate agent availability with linear speedup or omit the packaging buffer.

The stage estimates below total38–50 focused hours plus6–8 hours integration reserve, giving44–58. They include reused base work; do not add the base plan's entire estimate again. The full twelve-module product is a70–100-hour initial build, with further production/customer work afterward. Deadlines do not justify weakening settlement or misrepresenting a planned module as implemented.

| Gate (IST) | Required result | Scope decision |
|---|---|---|
| First90 minutes | Explicit Node24/Python3.12, PostgreSQL, source fixtures, sandbox setup located | Resolve interpreter/access issues immediately. Start model download separately if needed. |
| Nov10 23:00 | Actual checker reproduces both fixtures; actual robust solver finds B,A,C; real sandbox authorization/capture smoke path | If behind, cut CSV conveniences, animations, road data and optional tools. Keep only one seed plus typed JSON import. |
| Nov11 12:00 | Owned reviewed task → authorization → solve/check → stored artifact → capture → release | Stop all feature expansion until this is real. |
| Nov11 21:00 | Actual AI proposal, failed/voided task, unknown-outcome recovery, scenario audit/result UI | Cut remedies, lineage UI, uniform-delay search and extra operations views. |
| Nov12 12:00 | Targeted tests/build pass, clean judge setup, recorded success/void footage | Fix defects and package only. No new integrations. |
| Nov12 18:00 | Public licensed repository/video ready; access tested; concrete Devpost draft | Allow upload/processing/access buffer. Publication follows the active user's authorization. |
| Nov12 20:00 target | Complete entry and pinned build/video | Keep5h30m before hard deadline for processing/eligibility corrections. |

After the actual deadline, follow the organizer's no-code/README/video-change instruction until announcement. Preserve a functioning judge path through Dec1–15 and conservatively Dec21. A local run is permitted by the inspected rules, but the setup and actual AI availability must be clear; a hosted page cannot reach a laptop's loopback Ollama.

## Build sequence and base-task mapping

| Stage | Base tasks incorporated | New assurance work | Estimate |
|---|---|---|---|
| A | 1, start4/6 | v2 schema, canonical fixtures, runtime/access | 3–4h |
| B | 2 | independent scenario audit/checker | 4–5h |
| C | 3 | shared-topology robust solve | 3–4h |
| D | 4–7 | immutable scenario task + guarded PayPal path | 8–10h |
| E | 8,10 | reviewed AI/draft/audit API | 4–5h |
| F | 9, parts13 | merchant audit/checkout/result workspace | 5–7h |
| G | 11–12, focused14 | failure, uncertainty, concurrency, restart | 6–8h |
| H | 13,15–16 | v2 bundle, measures, demo, judge package | 5–7h |

Run the sandbox smoke from A as soon as the minimal journal/adapter exists in D; do not postpone credentials until UI is finished. Work through dependent core stages sequentially. After schemas and service interfaces stabilize, a second authorized builder can work on F while the core builder completes D/G; one person owns shared schema/migration changes. No extra agents or provider switches are implied beyond the current session's authorization.

## A. Establish the exact input and execution baseline

**Files:** root workspace/config/locks/`.env.example`/`LICENSE`; `packages/contracts/schema/{dispatch-input,travel-scenarios,buyer-plan,assurance-contract,assurance-plan,assurance-report,draft-audit,assurance-bundle}.json`; generated TypeScript/Pydantic files; `packages/contracts/src/{normalize-dispatch,validate-dispatch,hash}.ts`; `packages/contracts/test/assurance-fixture.ts`; `fixtures/assurance/`; `scripts/doctor.ts`; `services/solver/pyproject.toml`.

- [ ] Preserve existing research/user files. Initialize a repository only if needed. Keep `research/**/raw/`, local datasets, secret files and live provider evidence out of the public source unless separately licensed/redacted. MIT applies to original application code, not every research capture/dependency/dataset.
- [ ] Select Node24 and project-local Python3.12; do not replace global runtimes. Use the setup commands in [IMPLEMENTATION_RESOURCES.md](../../IMPLEMENTATION_RESOURCES.md). Pin actual dependencies and generated bindings; add `contracts:check` for drift.
- [ ] Copy the canonical [input](../../examples/assurance-input.json), [buyer plan](../../examples/assurance-buyer-plan.json), [brief](../../examples/assurance-brief.txt) and [oracle](../../examples/assurance-oracle.json) into source fixtures without changing their mathematics. Keep the old tiny fixture for recurrence regression; a full v1 payment/API path is optional.
- [ ] Implement strict schema validation and semantic checks from both contract documents: IDs/order/units, source-kind consistency, coordinate completeness, delay recipe equality, nominal equality, finite scenario bounds and2MiB incoming JSON cap. A snapshot with a null/unreachable cell fails intake.
- [ ] Build test helper `assuranceFixture()`: returns normalized input/buyer plan, a test-only valid v2 contract using fixed UUIDs/clock/TEST_MERCHANT, hashes, and a hand-specified B,A,C artifact labelled `test-fixture`. Production contracts use current DB time and configured actual sandbox seller; fixture output must never masquerade as a solve.
- [ ] Doctor reports configured/not-configured status and runtime compatibility without printing credentials or creating payments. It tests direct database connectivity, Python import, model-service health and configured URL policy. Check model support before using `think:false`.

**Gate:** `pnpm contracts:check`; `pnpm exec vitest run packages/contracts/test/dispatch.test.ts`; `pnpm doctor`. Tests reject a changed expanded matrix with unchanged recipe, wrong node order, bogus provenance, stale schema family and unsafe units. An unavailable sandbox/model is reported as such, never substituted with a passing fixture.

## B. Build the independent audit and scenario checker first

**Files:** `packages/verifier/src/{evaluate-routes,audit-existing,verify-dispatch,scenario-schedule,violations}.ts`; `packages/verifier/test/{assurance,metamorphic,bindings}.test.ts`. Exports: `evaluateRoutes`, `auditExistingPlan`, `verifyDispatch` exactly as specified.

- [ ] Compute coverage/vehicle identity/load/distance independently, including final depot legs and empty vehicles. On structural failure, stop unsafe matrix indexing. Compute all checks before deterministic diagnostic truncation.
- [ ] For each frozen scenario, independently compute arrival, waiting, service start/departure and depot return from the shared routes. Check inclusive windows/shift and safe integer accumulation. No solver scheduling helper is imported.
- [ ] `auditExistingPlan` exposes only the owner-supplied plan. `verifyDispatch` validates frozen bindings/report family/scenario set before accepting a candidate. A passing draft audit is not capture evidence.
- [ ] Add exact falsifiable tests, with helper above:

```ts
const { input, sourcePlan, contract, artifact } = assuranceFixture();
const audit = auditExistingPlan(input, sourcePlan, 4500);
expect(audit.pass).toBe(false);
expect(audit.violations).toContainEqual(expect.objectContaining({
  code: "WINDOW", scenarioId: "CORRIDOR_DELAY", stopId: "B", excessUnits: 900
}));
const checked = verifyDispatch(contract, input, artifact);
expect(checked.pass).toBe(true);
expect(checked.totalDistanceMeters).toBe(4400);
expect(checked.scenarios.find(s => s.scenarioId === "CITY_SLOWDOWN")
  ?.minimumWindowMarginSeconds).toBe(300);
```

- [ ] Enumerate all six tiny permutations in a test implementation independent of the solver. Only B,A,C passes every scenario under 4500m. This proves that fixture's finite model; it is not a general optimality theorem or a road-data benchmark.
- [ ] Mutate a mandatory scenario ID/hash, alter one travel cell, remove B, duplicate a stop/vehicle, omit an empty vehicle, include depot as a stop, use a v1 report, and try separate per-scenario routes. None may pass.
- [ ] Add the envelope-conservatism counterexample from optimization F02: each named scenario arrives at B at21, elementwise max arrives at40. An envelope may be a stronger optional model, but cannot replace the promised exact finite-scenario semantics.

**Gate:** `pnpm exec vitest run packages/verifier/test`. Passing numbers must match the canonical oracle exactly. Keep tests on behavior/arithmetic/bindings; no snapshot tests of Tailwind classes or labels.

## C. Solve one topology under all frozen scenarios

**Files:** `services/solver/src/proofroute/{cli,model,scenarios,serialize}.py`; `services/solver/tests/test_scenarios.py`; `packages/core/src/solver/{runner,protocol}.ts`; `tests/integration/solver.test.ts`.

- [ ] Use one RoutingIndexManager/RoutingModel. Shared `NextVar` assignment determines every vehicle's stop order. Add a separate time dimension for each modeled scenario, with fixed vehicle start times, window ranges and end shift limits.
- [ ] Bind matrix/service data in callback factories, retain callback references, set depot service zero. Model capacity and sum of all route distances under the shared ceiling. All stops mandatory; no dropping penalties.
- [ ] Return one route for every vehicle, including empty routes. Discard solver timestamps; the independent checker recomputes schedules. Return actual package version, strategy, modeled IDs and solver status, with no invented global-optimality claim.
- [ ] Default to all required scenarios in each attempt. The optional nominal-first experiment must be explicitly declared and still face the all-scenario checker. A robust candidate failing that checker is a defect or labeled injected fault.
- [ ] Enforce20s solver search,25s process watchdog,256KiB stdout/64KiB stderr caps, at most 2 attempts. Use JSON stdin/stdout and a configured executable path with an argument array; no uploaded/model-supplied command or shell string. CPU/model work has no payment credentials.
- [ ] Run the canonical three-stop case and independently verify its actual result. Add12/20-stop bounded synthetic cases, an empty vehicle, waiting and depot-return edge cases. An instance with total demand above total fleet capacity provides a simple provable no-solution fixture; a general timeout only means no solution found within the limit.

**Gate:** `uv run --project services/solver --python 3.12 pytest services/solver/tests`; `pnpm exec vitest run tests/integration/solver.test.ts`. Record actual local elapsed time/status/verifier result separately from static-oracle checks.

## D. Bind immutable work to recoverable PayPal settlement

**Files:** `packages/db/src/{schema,migrations,transactions}.ts`; `packages/core/src/tasks/{freeze-dispatch,clone}.ts`; `packages/core/src/payments/{gateway,operations,settlement,reconcile}.ts`; `packages/core/src/jobs/`; `apps/worker/src/{main,handlers,sweep}.ts`; `scripts/sandbox-smoke.ts`; `tests/integration/{freeze,settlement,locks}.test.ts`.

- [ ] Implement base storage/session/queue tasks4–5 with immutable v2 input, source plan, scenario set, contract, artifact and report. JSON rows can avoid premature normalization. Store canonical text plus hashes; check them when read. Add owner/revision/version/unique indexes and immutable-row enforcement.
- [ ] Expose a **server-validated supported task descriptor** to the shared payment service: task/hash, seller/450USD, stored accepted artifact/report IDs and fixed execution policy. Only a known contract/report family adapter can create it; arbitrary client JSON cannot satisfy a capture guard. Do not duplicate payment controllers by version.
- [ ] Implement four journaled provider operations: create AUTHORIZE order, authorize stored order after real buyer approval, capture exact450 cents with `final_capture:true`, void eligible authorization. Use one seller/purchase unit and fixed sandbox URLs. Add authoritative order/auth/capture reads and signature postback verification.
- [ ] Persist stable request ID/body/policy before send; use `Prefer:return=representation`,10s HTTP timeout, bounded redacted logs, no redirect-following or generic mutation retries. Handle minimal response/void204 by linked reads. Apply endpoint-specific retention policy; the inspected documentation conflicts. Short same-operation retries do not create a provider SLA.
- [ ] Before first AUTHORIZE HTTP send, persist immutable `authorization_started_at` and `work_deadline_at=started+120s`. Recovery never resets them. Late uncertain authorization is read/reconciled, not replayed to create a late hold. Buyer approval time is outside this work budget.
- [ ] `recordDispatchCandidate` reads the stored frozen task, reruns the independent checker, persists artifact/report, then reserves CAPTURE and its operation/job atomically under row locks. Require current time within work deadline, matching supported versions/hashes, no accepted cancellation and eligible authorization. No client report or draft audit grants permission.
- [ ] Use a dedicated direct/session-pooled PostgreSQL advisory-lock connection for each task's financial lane. Keep HTTP outside SQL transactions. Session loss can release the lock while PayPal still processes the request: preserve the chosen lane and reconcile; local leases never fence the provider.
- [ ] On matching capture COMPLETED, atomically record the fact/release event. On PENDING/UNKNOWN/partial/wrong amount/payee, withhold rescue output and reconcile or record incident. An order COMPLETED is not payment. Fully captured funds cannot be undone by void; unexpected partial capture is an incident.
- [ ] Run two bounded real sandbox smoke tasks as soon as this boundary is ready: useful checked rescue/capture and failed task/confirmed void. Require buyer approval; never seed payouts, production payments or account balances. Record sanitized resource IDs/status/linkage and source revision privately.

**Gate:** real PostgreSQL integration suite, actual completed matching sandbox capture and actual authoritative void evidence. If credentials/account capability are missing, continue independent work and state the precise missing configuration. The user requested no research questions; do not invent credentials or silently switch to mock evidence.

## E. Make AI review, audit and freeze substantive

**Files:** `packages/core/src/ai/{ollama,prompt,validate-proposal}.ts`; `packages/core/src/tasks/{drafts,review-ledger}.ts`; `apps/web/src/app/api/tasks/` handlers; `fixtures/ai-eval.json`; `tests/integration/{review,ownership}.test.ts`.

- [ ] Adapt base tasks8/10 to the v2 draft, retaining the base grounded ConstraintProposal. The actual model sees only route IDs/values, brief and supported edits; it does not edit scenario recipes, amount/seller, state or tools. The user edits travel scenarios separately in the reviewed lab.
- [ ] Use the canonical brief to produce a meaningful allowed change, such as B's close09:35 and the4.5km limit, from a seed draft with a looser B close. The reviewed final input must match the oracle. Do not prefill the final proposal and claim model execution.
- [ ] Verify source spans/known IDs/units, conflict detection, current proposal/draft revision and issue disposition. Apply accepted proposal indexes plus explicit user changes on the server, then compare normalized review input. Null proposal is labeled manual; demo an actual non-null run.
- [ ] Implement owner-scoped revisioned draft/proposal/audit/freeze/checkout/authorize/status/events/cancel/download endpoints. Add clone/comparison as specified; a clone creates a new unapproved task and no financial inheritance. Keep remedies draft-only if implemented.
- [ ] The free audit may inspect only the stored owner-supplied source plan. It cannot use a service artifact ID to reveal an unreleased rescue. Before capture, all paths return only nonrevealing stage/check/payment summaries for generated candidates.
- [ ] Run the24 AI cases from [VALIDATION_AND_DEMO.md](../../VALIDATION_AND_DEMO.md), report actual denominators/false edits/latency/model digest, and preserve human review. Add v2 cases for malicious scenario removal, changed source plan after proposal and stale recipe review.

**Gate:** actual local proposal → review → exact freeze, plus stale revision, mismatched proposal, cross-owner download/audit and invalid-source-span rejection. `pnpm exec vitest run tests/integration/review.test.ts tests/integration/ownership.test.ts`; AI evaluation command records real model results rather than fixture responses.

## F. Build the merchant assurance workspace

**Files:** `apps/web/src/app/(app)/tasks/[taskId]/{page,review,audit,result}.tsx`; `apps/web/src/components/{dispatch-table,promise-ledger,scenario-switcher,route-diagram,violation-detail,contract-review,payment-status,comparison,margin-table}.tsx`; `packages/verifier/src/compare-plans.ts`; `tests/e2e/assurance.spec.ts`.

- [ ] Follow the five views in the blueprint: dispatch/promises; audit/scenarios; rescue contract/PayPal; released result; evidence/operations. Reuse one coherent workspace with task status, not twelve unrelated dashboards.
- [ ] Use an accessible schematic SVG with a visible synthetic label for the flagship. Selecting B's violation highlights arrival09:50, close09:35 and the1500s directed A→B delay. Provide tables for keyboard/screen-reader users and do not rely on color alone.
- [ ] Checkout shows the exact three scenarios, unchanged promises,4500m ceiling,450 cents USD,120s accepted-work policy and later provider-resolution possibility. Actual PayPal approval remains recognizable. Redirect approval is an acceptable fallback if a JS integration blocks progress; upfront capture is not.
- [ ] Poll durable status or use an existing event mechanism; reconnect/refetch restores task state. Stage names separate `AI proposed`, `User reviewed`, `Checker passed`, `Capture completed`. Never fabricate progress percentages or show a new route before release.
- [ ] After release show original A,B,C versus rescue B,A,C, **+400m** distance, passed3/3 scenarios, minimum tested window margin300s, worst return10:25 and remaining shift35min. These values come from the stored report/recomputation, not hard-coded display constants.
- [ ] Implement `comparePlans`; per-stop position change uses `(vehicleId,zeroBasedPosition)`. Show2 changed positions for A/B and1 vehicle with a changed ordered route in the fixture. Capacity margin is2000g; distance margin100m. A longer feasible rescue is a tradeoff, not a mileage-saving claim.
- [ ] Keep visual polish targeted: clear type hierarchy, compact rules/schedules, useful errors, responsive tables and focus states. Optional motion does not gate success. Add typed JSON import first; CSV conveniences follow only if stable.

**Gate:** Playwright owner flow with labeled fake provider for broad repeatability, then one real recorded sandbox success/void. Refresh, cancel-pending and blocked-download views must remain accurate. A screenshot of a mock is not real provider evidence.

## G. Prove failure, recovery and execution boundaries

**Files:** base failure/webhook/reconcile handlers; `tests/integration/{payment-races,webhook-inbox,deadlines,restart,adjustments}.test.ts`; `tests/fakes/paypal.ts`; optional protected fault-lab UI.

- [ ] Implement base tasks11/12 with the corrected envelope/verified-event split: untrusted claimed event IDs cannot reserve dedup identity. Test forged eventID first, then authentic same ID; the authentic event still verifies/processes. Verified same ID/different body is an incident.
- [ ] Test a lost authorization response/restart after the120s deadline; no new solve budget, no late replay of AUTHORIZE, eligible cleanup only. Test pending capture past work deadline without conflicting void.
- [ ] Use real PostgreSQL to test cancel-versus-capture selection, two workers, expired lease while HTTP remains in flight, DB session loss after send, successful provider effect followed by failed local commit, and stale worker state. Same-operation key/lane survives all uncertainty.
- [ ] Test PENDING→COMPLETED, definitive declined capture→proved-no-effect void, void204/read, partial capture incident, derived authorization expiry, partial refund and reversal facts. Preserve historical capture/released artifact; never report a hold void as refund of captured money.
- [ ] Test that a corrupted accepted artifact/hash/scenario cannot produce capture even through operator/fault-lab routes. No force-paid/release override. An optional lab only invokes guarded services and labels every injected outcome.
- [ ] Test SSRF/configuration boundaries, CSV text encoding and every owner's read/mutation path. The model/solver gets no PayPal credentials or arbitrary network/tool execution. Schema-valid malicious prose still requires review; delimiters/temperature are not a security guarantee.

**Gate:** `pnpm test:integration` with PostgreSQL and deterministic provider fake; selected PayPal-Mock-Response runs separately labeled; real happy/void runs separately labeled. Do not broaden live mutation loops to substitute for deterministic race tests. Fix a failing safety invariant before adding features.

## H. Export, measure and submit a reproducible build

**Files:** `packages/verifier/src/{bundle-v2,cli}.ts`; `packages/core/src/receipts/`; route CSV/bundle handlers; `scripts/{measure,verify-evidence}.ts`; application README/runbook; submission draft/video script; CI.

- [ ] Export exact AssuranceBundle and useful route schedules after release. Preserve source plan/input/contract/artifact/report/scenario hashes and selected sandbox observation/adjustments. Offline CLI recomputes all route hashes/checks and optional comparisons; it does not authenticate copied provider JSON.
- [ ] Test a valid bundle exits0, a mutated route/matrix/payment-binding field fails1 where locally checkable, unsupported schema exits2. Clarify that offline payment metadata cannot prove a real/current capture. Provide canonical JSON as the lossless format; spreadsheet CSV has a documented human-view sanitization policy.
- [ ] Record actual 3/12/20-stop solve/check latency, model extraction latency and resource usage, one successful provider capture and confirmed void.100-stop run is an optional bounded experiment, not guaranteed solver quality. Publish no unmeasured savings/availability/security score.
- [ ] Complete contracts drift/typecheck/lint/focused test/integration/e2e/production build and clean database setup. Record command, source revision and result. Do not repeatedly rerun broad suites after they pass unless changes/failures justify it.
- [ ] Use the2:50 storyboard in validation: show the broken promise, actual AI review, exact consent/PayPal, rescue pass/capture/release, separate real void and offline check. Keep optional protocol/operations complexity out of the main story.
- [ ] Prepare licensed public-source package, public YouTube video under 3min, clear judge setup/access, honest implemented-versus-planned list and prior-work citations. Complete a concrete reviewable publication/submission package before any approval required by the active session. No deletion of earlier entries.

**Final gate:** all implemented acceptance conditions have actual evidence, unresolved checks are named, source/video/demo are pinned, and the entry is ready before the deadline. Research documents alone cannot satisfy this gate.

## Full product roadmap after the flagship

These are connected expansion milestones inside the70–100-hour initial-product estimate, not commitments to squeeze into the remaining hackathon hours. Some reusable core work is already counted above.

| Milestone | Specific implementation | Acceptance condition |
|---|---|---|
| Road snapshot intake | `packages/core/src/matrices/{osrm,normalize,provenance}.ts`; coordinate review; fixed configured engine; raw private snapshot + normalization/hash; attribution | Unit test meters/seconds/null/asymmetry and one actual small road snapshot. No public demo-server dependency in acceptance. |
| Scenario editor | Reviewed off-diagonal uniform delays/directed edge overrides, regenerated expanded matrices, impact diff | Edited recipe changes input hash; authorized task remains unchanged; fresh clone/consent required. |
| Exact margin explorer | `measureFragility`, per-window/shift/capacity/distance witness; binary search0…3600 uniform moving-leg delay | Checker proves tolerance and tolerance+1 fails unless capped; test waiting/empty routes. Nonprobabilistic label. |
| Reviewed remedies | `draftFixedRouteRemedies`; close/capacity/shift/distance sufficient changes, checker re-evaluation, explicit user edit ledger | Arithmetic witness is not fake AI quote; no automatic relaxation; no global-minimum claim. |
| Replanning lineage | Clone endpoints/parent-child comparison and change reasons; same-owner acyclic graph | Old artifacts/contracts/payment stay immutable; child has new consent/order; changed-route positions are defined/tested. |
| Evidence/operator workspace | Requirement→rule→scenario→witness→artifact→payment read projection, reconciliation queue and guarded read/retry | Reconstruct selected decision from recorded facts; no force capture/release; redacted bounded incident export. |
| Optional agent access | Exactly3 read-only MCP tools over maintained authenticated transport or documented trusted local stdio | Current owner/scope checked per execution; unreleased rescue denied; model actorId/user_confirmed grants nothing. No AP2/ACP compliance claim. |

A graph database, streaming GPS, agent marketplace, token wallet, multi-seller disbursement, autonomous funds or custom LLM training do not deepen this contract enough to justify the deadline cost. The extensive engineering is in precise modeling, independently checkable evidence and recoverable external effects.
