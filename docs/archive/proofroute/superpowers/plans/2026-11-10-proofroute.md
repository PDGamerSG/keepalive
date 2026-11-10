# ProofRoute base implementation tasks

**Execution authority:** Start with the [extended assurance plan](2026-11-10-proofroute-assurance.md). It integrates these sixteen base tasks into a version2 flagship; do not execute two separate applications or complete every old P1 feature before the scenario checker. The [corrected technical contracts](../../TECHNICAL_CONTRACTS.md) override older snippets here for deadline, webhook admission, provider statuses, retries and advisory-lock semantics. Use the version2 handlers from [ASSURANCE_CONTRACTS.md](../../ASSURANCE_CONTRACTS.md) for the main product.

> **For agentic workers:** Use the executing-plans skill, when available, to implement this plan task by task in the current session. Track checkbox steps and keep the working build intact. The user selected an autonomous handoff; do not stop for an execution-choice or design-approval loop. Follow the active environment's rules on delegation.

**Goal:** Build a working service that sells an independently verified dispatch plan using actual AI and PayPal sandbox authorization/capture/void.

**Architecture:** Next.js handles authenticated review and checkout; a durable Node worker coordinates local OR-Tools, an independent TypeScript verifier, and deterministic settlement. PostgreSQL stores immutable inputs, results, operations and recovery jobs. The model proposes constraints before consent and has no financial authority.

**Tech Stack:** Node 24 LTS, TypeScript, Next.js/React, Tailwind, PostgreSQL 16, Drizzle, Ajv/JSON Schema, Python 3.12/OR-Tools, local Ollama qwen3:8b, Vitest, pytest, Playwright, Docker Compose.

**Spec:** [2026-11-10-proofroute-design.md](../specs/2026-11-10-proofroute-design.md), with [TECHNICAL_CONTRACTS.md](../../TECHNICAL_CONTRACTS.md) as the interface authority.

## Global Constraints

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

---

## Working assumptions and deadline gates

The workspace currently contains research/design documents only. Do not describe them as implemented software. Keep `research/raw/` local: the saved third-party page text is evidence, not automatically licensed for republication. Initialize version control only if needed; preserve any user work added after this handoff. Add MIT for original code and retain dependency notices.

The deadline is **November 13, 2026 at 01:30 IST**, equivalent to November 12 at noon PST. At the second-pass checkpoint, November10 14:55 IST, approximately58h35m remain; recalculate at actual implementation start. The current deadline gates and flagship estimate are in the extended plan. Estimate **32–38 focused hours for P0**, with **6–10 additional hours for P1**, plus integration buffer. These are planning estimates for an experienced, AI-assisted builder, not a delivery guarantee. Sleep/breaks and sandbox access consume the remaining time. Two builders can split UI and core only after contracts stabilize; parallel work is optional and subject to current instructions.

| Gate (IST) | Required evidence | If behind |
|---|---|---|
| Nov 10, first 90 minutes | Node/Python/database working, sandbox app/accounts identified; small typed fixture checked | Fix environment/access first; avoid styling and sponsor tooling. |
| Nov 10, evening | Real sandbox authorization and capture smoke test; actual solver passes independent checker | Stop feature expansion until both work. Redirect approval is allowed; upfront capture is not. |
| Nov 11, noon | Owned task from review → real authorization → solve → check → capture → result | Keep one seed job and one seller; remove optional profiles/import complexity. |
| Nov 11, evening | Actual model proposal/review; real void; unknown-outcome recovery; judge run instructions | Cut all P1 except the highest-value fault demonstration. |
| Nov 12, noon | Stable P0, payment/concurrency gates pass, usable result screen, video rough cut | Fix failures only. No new integrations. |
| Nov 12, 18:00 | Public video uploaded, public licensed repo, complete submission draft and tested access | Use documented local setup if hosting is unreliable. |
| Nov 12, 20:00 target freeze | Final immutable code/video/demo version and submitted entry | Leave 5.5 hours for processing/eligibility corrections before hard deadline. |

After the actual deadline do not commit, edit README or replace video until winner announcement, per organizer update. Keep access running through at least December 21 conservatively. Check actual rules again before submission.

## File responsibilities and commands

Use the package tree in the technical contracts. The plan below names each production boundary and test location. Resolve and pin real dependency versions during Task 1; do not blindly depend on `latest` in judge instructions.

Required root scripts, created as their components become usable:

```json
{
  "contracts:generate": "tsx scripts/generate-contracts.ts",
  "contracts:check": "tsx scripts/check-contracts.ts",
  "typecheck": "pnpm -r --if-present typecheck",
  "lint": "pnpm -r --if-present lint",
  "test": "vitest run",
  "test:integration": "vitest run --config vitest.integration.config.ts",
  "test:e2e": "playwright test",
  "verify:bundle": "tsx packages/verifier/src/cli.ts",
  "doctor": "tsx scripts/doctor.ts",
  "sandbox:smoke": "tsx scripts/sandbox-smoke.ts",
  "seed": "tsx scripts/seed.ts",
  "dev": "pnpm --parallel --filter @proofroute/web --filter @proofroute/worker dev"
}
```

