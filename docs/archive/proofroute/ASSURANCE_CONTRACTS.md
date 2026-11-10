# Dispatch Assurance: version2 contracts and implementation boundaries

This is the wire/behavior authority for the [expanded product](superpowers/specs/2026-11-10-proofroute-assurance.md). It extends the corrected [base technical contracts](TECHNICAL_CONTRACTS.md), whose PayPal/session/journal rules remain mandatory. No application code is implemented. Generate these schemas/types alongside the base types; do not keep two conflicting definitions of the same schema version.

The main product uses version2. Base version1 remains a small regression fixture/offline compatibility target. A version1 report cannot be presented as evidence that a version2 scenario contract passed. Settlement accepts only the exact report family pinned by the frozen contract and the server's supported-verifier allowlist.

## 1. Matrix provenance and input

Reuse `Id`, `Sha256`, `NodeId`, `RouteInput`, `SolverStrategy`, `StopSchedule`, `PaymentAdjustment`, `PaymentAdjustmentFact`, `SourceSpan`, `ConstraintChange` and `VerificationBundle` from the base document. A `RouteInput` in this wrapper still has its version1 shape and nominal `travelSeconds`; the wrapper is the new wire schema.

```ts
type MatrixProvenance = {
  sourceKind: "SYNTHETIC" | "IMPORTED_SNAPSHOT" | "LOCAL_OSRM" | "HOSTED_MATRIX";
  sourceLabel: string; engineVersion: string | null; profile: string | null;
  mapDataTimestamp: string | null; generatedAt: string;
  normalization: "CEIL_METERS_SECONDS";
  attribution: string[]; dataLicenseUrl: string | null;
  coordinatesE7: Array<{ nodeId: NodeId; latitudeE7: number; longitudeE7: number }>;
  snapshotBodyHash: Sha256 | null;
  fallbackCellsPresent: false; unreachableCellsPresent: false;
};
type ScenarioDerivation =
  | { kind: "NOMINAL" }
  | { kind: "UNIFORM_ADD_SECONDS"; baseScenarioId: "NOMINAL"; extraSeconds: number }
  | { kind: "EDGE_OVERRIDES"; baseScenarioId: "NOMINAL";
      edges: Array<{ fromId: NodeId; toId: NodeId; travelSeconds: number }> };
type TravelScenario = {
  id: NodeId; label: string; assumptionText: string;
  travelSeconds: number[][]; derivation: ScenarioDerivation;
};
type ScenarioSet = {
  schemaVersion: "travel-scenarios/v1";
  nodeIds: NodeId[]; nominalScenarioId: "NOMINAL";
  scenarios: TravelScenario[];
};
type DispatchInput = {
  schemaVersion: "dispatch-input/v2";
  route: RouteInput;
  matrixProvenance: MatrixProvenance;
  scenarioSet: ScenarioSet;
};
type SharedRoutes = Array<{ vehicleId: NodeId; stopIds: NodeId[] }>;
type BuyerPlan = { schemaVersion: "buyer-plan/v1"; routes: SharedRoutes };
```

Validation is semantic as well as structural:

