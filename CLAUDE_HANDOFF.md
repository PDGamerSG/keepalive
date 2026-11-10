# Claude implementation handoff: ProofRoute Dispatch Assurance

**Chosen idea:** “Find the broken promise. Buy a verified rescue plan.” Build an AI-assisted dispatch audit/rescue product with meaningful PayPal authorization, conditional capture, void and recovery. This folder contains a researched design and static arithmetic fixtures. **No application, model execution, OR-Tools run or PayPal transaction has been implemented/verified here.**

The strongest demonstration imports A→B→C, a 4000m plan that passes nominal travel but starts B 900s late under an agreed corridor delay. The merchant buys a rescue for 450 cents USD. A locally computed B→A→C plan covers 4400m, passes all 3 frozen scenarios under 4500m, has 300s minimum window margin and returns by 10:25. Those are independently recomputed **static fixture values**; reproduce them in the actual build before presenting them as executed evidence.

The full product has 12 connected modules: intake, source-grounded promise compiler, matrix provenance, independent audit, scenario lab, robust rescue solver, margins, reviewed remedies, replanning lineage, PayPal controller, evidence explorer and owner-scoped operator/agent access. Full first-build estimate 70–100 focused hours. Recommended flagship 44–58 hours including integration reserve; base safe path 32–38 hours. Actual remaining time must govern cuts. Keep three-scenario audit/rescue ahead of optional road data, remedies, MCP or dashboards.

## Read order and authority

1. [Expanded blueprint](docs/superpowers/specs/2026-11-10-proofroute-assurance.md): product, complete feature set and honest limits.
2. [Version2 contracts](docs/ASSURANCE_CONTRACTS.md): exact scenario/input/audit/solver/report/bundle types and server review rules.
3. [Base technical contracts](docs/TECHNICAL_CONTRACTS.md): corrected payment/session/journal/locking/recovery authority.
4. [Integrated implementation plan](docs/superpowers/plans/2026-11-10-proofroute-assurance.md): execute this, using referenced base tasks as detailed recipes. Do not build two apps or add both plans' estimates.
5. [Resources and setup](docs/IMPLEMENTATION_RESOURCES.md), [validation/demo](docs/VALIDATION_AND_DEMO.md), [canonical fixture guide](docs/examples/ASSURANCE_FIXTURE.md).
6. [Second-pass synthesis](research/round2/README.md): strongest prior work, strategy/people, source catalogs and evidence limits. Read before making novelty/impact claims.

For conflicts: current hackathon rules/user instructions first; v2 contracts for assurance; corrected base contracts for finance; integrated plan for order/scope. Original v1 design/tasks supply foundations and regression examples. A v1 report cannot satisfy a v2 contract. No client/model report authorizes capture.

## Paste this into Claude with workspace access