Use `pnpm --filter @proofroute/web build` for the production build. `pytest` commands below run through the pinned virtual environment/uv project. All commands are intended for the future implementation; they have not been run against application code in this research session.

For each task, first add the meaningful regression/acceptance case, confirm it fails for the intended missing behavior, implement, then run the focused gate. Commit completed coherent work in an initialized repository. Do not write tests for decorative copy or Tailwind class choices.

## Task 1 — Establish contracts and a hand-computable fixture (1.5–2 hours)

**Files:** `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `vitest.config.ts`, `.gitignore`, `.env.example`, `LICENSE`, `apps/web/`, `packages/contracts/schema/*.json`, `packages/contracts/src/{index,normalize,hash,validate}.ts`, `packages/contracts/test/{fixtures,contracts.test}.ts`, `scripts/{generate-contracts,check-contracts}.ts`, `services/solver/pyproject.toml`.

**Consumes:** technical-contract types and static [tiny input](../../examples/tiny-route-input.json)/[oracle](../../examples/tiny-route-oracle.json). **Produces:** generated types from sections 2–4 and 9–10; `normalizeInput(input: RouteInput): RouteInput`, `hashDocument(value: unknown): Sha256`, `assertRouteInput(value: unknown): RouteInput`, and the test-only `tinyFixture(input?: RouteInput, maxDistance?: number)`.

- [ ] Scaffold the workspace/Next.js shell, pin Node 24/Python 3.12 and install compatible packages. Keep styling minimal. Add environment names from technical contracts without credentials; ignore `.env*` except `.env.example`, logs, local outputs and `research/raw/` in a future public repository.
- [ ] Encode the exact wire schemas, generate both language bindings, and add a drift check. Reject unknown properties, bounds/matrix errors and duplicate IDs before hashing.
- [ ] Add the canonicalization test, then implement stable integer-unit normalization/hash utilities:

```ts
import { expect, it } from "vitest";
import { hashDocument } from "../src/hash";
it("hashes equivalent object key order identically", () => {
  expect(hashDocument({ b: 2, a: 1 })).toBe(hashDocument({ a: 1, b: 2 }));
  expect(hashDocument({ a: 1, b: 2 })).not.toBe(hashDocument({ a: 1, b: 3 }));
});
```

- [ ] Implement the fixture factory below as test support; production quote creation later uses the configured real sandbox merchant ID and database clock:

```ts
import tinyInput from "../../../docs/examples/tiny-route-input.json";
import type { RouteInput, FrozenContract, PlanArtifact } from "../src";
import { normalizeInput, hashDocument } from "../src";
export function tinyFixture(raw = structuredClone(tinyInput) as RouteInput, maxDistance = 4500) {
  const input = normalizeInput(raw);
  const inputHash = hashDocument(input);
  const contract: FrozenContract = {
    schemaVersion: "proofroute-contract/v1", taskId: "11111111-1111-4111-8111-111111111111", version: 1,
    inputHash,
    acceptance: { specVersion: "cvrptw-delivery/v1", verifierVersion: "1.0.0", allStopsRequired: true,
      windowRule: "SERVICE_START_INCLUSIVE", maxTotalDistanceMeters: maxDistance },
    quote: { amountCents: 450, currency: "USD", sellerMerchantId: "TEST_MERCHANT",
      approvalDeadlineAt: "2026-11-10T03:00:00.000Z" },
    execution: { maxWorkSeconds: 120, solverSecondsPerAttempt: 20, maxAttempts: 2 },
    frozenAt: "2026-11-10T02:45:00.000Z",
    consent: { actorId: "22222222-2222-4222-8222-222222222222",
      acceptedAt: "2026-11-10T02:45:00.000Z", textVersion: "consent/v1" }
  };
  const contractHash = hashDocument(contract);
  const artifact: PlanArtifact = { schemaVersion: "route-plan/v1", contractHash, inputHash,
    solver: { name: "ortools", version: "test-fixture", strategy: "PATH_CHEAPEST_ARC", attempt: 1 },
    routes: [{ vehicleId: "V1", stopIds: ["A", "B", "C"] }, { vehicleId: "V2", stopIds: [] }] };
  return { input, inputHash, contract, contractHash, artifact };
}
```

- [ ] Run `pnpm contracts:check`, `pnpm test packages/contracts/test/contracts.test.ts`, and `pnpm typecheck`. Commit with `chore: establish routing contracts`.

## Task 2 — Prove independent verification (2.5–3 hours)

**Files:** `packages/verifier/src/{index,verify,schedule,violations}.ts`, `packages/verifier/test/{verify,metamorphic}.test.ts`.

**Consumes:** RouteInput/FrozenContract/PlanArtifact, hash utilities and tinyFixture. **Produces:** `verifyPlan(contract, input, artifact: unknown): VerificationReport`, exactly as defined in technical contracts.

- [ ] Add these oracle and adversarial tests before implementing the verifier:

```ts
it("recomputes waiting, service and final depot return", () => {
  const f = tinyFixture();
  const r = verifyPlan(f.contract, f.input, f.artifact);
  expect(r.pass).toBe(true);
  expect(r.totalDistanceMeters).toBe(4200);
  expect(r.routes.find(x => x.vehicleId === "V1")?.returnSeconds).toBe(34620);
  expect(r.routes[0].schedule[1].serviceStartSeconds).toBe(33300);
});
it("rejects a missing delivery even when the remaining route is shorter", () => {
  const f = tinyFixture(); f.artifact.routes[0].stopIds = ["A", "C"];
  const r = verifyPlan(f.contract, f.input, f.artifact);
  expect(r.pass).toBe(false);
  expect(r.violations.map(x => x.code)).toContain("MISSING_STOP");
});
it("checks distance inclusively", () => {
  const exact = tinyFixture(undefined, 4200);
  const tight = tinyFixture(undefined, 4199);
  expect(verifyPlan(exact.contract, exact.input, exact.artifact).pass).toBe(true);
  expect(verifyPlan(tight.contract, tight.input, tight.artifact).pass).toBe(false);
});
```

- [ ] Implement safe schema/hash checks, vehicle/stop multisets, delivery-only load calculation, and the schedule recurrence. Fail closed before indexing unknown IDs. Compare totals with the frozen ceiling. Do not import solver logic.
- [ ] Add tests for every mutation in the oracle: duplicate stop/vehicle, unknown stop, overloaded V2, reverse late route, shift end one second too early, wrong hash, asymmetric matrix and service-start-at-close boundary. Rebuild a correctly hashed contract when testing a changed requirement.
- [ ] Add metamorphic cases: increasing capacity cannot invalidate an otherwise identical valid plan; increasing service time can invalidate a shift; adding a distance edge changes the recomputed total. Do not assert optimal route identity.
- [ ] Run `pnpm test packages/verifier/test` and inspect the expected numeric output. Commit `feat: verify dispatch constraints independently`.

## Task 3 — Solve a bounded CVRPTW job locally (2.5–3 hours)

**Files:** `services/solver/proofroute_solver/{__main__,solve}.py`, generated `models.py`, `services/solver/tests/test_solve.py`, `packages/core/src/solver/run-solver.ts`, `packages/core/test/solver.test.ts`, `scripts/generate-fixtures.ts`, `fixtures/{tiny-valid,morning-12,impossible-window}.json`.

**Consumes:** SolveRequest and generated Pydantic models. **Produces:** Python CLI `python -m proofroute_solver` and `runSolver(request: SolveRequest): Promise<SolveResult>`.

- [ ] Add a pytest case that the tiny fixture yields a CANDIDATE containing every stop once. Add a wrapper test that sends the Python output through the TypeScript checker. The cross-implementation check is the acceptance gate, not OR-Tools' success flag.
- [ ] Implement integer distance costs, mandatory stops, delivery capacity and service-start time dimension:

```python
def time_transit(from_index: int, to_index: int) -> int:
    a = manager.IndexToNode(from_index)
    b = manager.IndexToNode(to_index)
    service = 0 if a == 0 else service_seconds[a]
    return travel_seconds[a][b] + service

time_index = routing.RegisterTransitCallback(time_transit)
routing.AddDimension(time_index, 86400, 86400, False, "Time")
time_dim = routing.GetDimensionOrDie("Time")
for vehicle_index, vehicle in enumerate(vehicles):
    time_dim.CumulVar(routing.Start(vehicle_index)).SetRange(vehicle.shiftStartSeconds, vehicle.shiftStartSeconds)
    time_dim.CumulVar(routing.End(vehicle_index)).SetRange(vehicle.shiftStartSeconds, vehicle.shiftEndSeconds)
```

- [ ] Add known stop windows and demand/capacity callbacks; use a 20-second search limit and allowlisted first-solution strategies. Return `NO_SOLUTION_WITHIN_LIMIT` when no acceptable candidate is found; never assert proven infeasible from a bounded search.
- [ ] Enforce the total distance ceiling inside the solver as well as the independent checker:

```python
def distance_transit(from_index: int, to_index: int) -> int:
    return distance_meters[manager.IndexToNode(from_index)][manager.IndexToNode(to_index)]
distance_index = routing.RegisterTransitCallback(distance_transit)
routing.SetArcCostEvaluatorOfAllVehicles(distance_index)
routing.AddDimension(distance_index, 0, max_total_distance_meters, True, "Distance")
distance_dim = routing.GetDimensionOrDie("Distance")
routing.solver().Add(routing.solver().Sum([
    distance_dim.CumulVar(routing.End(v)) for v in range(len(vehicles))
]) <= max_total_distance_meters)
```
- [ ] Build the Node stdin/stdout adapter with `shell:false`, wall-clock/output limits and schema validation. No uploaded Python or arbitrary command flag is accepted.
- [ ] Generate `morning-12` reproducibly: use integer coordinates on two small delivery clusters, Manhattan distance ×100 meters, travel `ceil(distance/8)` seconds, 300-second service, broad 09:00–12:00 windows, fixed 09:00–13:00 shifts, adequate capacities. Tighten selected windows only after the baseline passes. Store generator seed/algorithm and the actual frozen matrix; do not label this live road data.
- [ ] Run `uv run --project services/solver pytest services/solver/tests`, then `pnpm test packages/core/test/solver.test.ts`. Capture measured solve time for tiny/morning-12. Commit `feat: compute bounded local dispatch plans`.

## Task 4 — Persist owned immutable tasks (1.5–2 hours)

**Files:** `compose.yaml`, `packages/db/src/{schema,index,transactions}.ts`, `packages/db/migrations/`, `packages/core/src/tasks/{draft,freeze,views}.ts`, `tests/integration/contracts.test.ts`.

**Consumes:** normalized schemas and FrozenContract. **Produces:** task/contract/payment/operation/job/artifact tables from technical contracts; `freezeTask(...)`, `getTaskView(actorId, taskId): Promise<TaskView>` and owner-scoped queries.

- [ ] Start PostgreSQL 16 with a named volume and a dedicated test database. Create migrations with the unique constraints, immutable-row trigger and state checks from the storage table.
- [ ] Test that actor B cannot read/freeze actor A's task; stale revision yields 409; unresolved issues block freeze; frozen input cannot be updated by service or direct SQL. Test decimal monetary values are rejected.
- [ ] Implement freeze in one transaction: normalize/validate, use database time, price 450 USD from server configuration, seller from configuration, fifteen-minute expiry, consent and hashes. Set work READY. Re-freeze returns the existing immutable result only for identical accepted revision; changed input requires a new task.
- [ ] Add `getTaskView` that omits artifact contents until release. Query all public task paths through owner scope.
- [ ] Run `pnpm test:integration -- tests/integration/contracts.test.ts`. Commit `feat: freeze owned purchase contracts`.

## Task 5 — Journal effects and run durable jobs (1.5–2.5 hours)

**Files:** `packages/core/src/jobs/{enqueue,claim}.ts`, `apps/worker/src/{index,registry,sweep}.ts`, `packages/core/src/payments/operations.ts`, `tests/helpers/{harness,fake-paypal}.ts`, `tests/integration/jobs.test.ts`.

**Consumes:** PostgreSQL schema and operation/state types. **Produces:** `enqueueJob(tx, job): Promise<Id>`, `claimJob(workerId): Promise<Job|null>`, `executePaymentOperation(operationId)`, and a test harness for subsequent financial tests.

- [ ] Implement `createTestHarness()` returning `{services, gateway, clock, db, seedAuthorizedTask, runOneJob, close}`. `services` exposes the functions in technical-contract §8. `gateway` implements PayPalGateway and records `{kind,requestId,body}` calls, with modes `COMPLETED`, `PENDING`, `DECLINED`, `TIMEOUT_AFTER_COMMIT`. `seedAuthorizedTask()` creates the tiny fixture with test-owned actor/contract and confirmed AUTHORIZED state. This helper is test-only, never reachable through HTTP.
- [ ] Add concurrent-claim and killed-worker tests: two claims obtain distinct jobs; an expired lease is reclaimed; replay retains the logical operation request ID. Verify no network call occurs before an operation is persisted.
- [ ] Implement job claim and fencing with a real database transaction:

```sql
SELECT id FROM jobs
WHERE (status = 'AVAILABLE' AND available_at <= now())
   OR (status = 'RUNNING' AND lease_until < now())
ORDER BY available_at
FOR UPDATE SKIP LOCKED
LIMIT 1;
```

- [ ] Set 30-second leases/10-second heartbeats; use task advisory locks on a dedicated connection for external effects. Keep solver and payment capacity separate. Sweeper cadence is fifteen seconds. Never run a long solve inside a database transaction.
- [ ] Run `pnpm test:integration -- tests/integration/jobs.test.ts`. Commit `feat: persist worker jobs and payment intentions`.

## Task 6 — Establish actual sandbox capability early (2–3 hours)

**Files:** `packages/core/src/payments/{paypal-client,gateway,bindings}.ts`, `packages/core/test/paypal.test.ts`, `scripts/sandbox-smoke.ts`, `docs/SANDBOX_RUNBOOK.md`.

**Consumes:** PayPalGateway interface, server configuration, fixed quote. **Produces:** REST adapter, OAuth cache, exact provider-binding validation and an opt-in real sandbox smoke command.

- [ ] Implement startup refusal for non-sandbox environment, OAuth, fixed-host URL construction, stored provider IDs and the four journaled mutation calls. Unit-test each request shape, especially AUTHORIZE and one purchase unit:

```ts
expect(createBody.intent).toBe("AUTHORIZE");
expect(createBody.purchase_units).toHaveLength(1);
expect(createBody.purchase_units[0].amount).toEqual({ currency_code: "USD", value: "4.50" });
expect(captureBody.final_capture).toBe(true);
```

- [ ] Validate returned intent/order linkage, payee, amount and currency using linked-resource GETs where fields are absent. A foreign/partial response must not become “paid.” Save debug IDs, status and sanitized observation, not tokens.
- [ ] Add a status-mapping test: order `COMPLETED` containing authorization `CREATED` maps to application `AUTHORIZED`, never `CAPTURED`. Only a linked capture `COMPLETED` can release output.
- [ ] Implement `pnpm sandbox:smoke -- --case tiny-success` as an opt-in run: create a frozen tiny task/order, print/open the real sandbox approval URL, wait for actual buyer approval through the app's return handling, authorize, invoke the real solver/checker and capture through settlement. Never set APPROVED in a local fake. Add the script's later settlement dependency now, but do not claim the smoke has passed until Task 7 is connected.
- [ ] Follow current SDK/API documentation and identify a business seller/personal buyer in the existing developer account. Missing credentials are setup blockers, not reasons to invent them. Use private environment/configuration, never print credentials in chat or public docs.
- [ ] Run request-shape tests and a real **authorization** first. Record provider IDs privately; then complete the real capture at Task 7. If SDK embedding is not yet ready, the official approval redirect keeps this gate independent of UI polish.
- [ ] Commit `feat: integrate PayPal sandbox authorization lifecycle`. The runbook must distinguish documented API feasibility, mocked tests, and actual completed smoke outcomes.

## Task 7 — Gate settlement on verified durable output (2.5–3 hours)

**Files:** `packages/core/src/settlement/{choose,execute,reconcile}.ts`, `packages/core/src/tasks/candidate.ts`, `apps/worker/src/handlers/{solve,payment}.ts`, `tests/integration/settlement.test.ts`.

**Consumes:** verifier, solver, journal, gateway and task schema. **Produces:** `recordCandidate`, `chooseSettlement`, `executePaymentOperation`, `reconcileTask`, and guarded RELEASED transition.

- [ ] Add the critical withheld-result test using the harness:

```ts
it("withholds the artifact while capture is pending", async () => {
  const h = await createTestHarness();
  try {
    const t = await h.seedAuthorizedTask();
    h.gateway.captureMode = "PENDING";
    await h.services.recordCandidate(t.taskId, t.artifact);
    await h.runOneJob("PAYMENT");
    const view = await h.services.getTaskView(t.actorId, t.taskId);
    expect(view.paymentState).toBe("CAPTURE_PENDING");
    expect(view.resultAvailable).toBe(false);
    await expect(h.services.releaseArtifact(t.actorId, t.taskId)).rejects.toMatchObject({ code: "NOT_RELEASED" });
  } finally { await h.close(); }
});
```

- [ ] Implement the locked selection algorithm from technical contracts §8. Store canonical artifact and passing report before inserting CAPTURE decision/operation/job in the same commit. Recheck contract hash, price, deadline and accepted cancellation under lock.
- [ ] Implement completion/reconciliation binding checks. A real completed capture atomically records the completed fact and releases the already stored artifact. Failed/pending/mismatched evidence withholds output.
- [ ] Test two workers, duplicate candidate submission, wrong seller/amount, deadline crossing and crash-after-provider-success. In the crash case, same-key recovery and resource reads must find one logical capture and release the original artifact.
- [ ] Run `pnpm test:integration -- tests/integration/settlement.test.ts`, then finish the **real** `tiny-success` smoke. Do not advance with only mock results. Commit `feat: settle only verified dispatch plans`.

## Task 8 — Expose session-safe review and payment APIs (1.5–2 hours)

**Files:** `apps/web/src/server/{session,csrf,errors,services}.ts`, `apps/web/src/app/api/session/route.ts`, `apps/web/src/app/api/tasks/route.ts`, `apps/web/src/app/api/tasks/[id]/{route,draft/route,freeze/route,checkout/route,authorize/route,cancel/route,events/route}.ts`, `tests/integration/http-boundaries.test.ts`.

**Consumes:** exact HTTP/body/view contracts, freeze/checkout/authorization services. **Produces:** the endpoints in technical contracts §9 and HttpOnly owner sessions.

- [ ] Add owner-isolation, forged order ID, tampered amount and CSRF tests. No endpoint may accept a payee/authorization ID/price from the browser. Return 404 for another actor's task.
- [ ] Implement thin schema-validated route handlers with stable error codes and `requestId`. Use same-origin cookie/session protection; rate-limit access-code entry. The order callback must match the task's stored order.
- [ ] Implement `requestCheckout` and `requestAuthorization` using existing journaled operations; repeated requests return the existing view. If quote expired before a fresh authorization send, reject; if a prior send is unknown, reconcile it and clean up rather than hiding the hold.
- [ ] Run `pnpm test:integration -- tests/integration/http-boundaries.test.ts`. Commit `feat: expose owned task and checkout APIs`.

## Task 9 — Make the end-to-end workflow usable (2–3 hours)

**Files:** `apps/web/src/app/{page,layout}.tsx`, `apps/web/src/app/(app)/tasks/[taskId]/page.tsx`, `apps/web/src/components/{dispatch-editor,contract-review,paypal-approval,task-timeline,status-label}.tsx`, `tests/e2e/dispatch.spec.ts`.

**Consumes:** frozen views, API endpoints, SDK v6 approval callbacks. **Produces:** a complete seed → review → authorization → run → released-result flow.

- [ ] Build the dispatch table/vehicle cards and contract summary with visible units, synthetic badge, $4.50 price and affirmative review consent. The initial typed-input path is functional before AI arrives.
- [ ] Wire PayPal v6 `session.start` to the server-created order promise, and `onApprove` to server authorization only. If embedding blocks progress for 45–60 minutes, use the verified approval redirect and accurate return checks. Do not swap to upfront capture.
- [ ] Implement the event timeline and two-second polling with backoff; restore task from URL/database after refresh. Never expose the route before `resultAvailable=true`. Use textual pending/error states and keyboard focus/error summaries.
- [ ] Add one Playwright flow with a clearly mocked gateway mode for deterministic CI; keep that mode server-only and impossible to enable accidentally in submitted sandbox mode. Independently run the actual sandbox browser journey and record its evidence separately.
- [ ] Run `pnpm test:e2e -- tests/e2e/dispatch.spec.ts`, and manually check a narrow viewport/keyboard navigation. Commit `feat: add coherent dispatch purchase workflow`.

## Task 10 — Make AI interpretation substantive and reviewable (2–3 hours)

**Files:** `packages/core/src/ai/{ollama,prompt,proposals,review}.ts`, `apps/web/src/app/api/tasks/[id]/proposals/route.ts`, `apps/web/src/components/{brief-input,proposal-diff,issue-resolver}.tsx`, `fixtures/ai-eval.json`, `packages/core/test/ai.test.ts`, `scripts/eval-ai.ts`.

**Consumes:** ConstraintProposal/SourceSpan schema and allowed changes. **Produces:** `extractConstraints`, `applyReviewedChanges`, proposal API, source-grounded review and actual inference evaluation.

- [ ] Test exact quote validation, unknown IDs, conflicting changes, invalid units and money/code proposals. Use the proposed types from technical contracts; no arbitrary JSON Patch path is accepted.
- [ ] Implement the structured local call:

```ts
const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
  method: "POST", signal: AbortSignal.timeout(90_000),
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ model: ollamaModel, stream: false, format: proposalSchema,
    options: { temperature: 0 }, messages })
});
```

`messages`, `proposalSchema`, `ollamaBaseUrl`, and `ollamaModel` come from this task's bounded prompt/schema/config modules. Validate status and response content; one structural retry then a visible error. No money tools exist in the model adapter.

- [ ] Show actual suggested edits, source quotes, unresolved requirements, manual corrections and final semantics. Freeze only explicit accepted/reconciled changes, never raw model JSON.
- [ ] Start host Ollama/download qwen3:8b as implementation setup if absent, documenting network/disk use. Do not imply the research already installed or benchmarked it. Run 24 fixed cases defined in validation/demo; record latency and semantic outcomes. If a stronger configured model is needed, expose the provider choice honestly and retain the local option.
- [ ] Run `pnpm test packages/core/test/ai.test.ts`, `pnpm exec tsx scripts/eval-ai.ts`, and the actual local AI browser flow. Commit `feat: translate merchant briefs into reviewed contracts`.

## Task 11 — Complete failure, cancellation and deadline cleanup (1.5–2 hours)

**Files:** `packages/core/src/tasks/{cancel,expire}.ts`, `apps/worker/src/handlers/cleanup.ts`, `packages/core/src/settlement/compensate.ts`, `tests/integration/cancellation.test.ts`.

**Consumes:** payment lane/operation journal and provider observations. **Produces:** `requestCancellation`, deadline sweep and serialized compensating void.

- [ ] Add deterministic race tests: cancellation selected first permits only VOID; capture selected first returns 409 to cancellation; timeout after an unknown capture cannot send VOID.
- [ ] Implement terminal work outcomes and verified void, keeping `VOID_PENDING` until authoritative provider status. Unknown authorization followed by cancellation must reconcile and void the recovered authorization. Stop computation on deadline/cancel without relying on the browser remaining open.
- [ ] Add the definitive-capture-failure compensation rule: no active/unknown effect, resource proof of no capture/pending capture, then close the failed decision and create a generation+1 VOID. Otherwise surface reconciliation/manual investigation.
- [ ] Run `pnpm test:integration -- tests/integration/cancellation.test.ts`, then a real sandbox impossible-window/timeout case with **no capture and confirmed void**. Commit `feat: close failed dispatch purchases safely`.

## Task 12 — Reconcile verified webhooks and uncertain effects (2–3 hours)

**Files:** `apps/web/src/app/api/paypal/webhook/route.ts`, `packages/core/src/payments/{webhooks,observations,recovery}.ts`, `apps/worker/src/handlers/webhook.ts`, `tests/integration/{webhooks,recovery}.test.ts`, `scripts/replay-events.ts`.

**Consumes:** PayPal signature endpoint, app webhook ID, event/resource bindings. **Produces:** durable verified inbox, authoritative resource reconciliation and restart recovery.

- [ ] Add tests for forged events, duplicate event ID, stale authorization after capture, capture pending then completed, v2 `DECLINED`, wrong task/payee and database failure before inbox durability.
- [ ] Persist bounded raw bytes/required headers, quarantine until signature postback SUCCESS, then fetch linked resources and apply monotonic observations. Public simulator mock events do not count as postback-verifiable live proof. Configure the actual app webhook to reachable HTTPS only if available; polling recovery remains required locally.
- [ ] Exercise the fake provider's `TIMEOUT_AFTER_COMMIT`: capture is accepted remotely, client sees timeout, worker restarts, reconcile obtains completion, one logical capture and original artifact release result. Repeat with void and authorization.
- [ ] Use a local failure proxy only in the lab to deliberately lose one **real sandbox** response if time permits. Label it injected transport loss. Do not claim a real lost-response test if only the fake adapter was used.
- [ ] Run `pnpm test:integration -- tests/integration/webhooks.test.ts tests/integration/recovery.test.ts`. Commit `feat: reconcile payment evidence and worker restarts`.

## Task 13 — Deliver useful routes and a portable receipt (2–3 hours)

**Files:** `packages/core/src/receipts/{bundle,csv}.ts`, `packages/verifier/src/cli.ts`, `apps/web/src/app/api/tasks/[id]/{bundle/route,routes.csv/route}.ts`, `apps/web/src/components/{route-diagram,route-schedule,verification-panel,payment-receipt}.tsx`, `packages/verifier/test/bundle.test.ts`.

**Consumes:** accepted artifact/report and verified capture, VerificationBundle type. **Produces:** `releaseArtifact`, CSV export, offline `verify:bundle` CLI and result screen.

- [ ] Test release guard on every download path, hash tampering, unsupported schema exit 2 and successful feasible bundle exit 0. Offline validation must disclaim independent payment authentication.
- [ ] Render schematic routes and recomputed schedules, delivery loads, total distance and all checks. Use actual model/solver/version and actual observed status. Do not add maps/tiles or fabricated savings to make the screen impressive.
- [ ] Export only selected nonsecret payment fields and original accepted inputs; mark `REAL_SANDBOX` vs `MOCK_TEST` correctly. Pin source revision in provenance. Escape textual CSV formulas.
- [ ] Run `pnpm test packages/verifier/test/bundle.test.ts`, then `pnpm verify:bundle output/from-actual-run.json` on an actual captured task. Commit `feat: release plans with reproducible verification receipts`.

## Task 14 — Add the bounded repair and fault lab (P1, 1.5–2.5 hours)

**Files:** `packages/core/src/solver/repair.ts`, `packages/core/src/lab/faults.ts`, `apps/web/src/app/api/lab/[id]/fault/route.ts`, `apps/web/src/components/fault-lab.tsx`, `tests/integration/repair.test.ts`.

**Consumes:** checker violations, frozen inputs, existing authorization and allowlisted strategies. **Produces:** second attempt under the same contract and clearly labeled fault scenarios.

- [ ] Add a missing-stop mutation test: checker rejects it, no capture is selected, a second actual solve may repair under identical input/contract hashes and at most two attempts. A failed second attempt schedules void.
- [ ] Implement deterministic strategy selection from counterexamples; an optional model explanation can describe the failure but cannot change acceptance criteria. Enforce remaining wall-clock budget before repair.
- [ ] Add allowlisted lab injections `DROP_STOP`, `WRONG_CONTRACT_HASH`, `DUPLICATE_EVENT`, `LOST_RESPONSE`. Every run/event/screenshot records `Injected fault`; hidden fabrication is prohibited. The lab has no force-capture control.
- [ ] Run `pnpm test:integration -- tests/integration/repair.test.ts` and record the actual outcome. Commit `feat: demonstrate bounded repair and explicit fault recovery`.

## Task 15 — Measure the system and inspect acceptance (1.5–2.5 hours)

**Files:** `scripts/eval-fixtures.ts`, `docs/MEASURED_RESULTS.md`, `tests/e2e/failure.spec.ts`, relevant regression tests uncovered here.

**Consumes:** completed P0, validation matrix and actual sandbox receipts. **Produces:** a truthful measurement report and a release decision based on the criteria below.

- [ ] Run the fixed corpus: tiny oracle; 12/20-stop feasible jobs; overload; tight window; asymmetric matrix; unknown ID; bounded no-result. Record seed, actual solver time, checker time, result and hardware. Do not require an optimal route or 100-stop performance target.
- [ ] Run targeted concurrency/security gates, then the full suite once. Fix failures and re-run only impacted gates before the final full release check:

```bash
pnpm contracts:check
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
uv run --project services/solver pytest services/solver/tests
pnpm test:e2e
pnpm --filter @proofroute/web build
```

- [ ] Distinguish four evidence types in MEASURED_RESULTS: unit/property tests; fake-provider integration; actual local inference/solve; actual PayPal sandbox runs. Mark anything unexecuted as unexecuted, not PASS. Include known limitations.
- [ ] Inspect the desktop and phone-sized flow, keyboard-only review, refresh during run and stopped-worker restart. Repair material defects; do not add new product modules. Commit `test: record dispatch and payment acceptance evidence`.

## Task 16 — Package, demonstrate and freeze (2–3 hours)

**Files:** updated `README.md`, `docs/JUDGE_GUIDE.md`, `docs/SANDBOX_RUNBOOK.md`, `.env.example`, `compose.yaml`, pinned locks, `docs/SUBMISSION.md`, original-code LICENSE and third-party notices; video artifact outside source as appropriate.

**Consumes:** real working build, research citations and measured report. **Produces:** runnable licensed public source, a <3-minute public video, complete Devpost fields and immutable submission revision.

- [ ] Write judge setup from an empty environment: prerequisites, copy `.env.example`, configure isolated sandbox app/buyer, start database/migrations, start Ollama/model, install pinned Python/Node dependencies, seed, run web+worker. Document host/container Ollama difference. Do not publish merchant secret/session key/buyer password in source; provide permitted isolated access instructions through the submission channel.
- [ ] Test the documented setup against a clean database/working copy without overwriting the user's local environment. Run `pnpm doctor` to report missing services/configuration without printing secrets. A manual seed is explicit and safe; no command should reset an existing database silently.
- [ ] Record the 2:50 storyboard in [VALIDATION_AND_DEMO.md](../../VALIDATION_AND_DEMO.md). Show actual AI, actual sandbox approval, meaningful verification and the real capture/void status; label replay/fault clips. Upload public YouTube early and verify duration/visibility.
- [ ] Publish original code to a user-controlled public repository and fill the submission draft. Submit only if the implementation session is authorized to publish/submit; otherwise leave concrete URLs/assets/fields ready for the user's final action. The current research request authorizes this handoff, not account publication or a live payment.
- [ ] Recheck event rules, working access, public license/video and exact immutable revision. Submit before the hard deadline; record release SHA/tag and freeze. Keep judge access and any trial/cloud resources operational through the announcement. Do not edit the submitted code after the deadline.

## Coverage and cut rules

| Requirement | Tasks |
|---|---|
| Reviewed AI and semantic evaluation | 1, 8–10, 15 |
| Exact routing model and independent checks | 1–3, 13, 15 |
| Genuine PayPal lifecycle | 6–9, 11–12 |
| Payment uncertainty/concurrency and durable release | 4–7, 11–12 |
| Useful merchant interface and accessibility | 8–10, 13, 15 |
| Replayable evidence, failure clarity and repair | 11–15 |
| Working submission, public licensed code/video and freeze | 16 |

Cut in this order if time slips: sponsor tooling → optional MCP → extra profiles → elaborate CSV import → P1 fault UI/repair → cosmetic analytics. Keep a seed-job path, actual AI/review, independent verification, safe real sandbox settlement, failure/void, runnable instructions and demo. If financial safety is failing, narrow the scope and fix it; do not hide the failing path or replace it with fabricated provider status.

## Paste-ready execution completion criteria

The implementer may declare completion only with actual command results, one genuine sandbox capture receipt, one genuine void receipt, a working route export/offline check, and judge instructions that have been followed. If a credential or provider issue blocks that, preserve the runnable local work and report precisely which gate remains. Do not claim “built,” “passing,” “winning” or “hiring-ready” based on this design alone.