- One to three scenarios, including exactly one `NOMINAL`; flagship seed has three. All are mandatory for the selected contract. Version2 accepts a single nominal scenario for the early vertical slice, accurately labeled.
- Scenario order is `NOMINAL` first, then remaining IDs sorted lexically. Matrices use the identical node order as `route.nodeIds`. Nominal matrix exactly equals `route.travelSeconds`. Distances remain shared across scenarios.
- Every cell is a nonnegative safe integer≤86,400 seconds; diagonal zero. Derived delays must be nonnegative, not faster than nominal, and recompute exactly from the declared recipe. Uniform addition affects off-diagonal cells; edge overrides are unique/directed/known and cannot include depot-to-itself.
- Validate the full recipe and expanded matrix before freeze. It is the expanded frozen matrix that the checker uses, while the recipe explains provenance. A later recipe change requires a new input hash/task.
- Coordinates are optional as a complete empty list or exactly one entry for every node, with integer E7 values in latitude/longitude bounds. They are metadata for map rendering/snapshot creation, not an unreviewed substitution for the stored matrix.
- `sourceKind=SYNTHETIC` requires `route.source=SYNTHETIC`; every other kind requires `UPLOADED_MATRIX`. Local/hosted adapters require a non-null source-body hash, profile and engine/version label; data timestamp may be null if unavailable and must not be invented. Coordinate entries follow `nodeIds`, with no duplicate/unknown IDs. Synthetic metadata never claims road-engine provenance.
- Unknown/unreachable/null/fallback cells are rejected in this version. An imported road snapshot maps `route.source` to `UPLOADED_MATRIX`; `matrixProvenance` names whether the adapter was local or hosted. No silent straight-line fallback or unit conversion at verification time.
- For source fractional meters/seconds, use ceiling to integer, record the normalization and source-body hash, and retain the private raw snapshot where permitted. A user's exact already-integer upload is unchanged. Snapshot time is retrieval/generation time, not proof of live traffic validity.
- Reject daylight-saving transition service days for zones with a discontinuity during the selected local day in version2, or choose a nontransition date. This avoids treating ambiguous/nonexistent local seconds as real timestamps; no cross-midnight route is supported.

Compute `inputHash = hashDocument(DispatchInput)`, `scenarioSetHash = hashDocument(ScenarioSet)` and `sourcePlanHash = hashDocument(BuyerPlan)` using the same canonicalization rules as the base. These hashes have distinct meanings; never reuse the route-only version1 input hash.

Reuse all base bounds: at most 100 stops/10 vehicles, integer units, same-day windows/shifts and matrix limits. Scenario IDs use the NodeId character/length rule, are unique, and cannot be `D0`; only the nominal scenario has derivation `NOMINAL`. Validate incoming JSON at a 2MiB body limit before parsing/semantic checks. No unknown properties or alternative per-scenario route arrays are accepted. Normalize known vehicle route entries lexically for hashing without reordering their stop sequences. Invalid original plans can still receive a structural-failure draft audit, but a purchase requires a structurally valid original plan; it may fail time/capacity/distance checks.

## 2. Approved purchase contract and output

```ts
type AssuranceContract = {
  schemaVersion: "proofroute-contract/v2";
  taskId: Id; version: 1; parentTaskId: Id | null;
  inputHash: Sha256; sourcePlanHash: Sha256;
  acceptance: {
    specVersion: "cvrptw-scenarios/v2"; verifierVersion: "2.0.0";
    scenarioSetHash: Sha256; requiredScenarioIds: NodeId[];
    sameRouteSequenceAcrossScenarios: true;
    allStopsRequired: true; windowRule: "SERVICE_START_INCLUSIVE";
    maxTotalDistanceMeters: number;
  };
  quote: { amountCents: 450; currency: "USD"; sellerMerchantId: string; approvalDeadlineAt: string };
  execution: { maxWorkSeconds: 120; solverSecondsPerAttempt: 20; maxAttempts: 2 };
  frozenAt: string;
  consent: { actorId: Id; acceptedAt: string; textVersion: "consent/v2-scenarios" };
};
type AssurancePlanArtifact = {
  schemaVersion: "route-plan/v2";
  contractHash: Sha256; inputHash: Sha256; scenarioSetHash: Sha256;
  solver: { name: "ortools"; version: string; strategy: SolverStrategy; attempt: 1 | 2;
    modeledScenarioIds: NodeId[]; searchStatus: string };
  routes: SharedRoutes;
};
```

Price is still450 cents and one seller/one final capture. Parent lineage is a reference, not consent to change an old task or reuse its authorization. Consent text explicitly explains the finite scenario set, temporary hold, accepted-work120-second deadline measured from **first authorization send**, and that provider settlement/hold release may resolve later.

