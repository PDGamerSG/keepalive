# ProofRoute Dispatch Assurance — extensive product blueprint

**Decision after the second research pass:** deepen ProofRoute into a **dispatch audit and rescue service**. The original “buy a checked route” design remains its payment/computation foundation. This document defines the larger product and its distinctive demonstration: an existing plan appears acceptable in nominal conditions, a separate checker exposes the precise broken delivery promise under an agreed delay scenario, and the service produces a rescue plan that passes every frozen scenario before capture.

**Product promise:** “Find the broken promise. Buy a verified rescue plan.”

**Status:** design and implementation handoff, not implemented software. Exact scenario contracts are in [ASSURANCE_CONTRACTS.md](../../ASSURANCE_CONTRACTS.md); execution order is in the [extended implementation plan](../plans/2026-11-10-proofroute-assurance.md). Read the [original design](2026-11-10-proofroute-design.md) for the base routing/payment model and [technical contracts](../../TECHNICAL_CONTRACTS.md) for the corrected financial foundation.

## 1. Why expand in this direction

The second investigation found stronger competition than the initial pass. Stood and Rentabot disclose sophisticated evidence-gated agent procurement; Routific already has agent/MCP dispatch operations; VROOM validates supplied plans; Timefold supports disruption-aware replanning. RouteNexa includes a what-if simulator. **No individual ingredient below is claimed as an invention.** The comparative report records exactly what was inspected and what remains unknown.

The useful product wedge is a single merchant decision: **“Can I rely on this dispatch plan under the assumptions I accepted, and what exact change rescues it?”** The purchase is a useful, verifiable rescue artifact with an understandable assurance report. PayPal controls that service purchase. General agent marketplaces, new payment protocols and live fleet management are outside the headline.

This is a composite differentiation hypothesis. Existing route tools may add or already contain comparable features beyond what was inspected. Customer willingness to pay is unvalidated. A successful hackathon build demonstrates the workflow and engineering quality, not a proven business moat.

## 2. The flagship story

A local retailer has a plan for today's deliveries. The cheapest nominal order is four kilometers. It fits the baseline time estimates, so a basic distance optimizer could present it as successful. ProofRoute imports it and applies the reviewed customer windows, van constraints and three explicit travel scenarios. The checker produces a witness: **stop B starts fifteen minutes after its promised close under CORRIDOR_DELAY**.

The merchant sees exactly which legs caused the failure and what the report assumes. The merchant chooses to purchase a rescue under the same promises and a 4.5-kilometer limit. After PayPal authorization, a robust solver searches for one shared assignment/order valid in all three scenarios. A 4.4-kilometer plan passes every scenario, is stored, then permits capture. The released report shows the extra 400 meters, the worst-case tested margin and the completed payment observation.

The tiny fixture is explicitly synthetic. Its six possible stop orders can be enumerated, providing a falsifiable mathematical demonstration without making a traffic prediction. Use the canonical [version2 input](../../examples/assurance-input.json), [buyer plan](../../examples/assurance-buyer-plan.json) and [oracle](../../examples/assurance-oracle.json) as the starting design resources; the implementer must reproduce it in the application before presenting it as working software.

## 3. Twelve connected capabilities