```text
Implement ProofRoute Dispatch Assurance in this workspace. Read CLAUDE_HANDOFF.md and its ordered documents, then execute docs/superpowers/plans/2026-11-10-proofroute-assurance.md. This is an authorized implementation request, not another research task. Preserve the research/user files. Do not stop for a design-approval or execution-choice loop; resolve routine details using the frozen specifications and active environment instructions. Use agents only within current authorization and tool rules.

Product: a merchant imports an existing dispatch plan plus stops/vehicles, receives a real local-AI proposal for source-quoted constraints, reviews it, and gets an independent draft audit under named frozen travel scenarios. The paid deliverable is one shared route assignment/order passing all required scenarios, with useful schedules and an assurance report. Price 450 cents USD in PayPal sandbox. No unrelated marketplace, wallet, payroll, crypto, live GPS or multi-seller features.

Use Node24 LTS, TypeScript/Next16 with compatible pinned React, PostgreSQL16/Drizzle, one transactional PostgreSQL jobs/outbox, JSON Schema with generated TS/Python bindings, Python3.12/OR-Tools, local Ollama/qwen3:8b, Vitest/pytest/Playwright. Local defaults observed were Node26/Python3.15; select project runtimes explicitly without overwriting globals. Inspect package compatibility and lock exact resolved versions. Use direct fixed-host PayPal REST unless a clearly justified single official-SDK adapter is simpler. No provider/model switching just to hide a missing capability.

Start with the canonical docs/examples/assurance-* files. Validate schemas/provenance/recipe equality, implement independent TypeScript schedule arithmetic, and prove the original plan's900s B violation plus the rescue's4400m/300s margin. Then run an actual robust OR-Tools solve with one RoutingModel/NextVar topology and one time dimension per required scenario. Bind Python callbacks correctly, include empty vehicles, retain all mandatory stops and the global distance sum. Check every result independently. The static oracle is not proof the solver works. Never claim arbitrary-instance optimality or real-traffic reliability.

Implement the actual sandbox path early: review/freeze → AUTHORIZE order/buyer approval → authorization → bounded local solve/check → stored artifact/report → capture → release. First prove real authorization/capture capability before investing in UI. The separate failed task must end in authoritative confirmed void. Do not seed Payouts or production funds. If secrets are absent, report precise missing configuration and use the environment's private secret mechanism if available; never invent credentials or label mocks as real. Continue independent work rather than requesting broad research preferences.

Financial invariants are mandatory. Price/seller/versions come only from frozen server records. Journal stable request IDs/bodies before effects. Before the first authorization HTTP send, persist authorization_started_at and work_deadline_at=started+120s; never reset on retries/recovery. The 120s promise ends at verified acceptance/capture reservation; provider resolution may occur later and UI says so. Late uncertain authorization is read/reconciled, not replayed into a fresh late hold. 20s search/25s watchdog per attempt, max2 attempts. Buyer approval time is outside the work deadline.

Serialize a task's financial lane with row constraints and a dedicated direct/session-pooled PostgreSQL advisory-lock connection; PgBouncer transaction pooling is incompatible with this session-lock design. DB connection loss/local abort cannot cancel a remote PayPal effect. Keep capture/void choice reserved through uncertainty, use the same logical operation key, reconcile unknown effects before any conflict, and never call this exactly-once external settlement. Store accepted artifact/report before capture; release only after a correctly linked capture COMPLETED for exactly450 centsUSD to the expected seller. Order COMPLETED is not payment; PENDING/UNKNOWN withholds output. Unexpected partial capture is an incident; voiding a remaining hold is not refunding captured money.

Webhook intake stores untrusted raw envelopes with local UUIDs. Only successful authenticity verification can reserve provider/environment/app/eventID dedup identity. A forged claimed ID must not suppress a later authentic event. Preserve adjustment/refund/reversal facts and capture history. Handle void204/minimal bodies and endpoint-specific request-ID retention evidence; no blind generic POST retries or fresh key to resolve uncertainty.

AI only proposes allowlisted edits with exact source spans and known IDs. Server review checks current proposal/draft revision, selected changes, issue dispositions, explicit user edits and final normalized input. The model has no payment credentials/tools/URLs or authority to remove scenarios/change consent. A manual path may exist but is labeled; the flagship demonstrates actual AI. Each required scenario is a frozen assumption, not a probability/forecast. Same route order in all scenarios; independently recomputed earliest schedules can differ.

Build the five-view merchant workspace: dispatch/promises; audit/scenarios; contract/PayPal; released comparison/schedules; evidence/operations. Show B's actual late witness, then the +400m rescue tradeoff,3/3 checks and margins. Data comes from reports, not hard-coded demo outputs. Owner-supplied original plan can be shown before payment; newly generated rescue routes must remain withheld on every path until release, including audit/comparison/tools. Use readable synthetic schematic SVG; road snapshots/MCP/remedies/lineage UI are later milestones if time remains.

Use the integrated plan's staged checks and deadline cuts. Test pure arithmetic/bindings, real PostgreSQL races/restarts, webhook ID poisoning, capture response loss after provider commit, stable deadline recovery, cancellation and cross-owner access. Keep deterministic fake-provider tests, PayPal negative tests, actual local compute and real sandbox evidence separately labeled. Exports use exact AssuranceBundle and an offline CLI; offline checking proves route integrity/feasibility, not authenticity/current finality of copied PayPal JSON.

Hard deadline: Nov12,2026 20:00UTC = Nov13 01:30IST. Re-read clock/rules at start; the research checkpoint Nov10 14:55IST left about58h35m. Target ready submission by Nov12 20:00IST, reserve upload/processing time and cut optional modules early. Do not weaken finance or present incomplete modules as built. After the hard deadline, organizer says no code/README/video edits until announcement. Keep the judge path available through judging and conservatively Dec21.

Completion requires a runnable actual-AI build, a real matching captured/released task, a real failed/voided task, targeted passing correctness/recovery/access tests, production build and clean judge setup, useful export/offline checker, licensed public-source package and an honest public YouTube demo strictly under 3min. Prepare concrete repository/video/Devpost materials; publication/submission follows active authorization. Do not delete previous submissions. Keep raw third-party research captures and unlicensed datasets out of public source.

Report actual commands/provider evidence, working features, exact blockers and next critical work at each checkpoint. Research breadth, static arithmetic and architecture diagrams do not establish implementation. Continue until the intended working submission package is ready.
```

## First checkpoint

Within 90 minutes, establish explicit runtimes/database, the canonical fixture, a working checker test and exact sandbox configuration status. Start local model preparation if needed. The first evening must prove actual robust solve/check and real authorization/capture capability. Avoid further broad research, branding or optional sponsor tooling before that path works.

There is no verified hiring guarantee, exhaustive current-gallery ranking, uniqueness claim or assured win. Stood/Rentabot, Routific/VROOM/Timefold and RouteNexa already cover close ingredients. The project's claim is a well-executed composite merchant workflow, supported by evidence and honest limitations.