The client cannot choose seller, price, payment environment, verifier version or the meaning of a passing report. Required scenarios are exactly the reviewed input's scenario IDs, not an arbitrary subset supplied after checkout. For the default robust solve, `modeledScenarioIds` equals all required IDs. A declared relaxed-candidate experiment can contain only NOMINAL on attempt1, but the checker still evaluates all required scenarios. Solver metadata is advisory and never itself proves acceptance.

## 3. Independent checker and draft audit

```ts
type AssuranceViolationCode = "SCHEMA" | "BINDING" | "SCENARIO_SET" | "ARITHMETIC"
  | "UNKNOWN_VEHICLE" | "DUPLICATE_VEHICLE" | "MISSING_VEHICLE"
  | "UNKNOWN_STOP" | "DUPLICATE_STOP" | "MISSING_STOP"
  | "CAPACITY" | "WINDOW" | "SHIFT" | "DISTANCE_LIMIT";
type AssuranceViolation = {
  code: AssuranceViolationCode; scenarioId: NodeId | null;
  vehicleId: NodeId | null; stopId: NodeId | null;
  expected: string; actual: string;
  excessUnits: number | null;
};
type ScenarioEvaluation = {
  scenarioId: NodeId; pass: boolean;
  minimumWindowMarginSeconds: number | null;
  minimumShiftMarginSeconds: number | null;
  routes: Array<{ vehicleId: NodeId; returnSeconds: number; shiftMarginSeconds: number;
    schedule: Array<StopSchedule & { windowMarginSeconds: number }> }>;
  violations: AssuranceViolation[];
};
type RouteEvaluation = {
  pass: boolean; structuralPass: boolean;
  violationsTruncated: boolean;
  totalDistanceMeters: number | null;
  distanceMarginMeters: number | null;
  vehicleLoads: Array<{ vehicleId: NodeId; loadGrams: number; capacityMarginGrams: number }>;
  scenarios: ScenarioEvaluation[]; violations: AssuranceViolation[];
};
type AssuranceReport = RouteEvaluation & {
  schemaVersion: "assurance-report/v2"; verifierVersion: "2.0.0";
  contractHash: Sha256; inputHash: Sha256; scenarioSetHash: Sha256;
  artifactHash: Sha256 | null;
};
type DraftAuditReport = RouteEvaluation & {
  schemaVersion: "draft-audit/v1"; inputHash: Sha256; sourcePlanHash: Sha256;
  maxTotalDistanceMeters: number; status: "DRAFT_INPUT_AUDIT";
};

evaluateRoutes(input: DispatchInput, routes: SharedRoutes, maxDistanceMeters: number): RouteEvaluation;
auditExistingPlan(input: DispatchInput, plan: BuyerPlan, maxDistanceMeters: number): DraftAuditReport;
verifyDispatch(contract: AssuranceContract, input: DispatchInput, artifact: unknown): AssuranceReport;
```

The checker package can share its own independent evaluation kernel between draft audit and purchased-plan verification. It cannot share solver scheduling helpers. `verifyDispatch` first validates/canonicalizes documents and checks every binding/version/required scenario; a binding failure returns pass=false and no computed route schedules. Then it calls `evaluateRoutes` under the contract's limits. Persist accepted timestamps outside the pure deterministic report.

Coverage, vehicle identity and load/distance are shared checks. Time recurrence is repeated independently for each scenario, with exact service/wait/depot-return semantics from the base. `ScenarioEvaluation.pass` concerns that scenario's time/window/shift checks after structural validity; global `RouteEvaluation.pass` additionally requires all shared checks. A 3/3 temporal result with an overloaded van or excess distance is still a rejected plan. Empty routes have zero distance/load and return at shift start in every scenario. Structural failures prevent indexing unknown nodes and produce no scenario schedules. Violation order is deterministic: shared violations first, then canonical scenario order, then code/vehicle/stop. The top-level array contains shared and scenario violations once each, capped at 200; scenario arrays project the retained entries for their ID. `violationsTruncated` is always explicit. Compute pass from all checks before truncation, so a removed diagnostic can never turn failure into success.