| Module | User-visible capability | Engineering depth and limit |
|---|---|---|
| A. Dispatch intake | Import stops, vehicles and an existing route; load a reproducible sample | Typed CSV/JSON, unit normalization, known IDs, row errors; no arbitrary documents/code. Existing buyer-provided route remains accessible to the buyer. |
| B. Promise compiler | Explain ordinary-language requirements as proposed, source-quoted rules | Actual local model, allowlisted operations, ambiguity review, source spans and user corrections. No money tools. |
| C. Matrix provenance | Show where travel assumptions came from and freeze them | Synthetic or road-engine snapshot, units, directed node order, engine/profile/map metadata, hashes, unreachable-cell rejection. No silent geocoding fallback. |
| D. Independent audit | Show every failed stop/window/load/shift/distance obligation | Deterministic per-scenario arithmetic and concrete witness values. A failed supplied route is not proof no feasible route exists. |
| E. Scenario laboratory | Compare nominal, corridor delay and city slowdown | Named finite frozen matrices, one shared route sequence, all required scenarios checked. No invented probability, weather forecast or SLA guarantee. |
| F. Robust rescue solver | Produce a replacement dispatch satisfying the accepted scenario set | One OR-Tools route topology with a separate time dimension per scenario; all hard constraints retained; bounded CPU/time. |
| G. Margin explorer | Explain how close the accepted plan is to its limits | Per-stop/window, vehicle shift/capacity and distance headroom; optionally exact bounded uniform-leg-delay tolerance. These are model margins, not observed reliability. |
| H. Reviewed remedies | Explore a limited set of explicit requirement changes | Route-local sufficient relaxations/new draft, impact diff and fresh consent. Never silently relax an authorized contract or call the changes globally minimal. |
| I. Replanning lineage | Compare original/rescue/subsequent work without losing provenance | New task per changed promise/matrix; parent reference and route diffs. No reuse of an old authorization and no implicit refund. |
| J. PayPal settlement controller | Authorize, compute, check, capture/release or void/reconcile | Durable journal, stable operation keys, verified resource binding, uncertain-outcome handling, cancellation races and authenticated webhook processing. |
| K. Evidence explorer | Trace a requirement to the output and payment fact | Source phrase → frozen rule → scenario → witness/report → accepted artifact → provider observation. A relational read projection, not an unnecessary graph database. |
| L. Agent/operator interface | Inspect jobs/results and reproduce failures | Owner-scoped read tools, optional narrow MCP, replay/fault labels, worker restart drills and sanitized debug IDs. Human PayPal approval remains explicit. |

All modules serve the same dispatch contract. This is extensive through modeling, data lineage, verification and recovery; it does not need unrelated invoicing, payroll, social feeds, crypto or live GPS.

## 4. Full product, flagship build and deadline cuts

The **full product** includes A–L with road-engine integration, actual imported customer-shaped data, scenario editing, remedy drafting, lineage, evidence explorer and agent interface. A careful first implementation is estimated at **70–100 focused hours**, followed by real merchant validation and production hardening. This estimate excludes building an enterprise multi-tenant payments platform or validating real-world reliability.

The **recommended hackathon flagship** includes:

- A working sample/imported-plan path and actual AI proposal/review.
- Three frozen synthetic scenarios and independent audit with a concrete late-stop counterexample.
- A robust rescue under one immutable contract, actual local computation, real sandbox authorization/capture and release.
- A failed/no-accepted-plan purchase with actual void, durable recovery and financial safety tests.
- A readable nominal-versus-rescue comparison, scenario margins, useful dispatch export and offline verification bundle.

That is estimated at **44–58 focused hours** for an experienced AI-assisted builder, contingent on working credentials/tooling. At the November10 14:55 IST second-pass checkpoint, approximately58h35m remain before the hard deadline, so this is tight for one person. The plan sets go/no-go checkpoints and reserves submission time. Two people can divide UI and core after contracts stabilize; delegation must follow the active session's rules.

If the first vertical slice runs behind, keep the base 32–38-hour safe service and add the three-scenario checker/solver before any optional protocol/dashboard. Do not pretend all full-product modules will fit. A pinned, clearly synthetic scenario demo is stronger evidence than an unfinished live-data integration. Road matrices are a useful next milestone, not a reason to miss the submission.

## 5. Input and scenario semantics

Reuse the base delivery-only model: one depot, every stop mandatory once, no pickups/reloads, fixed vehicle departures, service-start windows inclusive, depot return inside shift, integer units and one local day. All routing assumptions remain visible to the merchant.

A scenario set contains `NOMINAL` plus up to two additional named matrices of travel seconds. The stop IDs, directed graph ordering, distance matrix, demands, service durations, windows, capacities and shifts are shared. Scenario differences represent **travel-delay assumptions only** in this version. Road closures, new depots, changed fleet availability and pickups require a new input/model, not an overloaded delay label.

One artifact contains one route per vehicle. Its assignment/order is the **same in every scenario**; only waiting/arrival/service/depot-return times differ. Acceptance requires every mandatory constraint to pass in every required scenario, plus the shared distance ceiling. Solving an independent route for each scenario would produce different operational plans and does not meet this contract.

The route checker uses the earliest allowed service start in each scenario. Waiting is allowed; all edges and service durations contribute. Report scenario-specific violations even when another scenario passes. An accepted plan may still fail under an unmodeled delay or bad underlying data. The badge must say `Passes 3 frozen scenarios`, never `Guaranteed on-time delivery`.

## 6. Audit and remedy interaction

