# Implementation resources, pins and adoption limits

Curated from two research passes and three specialist investigations. These are inspected references for a future build, not installed dependencies or verified app results. Read the [integrated plan](superpowers/plans/2026-11-10-proofroute-assurance.md) first; use this guide when implementing its boundaries. Exact capture titles, timestamps and limitations are in the [round2 catalogs](../research/round2/README.md) and [first-pass manifest](../research/manifest.json).

## Start with these ten resources

1. [Current rules](https://paypalaihackathon.devpost.com/rules) and [organizer updates](https://paypalaihackathon.devpost.com/updates): actual AI, meaningful sandbox use, working licensed public source, public YouTube under 3min, deadline and subsequent freeze. Do not substitute another event's judging criteria.
2. [PayPal create order](https://developer.paypal.com/api/orders/v2/orders-create) → [authorize order](https://developer.paypal.com/api/orders/v2/orders-authorize): use AUTHORIZE, one 450-centUSD purchase unit, expected seller and server-stored linkage. Browser approval requests server processing; it never proves paid.
3. [Capture authorization](https://developer.paypal.com/api/payments/v2/authorizations-capture) and [void authorization](https://developer.paypal.com/api/payments/v2/authorizations-void): distinct final outcomes; `final_capture:true`, exact amount, stable operation key. A hold is not escrow.
4. [Official OR-Tools time-window source](https://github.com/google/or-tools/blob/stable/ortools/constraint_solver/samples/vrp_time_windows.py) and [capacity guide](https://developers.google.com/optimization/routing/cvrp): adapt to service-at-origin, fixed starts, empty vehicles and separate scenario dimensions. Do not copy the example's omissions into the product.
5. [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs) and [Qwen3:8b model](https://ollama.com/library/qwen3:8b): real schema-constrained local extraction, validated again as untrusted data. The model proposes; the user reviews.
6. [PostgreSQL16 locking](https://www.postgresql.org/docs/16/explicit-locking.html) and [PgBouncer feature matrix](https://www.pgbouncer.org/features.html): durable row constraints plus a dedicated session advisory lock for money-operation serialization; transaction pooling does not support that session lock contract.
7. [Webhook integration](https://developer.paypal.com/api/rest/webhooks/rest/) and [event names](https://developer.paypal.com/api/rest/webhooks/event-names): durable untrusted envelopes, postback signature verification, authenticated event dedup and authoritative linked reads.
8. [Current PayPal/AG Grid workshop](https://developer.paypal.com/community/blog/PayPal_AG_Grid_Part_1/), Nov5,2026: concrete Node24/Next16/server-only sandbox setup. Its reporting/Payouts seed is outside this product; do not copy those mutations.
9. [OWASP agent security](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html): execution-time authorization and parameter-bound approval. No model flag, tool discovery or schema-valid JSON grants finance authority.
10. [Canonical input](examples/assurance-input.json), [source plan](examples/assurance-buyer-plan.json), [brief](examples/assurance-brief.txt), [oracle](examples/assurance-oracle.json): original synthetic reproducibility resources. Static arithmetic is a design check; Claude must produce actual solver/model/provider evidence.

## Runtime and dependency baseline

| Component | Selection | Evidence and practical limit |
|---|---|---|
| Node | Pin24 LTS in project/CI/container | [Official releases](https://nodejs.org/en/about/previous-releases), R13. Local default26.8.1 is also listed LTS at inspection;24 is a compatibility choice, not a claim26 is unsupported. |
| Python | Project-local3.12 | Local default3.15.2 is not assumed compatible with inspected OR-Tools wheels. [uv managed Python](https://docs.astral.sh/uv/guides/install-python/), R14. |
| OR-Tools | Inspect/install9.15.6755, then lock actual resolved graph | [PyPI files](https://pypi.org/project/ortools/#files), O16: cp312 macARM64 wheel21.9MB, x86_64 23.9MB. Apache2.0 project; wheel availability is not an installation test. |
| Front end | Stable Next16/React pair, exact patches pinned | Current official workshop uses Next16. TypeScript/Tailwind/accessibility components are ordinary supporting choices, not judged sponsor requirements. |
| PayPal | Direct fixed-host REST default | Alternative official [TypeScript Server SDK](https://github.com/paypal/PayPal-TypeScript-Server-SDK), inspected2.5.0. Pick one adapter. |
| Database/queue | PostgreSQL16, Drizzle, custom transactional jobs/outbox | Optional [pg-boss](https://pgboss.io/) replaces that queue, not an extra queue. Inspected docs require Node≥22.12/Postgres≥13. |
| Local model | Ollama/qwen3:8b, record actual digest | Captured tag showed Q4_K_M,8.19B parameters,5.2GB weights, Apache2.0 model license. Tag can move; record the actual downloaded digest. Runtime/context memory exceeds file size. |
| Testing | Vitest, pytest, Playwright, real PostgreSQL integration | Use behavior/arithmetic/recovery tests. No fake-provider result substitutes for real sandbox capture/void. |

Proposed setup commands **for implementation**, after creating `services/solver/pyproject.toml` and root package scripts:

```sh
uv python install 3.12
uv add --project services/solver --python 3.12 'ortools==9.15.6755' 'pydantic>=2,<3'
uv lock --project services/solver
uv run --project services/solver --python 3.12 python -c 'import sys, ortools; print(sys.version); print(ortools.__version__)'
ollama pull qwen3:8b
pnpm install
pnpm contracts:generate
pnpm doctor
```

Use the existing version manager or official project image for Node24; do not overwrite the machine's global Node/Python. If the inspected solver pin cannot install, investigate the exact platform error and select a documented compatible pin, updating the lock/evidence. No installs, downloads, model start or payments were performed by this research package.

The observed machine has64GiB RAM and10 logical CPUs. Start with one solver process and one model extraction; measure throughput before raising concurrency. No GPU or paid model service is required by the design. Managed PostgreSQL/hosting or a map service may have costs; the research establishes no monthly operating-cost quote. Local-first can avoid those during the demo.

## PayPal implementation map

| Boundary | Primary reference | Required adaptation |
|---|---|---|
| JS approval | [JS SDK v6 setup](https://developer.paypal.com/sdk/js/set-up) | Use sandbox environment and authorize-compatible flow. Redirect approval is a valid fallback. Never copy capture-on-approval into this contract. |
| Resource reconciliation | [Get order](https://developer.paypal.com/api/orders/v2/orders-get), [get authorization](https://developer.paypal.com/api/payments/v2/authorizations-get), [get capture](https://developer.paypal.com/api/payments/v2/captures-get) | Get-order path is a linked implementation reference; authoritative auth/capture references were opened. Validate order/auth/payee/amount/currency and fetch missing fields using fixed hosts/stored IDs. Never follow arbitrary payload URLs. |
| Idempotency | [API-specific guide](https://developer.paypal.com/api/rest/reference/idempotency), [tagged Orders controller](https://github.com/paypal/PayPal-TypeScript-Server-SDK/blob/2.5.0/doc/controllers/orders.md), [Payments controller](https://github.com/paypal/PayPal-TypeScript-Server-SDK/blob/2.5.0/doc/controllers/payments.md), [migration guide](https://developer.paypal.com/api/rest/integration/payments-api/v1-v2-migration) | Orders says6h; tagged Payments capture/void says45days; newer broad guide says6h. Preserve this conflict in policy evidence. Proposed automatic retries≤15min are below both, not a guarantee; no new key after uncertainty. |
| SDK configuration | [Retry configuration](https://github.com/paypal/PayPal-TypeScript-Server-SDK/blob/2.5.0/doc/retry-configuration.md) | Explicit timeout/retry/redaction. camelCase SDK vs snake_case REST. Override sample `finalCapture:false` and minimal preference. No unjournaled POST retry middleware. |
| Payment status | [Authorization enum](https://developer.paypal.com/api/payments/v2/definitions/authorization_status), [capture enum](https://developer.paypal.com/api/payments/v2/definitions/capture_status), [capture schema](https://developer.paypal.com/api/payments/v2/definitions/capture) | No provider authorization EXPIRED enum in inspected schema. Derive local expiry from actual expiration time plus reads. Preserve partial captures/refunds/reversals as distinct facts. |
| Negative tests | [REST mock headers](https://developer.paypal.com/negative-testing/request-headers), [previous request in progress](https://developer.paypal.com/api/payments/v2/errors/previous_request_in_progress) | Server-only sandbox test configuration, clearly labeled. Mock responses do not exercise downstream money effects. In-flight error means backoff/reconcile. |
| Reporting | [Transaction Search](https://developer.paypal.com/api/transaction-search/v1/search-get) | Up to3h lag and separate reporting permissions; useful later for audit, unsuitable for release/no-effect decisions. |

The official workshop's pinned [scripts revision](https://github.com/paypaldev/hackathon-paypal-ag-grid-boilerplate/tree/d7f892268cd43dde85554ac872cafca8d6f22b84/scripts) is a setup reference. It was linked from an inspected article, not installed or executed. Review its license/behavior before copying. ProofRoute needs no Payouts, subscriptions, platform fees, multiple sellers, delayed disbursement, reauthorization or production funds.

For exact payloads, stable-key rules, authorization deadline, capture reservation, cancellation/void races and webhook admission use [TECHNICAL_CONTRACTS.md](TECHNICAL_CONTRACTS.md). Public API availability does not establish that a particular account is configured; prove the actual sandbox capability early.

## Solver and checker resources

| Source | Use | Limit |
|---|---|---|
| [OR-Tools VRPTW](https://developers.google.com/optimization/routing/vrptw), [capacity](https://developers.google.com/optimization/routing/cvrp) | Basic dimensions, callbacks and vehicle capacities | Simplified examples omit some product rules. Add service time, fixed starts and complete vehicle serialization. |
| [Routing header](https://raw.githubusercontent.com/google/or-tools/stable/ortools/constraint_solver/routing.h) | Shared NextVar topology and independent cumulative dimensions | Captured excerpts, not whole-library verification. Bind per-scenario callback matrices in a factory. |
| [Search options/status](https://developers.google.com/optimization/routing/routing_options) | Search strategy, limits, status interpretation | Timeout/no assignment is not a general infeasibility proof. Never report a heuristic output as globally optimal. |
| [VRPTWController](https://github.com/laser-ufpb/VRPTWController) | Independent MIT challenge-validator reference | Does not directly validate this v2 finite-scenario extension; production checker remains separate TypeScript. |
| [Robust VRPTW paper](https://optimization-online.org/2018/02/6477/) | Research background demonstrating established uncertainty-aware routing | Landing abstract/metadata only inspected. Full algorithm/paper not reproduced; do not claim its exact method. |

The all-scenario model shares the route sequence, with one time dimension per scenario. Never substitute independently solved routes or claim elementwise maxima are equivalent. Canonical fixture only B,A,C passes all 3 under 4500m; its +400m tradeoff,300s window margin and150s uniform-extra-leg tolerance are static oracle values awaiting actual app reproduction.

The checker imports only schemas/hash utilities and its own arithmetic kernel. No OR-Tools model, solver schedule or LLM verdict is acceptance authority. Define determinism for reports/order/canonicalization, while allowing different valid solver routes on larger instances.

## Road matrices and local computation

| Option | Units/terms inspected | Decision |
|---|---|---|
| [OSRM API v5.24](https://project-osrm.org/docs/v5.24.0/api/), [engine](https://github.com/Project-OSRM/osrm-backend) | Seconds/meters, directed table ordering, null unreachable; BSD2 engine | Preferred optional local snapshot engine. Pin actual engine build/profile/map date and request both durations/distances. No implicit fallback speed or public demo-server dependency. |
| [Valhalla matrix](https://valhalla.github.io/valhalla/api/matrix/), [engine](https://github.com/valhalla/valhalla) | Default distance kilometers, null unreachable, time-dependent restrictions; MIT engine | Valid alternative with explicit unit conversion and frozen configuration; static matrix semantics remain static. |
| [openrouteservice restrictions](https://giscience.github.io/openrouteservice/hosted-api-restrictions), [engine](https://github.com/GIScience/openrouteservice) | Hosted3500 matrix cells, dynamic arguments25 at retrieval; repo exposes GPL3/LGPL3 license files | Optional small hosted snapshot under current account/terms.101×101 needs10201 cells and batching/local engine. Review actual component license, not a blanket MIT assumption. |
| [Geofabrik Southern Zone](https://download.geofabrik.de/asia/india/southern-zone.html) |533MB PBF at retrieval | Preparation needs more CPU/disk/time than download size. Do not put regional routing-engine build on the critical path. |
| [OpenStreetMap copyright](https://www.openstreetmap.org/copyright) | ODbL and attribution | Map-data rights are separate from engine code. Retain attribution and review derived-database distribution obligations. |

Recommended road milestone: a reviewed10–20-stop coordinate set, one configured engine request/small batch, complete directed matrices, private raw-response hash, ceiling normalization to integer meters/seconds, public permitted provenance and no unreachable/fallback cells. A frozen road-network snapshot is not live traffic. A hosted service receives coordinates; local inference alone does not make the whole system fully private.

## Datasets and fair benchmarks

| Resource | What it adds | Rights/model caution |
|---|---|---|
| Original [tiny v1](examples/tiny-route-input.json) and [assurance v2](examples/assurance-input.json) | Exact hand-checkable recurrence, scenario counterexample and rescue | Original synthetic design fixtures. No external traffic or delivery claim. The old fixture vehicle names V1/V2 are not schema versions. |
| [DIMACS VRPTW](https://dimacs.rutgers.edu/programs/implementation-challenges/vehicle-routing/implementation-challenge-vehicle-routing/vrp-with-time-windows) | Established Solomon/Homberger-Gehring conventions | Euclidean travel/distance truncated to one decimal. Scale to integer tenths explicitly; match objective/rounding/fleet count. Redistribution permission not established. |
| [VRPLIB](https://github.com/PyVRP/VRPLIB) | MIT parser/writer for Solomon/VRPLIB formats | Parser license does not license dataset contents; confirm distance conventions and source rights. |
| [PyVRP](https://github.com/PyVRP/PyVRP) | MIT nominal benchmark solver; inspected main Python≥3.12 | Optional comparator after core. Match constraints/time budget; it is not a second production solver requirement. |
| [Amazon last-mile dataset](https://registry.opendata.aws/amazon-last-mile-challenges/), [structure](https://github.com/MIT-CAVE/rc-cli/blob/main/templates/data_structures.md) |9184 historical routes,6112 train/3072 evaluation,2018/five US metros, obfuscated data | **CC BY-NC4.0**. Separate research evaluation from MIT app/public distribution/commercial use. Driver sequences are not optimal labels; no download/training performed. |
| [SINTEF benchmark](https://www.sintef.no/projectweb/top/vrptw/solomon-benchmark/) | Potential benchmark access lead | Browser challenge blocked inspection. Not counted as inspected dataset evidence. |

Start with exact tiny arithmetic, then12/20-stop generated dispatch, then optional matched nominal benchmarks/100-stop bounds. No calibrated traffic labels were established, so training a risk predictor is outside the recommendation. Useful complexity comes from transparent assumptions, not unvalidated confidence scores.

## Durable work, security and optional protocols

- [pg-boss transactional Drizzle adapters](https://pgboss.io/api/adapters): `fromDrizzle(tx,sql)` can enqueue atomically with journal writes. Use it only if choosing pg-boss instead of the custom queue. Queue rollback/retry does not roll back or guarantee exactly-once PayPal effects.
- [PostgreSQL RLS](https://www.postgresql.org/docs/16/ddl-rowsecurity.html): table owners/superusers/BYPASSRLS can bypass policies. Keep owner checks and use an appropriate runtime role if adding RLS; enabling a flag alone proves little.
- [OWASP prompt injection](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html), [SSRF](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html), [CSV injection](https://community.owasp.org/attacks/CSV_Injection): apply to actual boundaries. No fetching brief/model URLs, no arbitrary commands, validate source spans, review constraints, and provide canonical JSON. CSV safety varies across spreadsheet apps/save cycles.
- [MCP authorization2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization): optional3 read tools only, authenticated issuer/audience/scope and execution-time owner checks. No PayPal token passthrough or model-supplied actor authority.
- [AP2 v0.2 specification](https://ap2-protocol.org/ap2/specification/) and [agent authorization](https://ap2-protocol.org/ap2/agent_authorization/): deterministic trusted surface and real credential/mandate roles. Hashes plus database consent are not AP2 compliance; current agent-to-agent delegation is out of that inspected spec's scope.
- [ACP repo](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol) and [docs](https://www.agenticcommerce.dev/docs): inspected beta/latest stable2026-04-17, mutable main RFC. Interoperability is optional future work; implementing an endpoint does not automatically list a product in ChatGPT.

## PayPal strategy and prior work to read before making claims

The [strategy report](../research/round2/strategy/REPORT.md) maps named employees' public2026 work to identity-preserving execution, governed/versioned workflows, source-grounded agents and evidence. The [competitive report](../research/round2/competitive/REPORT.md) compares Stood, Rentabot, Routific, VROOM, Timefold, RouteNexa, Unhappy Path and prior winners. Inspect them before writing an innovation claim.

Particularly useful: [MCP Gateway](https://developer.paypal.com/community/blog/PayPal_MCP_Gateway/), [enterprise agent skills](https://developer.paypal.com/community/blog/agent_skills_at_enterprise_scale/), [Customer Graph](https://developer.paypal.com/community/blog/knowledge_graph_for_unified_customer_entity/), [structured ground truth](https://developer.paypal.com/community/blog/stopgivingaimoredocumentation/), and [versioned onboarding](https://developer.paypal.com/community/blog/Building-Flexible-Onboarding-Workflows/). They support design alignment, not private roadmap knowledge, hiring guarantees or merchant demand.

GitHub `main`/`develop`/`stable` references and hosted tags are mutable. Before copying code, record the exact commit/package/image/model digest actually used, review its license and preserve notices. This resource guide is a starting evidence map, not permission to redistribute every captured page or vendor demo.