A draft report is **not payment evidence**, even if it says pass. `recordDispatchCandidate` re-runs `verifyDispatch` on the stored frozen task, persists artifact/report and passes only a supported, correctly bound accepted result into the settlement controller. No client-supplied report authorizes capture.

## 4. Solver request and robust dimensions

```ts
type DispatchSolveRequest = {
  input: DispatchInput; contract: AssuranceContract;
  contractHash: Sha256; inputHash: Sha256; scenarioSetHash: Sha256;
  strategy: SolverStrategy; attempt: 1 | 2; modeledScenarioIds: NodeId[];
};
type DispatchSolveResult =
  | { status: "CANDIDATE"; artifact: AssurancePlanArtifact }
  | { status: "NO_SOLUTION_WITHIN_LIMIT"; searchStatus: string; diagnostics: string[] }
  | { status: "SOLVER_ERROR"; code: string };
runDispatchSolver(request: DispatchSolveRequest): Promise<DispatchSolveResult>;
recordDispatchCandidate(taskId: Id, artifact: AssurancePlanArtifact): Promise<AssuranceReport>;
```

Use one `RoutingModel`, one `RoutingIndexManager`, shared capacity/distance, and a dimension per modeled scenario. Python callback construction must bind values at creation:

```python
def make_time_callback(matrix, manager, service_by_node):
    def transit(from_index, to_index):
        a = manager.IndexToNode(from_index)
        b = manager.IndexToNode(to_index)
        return matrix[a][b] + service_by_node[a]
    return transit

callbacks = []  # retain callback references until solve returns
for scenario in required_scenarios:
    callback = make_time_callback(scenario.travelSeconds, manager, service_by_node)
    callbacks.append(callback)
    callback_id = routing.RegisterTransitCallback(callback)
    name = f"Time_{scenario.id}"
    routing.AddDimension(callback_id, 86400, 86400, False, name)
    dimension = routing.GetDimensionOrDie(name)
    for stop in stops:
        dimension.CumulVar(manager.NodeToIndex(node_index[stop.id])).SetRange(
            stop.windowOpenSeconds, stop.windowCloseSeconds)
    for v, vehicle in enumerate(vehicles):
        dimension.CumulVar(routing.Start(v)).SetRange(vehicle.shiftStartSeconds, vehicle.shiftStartSeconds)
        dimension.CumulVar(routing.End(v)).SetRange(vehicle.shiftStartSeconds, vehicle.shiftEndSeconds)
```

Here `required_scenarios` is the server-selected modeled subset (all scenarios for the default), `node_index` uses frozen node order, and depot service in `service_by_node` is zero. Serialize stop IDs from the one shared `NextVar` assignment, **including empty vehicles**, not scenario-specific order arrays. Discard solver timestamps; the checker recomputes them.

The solver's20-second search limit,25-second process watchdog, maximum two attempts and stable first-authorization-send deadline remain mandatory. If remaining time is insufficient, stop before another attempt and clean up. A full robust model's failed candidate is treated as a defect/injected corruption unless evidence says otherwise; do not invent a story of normal hallucinated routes.

## 5. Margins, remedies and comparison

```ts
type FragilityReport = {
  schemaVersion: "route-fragility/v1";
  inputHash: Sha256; artifactHash: Sha256;
  worstWindow: { scenarioId: NodeId; vehicleId: NodeId; stopId: NodeId; marginSeconds: number } | null;
  worstShift: { scenarioId: NodeId; vehicleId: NodeId; marginSeconds: number } | null;
  uniformLegDelay: { testedUpperBoundSeconds: 3600; toleranceSeconds: number; capped: boolean } | null;
};
type WithoutSource<T> = T extends { source: SourceSpan } ? Omit<T, "source"> : never;
type RemedyChange = WithoutSource<ConstraintChange>;
type RemedyDraft = {
  id: Id; sourceInputHash: Sha256; sourcePlanHash: Sha256;
  scope: "FIXED_ROUTE_SUFFICIENT_CHANGE";
  changes: RemedyChange[]; explanation: string;
  afterEvaluation: RouteEvaluation;
  requiresNewTaskAndConsent: true;
};
type PlanComparison = {
  inputHash: Sha256; sourcePlanHash: Sha256; rescueArtifactHash: Sha256;
  distanceDeltaMeters: number;
  originalPass: boolean; rescuePass: boolean;
  changedVehicleCount: number; changedStopPositionCount: number;
};
measureFragility(input: DispatchInput, artifact: AssurancePlanArtifact, maxDistanceMeters: number): FragilityReport;
draftFixedRouteRemedies(input: DispatchInput, plan: BuyerPlan, maxDistanceMeters: number): RemedyDraft[];
comparePlans(input: DispatchInput, original: BuyerPlan, rescue: AssurancePlanArtifact, maxDistanceMeters: number): PlanComparison;
```