The free audit uses the buyer's submitted route, not a service-generated replacement. It can show that route in full because the buyer supplied it. It is marked `Draft audit` until the user reviews the complete input and scenario assumptions. There is no PayPal authorization for extraction or this audit.

The paid rescue contract is frozen only after the merchant accepts the rules/scenarios/price. Before capture the interface can show stage, elapsed time, failed attempt counts and nonrevealing check summaries. It withholds the new service-generated route sequence and complete artifact. A public route preview that exposes every stop would defeat the intended deliverable boundary; the application remains a trusted seller rather than a cryptographic fair-exchange system.

Suggested remedies must state their scope. Example: “For this fixed route under CORRIDOR_DELAY, B's service-start close would need to move by at least900 seconds.” This arithmetic is a local witness, not a globally minimal route change or a request to break a customer promise. The merchant can instead request a rescue keeping the window unchanged. A changed promise creates a new draft/task and fresh consent. Work already captured remains historically captured; lineage is not an automatic reimbursement policy.

## 7. Margin calculations

For a checked scenario, `windowMargin = close - serviceStart`, `shiftMargin = shiftEnd - depotReturn`; capacity and distance margins are analogous integer differences. Report minima with the exact responsible stop/vehicle/scenario. Negative values are failures, not confidence scores.

Optional `uniformLegDelayToleranceSeconds` is the largest integer delta in `[0,3600]` that can be added to **each traversed nonempty leg's travel time** while the same plan still passes all frozen scenarios. Recompute through the checker and binary-search the monotonic predicate; label results at 3600 as `at least3600 within tested range`. Empty routes gain no leg. This is one specified perturbation model, not a traffic probability or a universal delay bound.

Do not add “risk95%” unless there is an actual calibrated probabilistic model and validation dataset, which are outside the committed build. Do not infer global infeasibility from the failure of one route or a20-second heuristic search.

## 8. UI as a coherent assurance workspace

Use five primary views:

1. **Dispatch & promises:** stop/vehicle grid, existing route import, natural-language brief and reviewed rule ledger.
2. **Audit & scenarios:** route diagram, scenario switcher, per-stop schedule, violation list; selecting a violation highlights its arithmetic/edge and source requirement.
3. **Rescue contract & checkout:** unchanged promises, required scenarios, distance ceiling, $4.50 price, frozen assumptions and explicit PayPal authorization.
4. **Rescue result:** original-versus-accepted plan, extra distance and actual worst tested margins, completed payment receipt, useful export and offline check.
5. **Evidence & operations:** linked artifacts/observations, state timeline, redacted diagnostics and clearly marked replay/injection lab.

At every point distinguish `AI proposed`, `User reviewed`, `Solver candidate`, `Checker passed`, `PayPal capture completed`. Avoid a single green status that implies all five. The result should look like an operational decision tool, not a chat interface with a payment button.

## 9. Local computation and privacy

Run language extraction locally through Ollama; run scenario optimization locally in Python; independently check in TypeScript. The observed64GiB machine is sufficient to attempt the selected8B model, but no performance is assumed until measured. Pin Python3.12 for the inspected OR-Tools wheels and Node24 LTS for the current tutorial ecosystem rather than relying on global defaults.

Real road mode accepts reviewed coordinates and a configured matrix engine. A local regional OSRM instance is attractive when data preparation is available; a small precomputed road-matrix snapshot is a better deadline artifact than downloading a country extract on the critical path. Hosted services have request/cell/rate/terms limits. Do not send addresses to a public demo server or use its availability as a production contract.

Store matrix provenance and input hashes before authorization. No solver, model, uploaded CSV or MCP caller chooses a provider URL/payee/price. The privacy claim is limited: local inference/compute avoids a cloud LLM by default; a configured hosted matrix service still receives coordinates, and PayPal still receives checkout data.

## 10. What the larger project must prove

- The nominal-looking plan fails a specific frozen scenario by a reproducible amount.
- The rescue shares one assignment/order across all required scenarios and passes independent recomputation.
- The model actually translates a meaningful requirement; review and schema authority are visible.
- The paid rescue is durably stored before capture, released only on matching capture completion, and available after restart.
- A failed purchase ends with authoritative void/cleanup, with uncertainty shown honestly.
- The useful merchant output is a schedule and report, not merely logs of internal tools.
- Evidence from simulations, local executions, fake-provider tests and real sandbox resources remains separate.

The full product is extensive. The submitted build must state exactly which capabilities work; architecture diagrams and research breadth do not establish implemented functionality.