`ConstraintChange` normally requires a source quote from prose. For deterministic remedies use the **distinct** `RemedyChange` union above, with distributive omission so variant fields survive. These are not fake quotes attributed to the merchant. The review ledger distinguishes `AI_SOURCE_QUOTE`, `USER_EDIT` and `CHECKER_WITNESS` provenance. Review converts accepted remedies into explicit user edits in a new draft. No model-generated quote is invented for an arithmetic remedy.

An exact fixed-route window remedy sets the close to the maximum service-start across scenarios if within the supported day; other violations can remain. Capacity/shift/distance remedies are similarly explicit and re-evaluated. No claim of minimal fleet changes or globally minimal relaxation. Never remove a stop/scenario or extend a customer promise without review.

Comparison reports signed distance delta (`rescue - original`), so the flagship displays+400m. `changedVehicleCount` counts vehicle IDs whose ordered stop list differs (one in the fixture); position change counts stops whose tuple `(vehicleId, zeroBasedPosition)` differs (two in the fixture). Define both once in tests. Do not call a longer rescue a distance saving. Fragility arithmetic is deterministic and nonprobabilistic; the uniform delay experiment adds delta to each traversed off-diagonal leg and binary-searches0…3600. If the base plan fails, tolerance is null. A capped result means “at least3600 within tested range.”

## 6. Persistence and API additions

Add these small relational records to the base schema:

| Table | Purpose/constraints |
|---|---|
| `dispatch_inputs` | immutable canonical DispatchInput/jsonb/hashes/provenance; owner/task binding |
| `buyer_plans` | original supplied routes, owner, input hash and canonical plan hash; independent of paid generated artifacts |
| `draft_audits` | input/plan hash, distance limit, versioned report, created time; clearly no accepted-payment flag |
| `scenario_sets` | immutable expanded matrices/recipes/hash; can be embedded in input plus indexed reference; no silent mutable matrix cache |
| `assurance_reports` | accepted/failing report with contract/input/artifact/scenario bindings; immutable |
| `task_lineage` | parent/child task IDs and change reason; same owner required; no cycles, no financial inheritance |
| `remedy_drafts` (full product) | source report/hash, exact changes and review outcome; never an in-place authorized-contract edit |

For the deadline version, input/scenarios/buyer plan can live in the immutable contract-related JSON rows rather than normalizing every field twice. Preserve unique hash/version/owner checks. `freezeDispatchTask` creates the version2 contract; existing financial services consume a validated supported contract descriptor instead of rewriting PayPal logic for each version.

```ts
type FrozenDispatchView = { taskId: Id; input: DispatchInput; sourcePlan: BuyerPlan;
  contract: AssuranceContract; contractHash: Sha256; inputHash: Sha256; scenarioSetHash: Sha256 };
type ReviewedDispatchDraft = {
  input: DispatchInput; sourcePlan: BuyerPlan; maxTotalDistanceMeters: number;
  proposalRunId: Id | null; acceptedChangeIndexes: number[];
  resolvedIssues: Array<{ issueIndex: number; resolution: string }>;
  userChanges: RemedyChange[]; confirmConsent: true;
};
freezeDispatchTask(actorId: Id, taskId: Id, expectedRevision: number,
  review: ReviewedDispatchDraft): Promise<FrozenDispatchView>;
cloneDispatchTask(actorId: Id, taskId: Id, reason: string): Promise<{ taskId: Id; revision: number }>;
```

`proposalRunId`, when present, must belong to the actor/task and exact draft revision/brief. Stale proposals, duplicate/out-of-range change indexes or unresolved proposal issues block freeze. The server re-applies selected validated changes and explicit user changes to the stored draft, validates scenarios/provenance and compares the normalized result/ceiling against the submitted review; a client snapshot alone cannot bypass review. Scenario/source-plan edits must already be saved under the expected revision. A null proposal is an explicitly recorded manual-review path, never labeled an AI run; the submitted flagship must demonstrate a real non-null AI proposal. Every resolved issue retains its text and human disposition; a reason alone does not permit an invalid/out-of-scope constraint. Only the server supplies consent actor/time, seller, price, supported verifier, quote expiry and execution limits.

The main HTTP endpoints retain `/api/tasks/:id`. Its freeze body becomes the version2 review shape; draft state stores the complete DispatchInput/source plan. Add `POST /api/tasks/:id/audit` for owner-supplied-plan evaluation before freeze, `POST /api/tasks/:id/clone` for a new editable child, and `GET /api/tasks/:id/comparison` after released rescue. Full-product remedies use `POST /api/tasks/:id/remedies` with explicit draft-only scope. Input schema version selects the handler; unsupported/mixed-family payloads return422 `SCHEMA_VERSION_MISMATCH`.

Before completed capture, return only stage, nonrevealing check summary and payment status for service-generated candidates. The owner's original plan/draft audit can be displayed anytime. Never let the audit/comparison endpoint reveal an unreleased rescue by accepting its stored artifact ID as buyer input.

## 7. Evidence bundle and read tools

```ts
type AssuranceBundle = {
  schemaVersion: "proofroute-bundle/v2";
  input: DispatchInput; inputHash: Sha256;
  contract: AssuranceContract; contractHash: Sha256;
  sourcePlan: BuyerPlan; sourcePlanHash: Sha256;
  artifact: AssurancePlanArtifact; artifactHash: Sha256;
  report: AssuranceReport;
  fragility: FragilityReport | null; comparison: PlanComparison | null;
  payment: VerificationBundle["payment"];
  provenance: { verifierVersion: "2.0.0"; sourceRevision: string; datasetLabel: string;
    computationMode: "ACTUAL_LOCAL"; paymentEvidenceMode: "REAL_SANDBOX" | "MOCK_TEST";
    scenarioAssumptions: Array<{ scenarioId: NodeId; assumptionText: string }> };
};
```

Required provenance includes the actual source revision and source/assumption labels. Export validation uses generated schemas, not a loose `Record<string,unknown>`. Export only after the base release guard. The optional fragility/comparison values are recomputed and hash-bound; null means not implemented/computed, not a zero margin. Reuse `VerificationBundle` solely for its explicit payment shape, not version1 route acceptance.

`pnpm verify:bundle` dispatches by bundle version, recomputes all hashes and the independent scenario report, and compares acceptance fields. It can validate route integrity/feasibility offline. It cannot authenticate copied PayPal JSON or promise current payment finality. Exit0 for valid supported passing plan,1 for mutation/failure,2 for unsupported schema.

Optional MCP read tools are `get_task_status`, `list_acceptance_checks`, `get_released_receipt`. HTTP transport resolves actor from verified subject/issuer/audience; execution rechecks current ownership and scope. Stdio local deployment documents the local trusted process boundary. No money endpoints/tokens are exposed. Tool descriptions are fixed reviewed source, not caller-authored instructions. A small three-tool interface needs no semantic tool-search system or enterprise registry.

An evidence explorer is an owner-scoped projection across relational rows, linking source edits → frozen rules → scenario reports → artifact → provider observation. It never turns an explanatory AI answer into a financial fact. Operator reconcile actions enqueue deduplicated read/recovery jobs under the existing operation lane; there is no “force paid” button.
