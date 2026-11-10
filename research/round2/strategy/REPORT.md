# Public PayPal engineering direction and implementation resources

Second research pass, November 10, 2026 IST. Primary-source captures and claim locations are in [SOURCES.json](SOURCES.json). These are public disclosures, not private roadmap or hiring information.

## Most useful new findings

The first pass concentrated on agentic-commerce announcements. The recent developer blog exposes considerably more specific engineering work: **identity-preserving tool execution, governed capability publication, versioned workflow definitions, and evidence-preserving data systems**. These are better technical alignment signals than guessing what judges want.

The inference for ProofRoute is to make one real business capability auditable from source requirements through final provider state. It does not justify building a generic enterprise skills marketplace, identity graph, or MCP gateway: PayPal already publicly describes those systems.

## Public people and work, with precise boundaries

| Person/team | Direct public work | What this supports |
|---|---|---|
| Faiz Mohammed, Amy Wang, Suraj Kumar; PayPal Cosmos.AI Agentic Platform Team | [MCP Gateway article](https://developer.paypal.com/community/blog/PayPal_MCP_Gateway), Oct 8, 2026, bylined to these three. [R02] | Caller identity must survive discovery, authorization, execution and audit; check authorization again when executing a selected tool. |
| Simon Xu, Shangyuan Jia, Froyo Dai, Digvijay Singh, Amy Wang, Srinivasan Manoharan with Faiz Mohammed | [Enterprise skills article](https://developer.paypal.com/community/blog/agent_skills_at_enterprise_scale), Oct 9, 2026. [R03] | Versioned content is proposed, validated and reviewed before broad distribution; updates re-enter the process. |
| Simmi Mourya, with support from Deepika Khera and Karteek Chada | [Customer Graph](https://developer.paypal.com/community/blog/knowledge_graph_for_unified_customer_entity), Jul 22, 2026. [R04] | Preserve reasons for links/decisions, separate synthetic evaluation from production-baseline stability, and acknowledge imperfect labels. |
| Padam Sandhu | [Structured ground truth for coding agents](https://developer.paypal.com/community/blog/stopgivingaimoredocumentation), Jul 13, 2026. [R05] | Give agents authoritative schemas and queryable context; do not rely on plausible API invention. Internal pp-react is proprietary, not a public dependency. |
| Mounika Gampa | [Configurable onboarding](https://developer.paypal.com/community/blog/Building-Flexible-Onboarding-Workflows), May 26, 2026; [fixed financial agreements](https://developer.paypal.com/community/blog/Why-Immutable-PDFs-Matter), Apr 10, 2026. [R09, R08] | Pin each transaction to the accepted workflow/template version, validate structure at runtime, and distinguish input mapping from execution. |
| Eddie Jaoude | [Hackathon PayPal/AG Grid workshop](https://developer.paypal.com/community/blog/PayPal_AG_Grid_Part_1), Nov 5, 2026. [R06] | A concrete current implementation resource covering sandbox accounts, app credentials, server-only Next.js access, SDK usage and reporting limitations. |
| Farshad Tavakoli | [The Agent Economy](https://developer.paypal.com/community/blog/agent-economy-new-paths), Sept 3, 2025. [R12] | Public argument for industry-specific agents and usage-priced services. This is directional commentary, not evidence that customers will buy this particular service. |

R02 also names additional gateway contributors: Simon Xu, Digvijay Singh, Olympia Saha, Huan Li (Auth SDK), Divya BH, Shangyuan Jia, Ankit Kumar Singh and Chanchal Singhal. These are public credits only; do not infer undisclosed assignments, interview preferences or hiring authority. Article detail dates are used; index/recommended-card metadata sometimes differs.

## Architecture lessons to apply

1. **Identity is carried, not flattened.** An optional agent request should record both the initiating user and acting agent. Task ownership and tool scope are checked at execution time. A discoverable tool is not automatically executable. [R02]
2. **Approval pins a version.** The dispatch contract, scenario set, matrix provenance, verifier version and price are immutable after consent. Updates are a new proposal/task, not a silent mutation in flight. [R03, R09]
3. **Evidence types stay distinct.** An AI finding, a human review, a solver candidate, a passed arithmetic check and a completed provider capture are different records. A nice timeline must not blur their authority. [R02]
4. **Ground the compiler in actual data.** The model receives the current stop/vehicle IDs and supported constraint schema. It proposes only allowed edits with source spans. It cannot invent a vehicle or API. [R05]
5. **Record reasons and limits.** Each scenario failure should identify the actual stop/edge/time calculation; each payment transition should identify its resource observation. Benchmark claims say whether data was synthetic, historical or live. [R04]

These principles strengthen a dispatch-assurance service. They are not evidence that the combined product is novel.

## Additional verified winners from a separate event

The official [2025 PayPal x Google Cloud Bounty Challenge winners](https://developer.paypal.com/community/blog/paypal-google-cloud-bounty-challenge-winners), Jul 18, 2025, records [R07]:

| Award | Project | Officially described capability |
|---|---|---|
| First | Phaigo | Username-addressed PYUSD sending/requesting, natural-language assistant, Google Cloud Blockchain RPC. |
| Second | Rosen | Social trading with multilingual translation and PYUSD tipping/payments. |
| Third | Normie Tech | Fiat/card/PayPal payment links that settle to PYUSD; merchant dashboard. |
| Special merit | 4m.4n / PYUSD Hub | Wallet with MEV/network/gas analysis and AI features. |

The article links [Phaigo](https://www.youtube.com/watch?v=wkGngw_W8vI), [Rosen](https://www.youtube.com/watch?v=DrGheKvdocc), [Normie Tech](https://www.youtube.com/watch?v=LHEx--EHUKY), and [PYUSD Hub](https://www.youtube.com/watch?v=kf4cnrLYMO4) demos. **The videos were not watched or validated in this pass.** They are implementation/presentation leads, not independently reviewed working builds.

That competition weighted innovation 40%, boundaries 25%, functionality 20%, accessibility 10%, documentation 5%. **Do not transfer those weights** to the current AI Hackathon, whose five criteria are equal. These results broaden historical context without changing current requirements or suggesting crypto is necessary.

## Merchant-problem support and its limits

[PayPal's shipping KPI guide](https://www.paypal.com/us/brc/article/shipping-kpi-best-practices), Dec 8, 2023, explicitly discusses on-time delivery, order accuracy, shipping cost per order and route optimization. [R10] The [retail trends article](https://www.paypal.com/us/brc/article/retail-trends), visibly dated Oct 23, 2026, names AI logistics/delivery planning. [R11]

These support that dispatch reliability is relevant to merchants. They **do not validate demand for a separate paid assurance layer**, willingness to pay $4.50, measured delivery savings, or a better product than existing route platforms. R11's page title still mentions2025 and its e-commerce percentage is inconsistent between paragraphs; those numbers are excluded from the recommendation.

The honest post-hackathon customer experiment is to show an operator an existing-plan audit and a rescue report, then test whether independent counterexamples/scenario margins change decisions. Until that is done, impact is a concrete product hypothesis.

## Setup corrections and current resources

Read-only commands in this pass reported default **Node26.8.1, Python3.15.2, pnpm10.18.0, Docker29.8.1 and uv0.12.13**. No dependency install or runtime change occurred.

The [official Node release table](https://nodejs.org/en/about/previous-releases) lists26,24 and22 as LTS at retrieval. [R13] Therefore default Node26 is not described here as unsupported. For this new project, select and pin **Node24 LTS** to match the inspected current PayPal workshop and reduce toolchain variance; existing Node22 remains viable if already pinned and proven. Use an explicit runtime choice in CI/Docker rather than relying on the system default.

For OR-Tools, explicitly use **Python3.12**, supported by inspected package wheels in the optimization agent's report; the default3.15 is not a safe assumption. [uv's official guide](https://docs.astral.sh/uv/guides/install-python/) supplies `uv python install 3.12` and managed-version execution. [R14] Commands in the actual setup should pin the solver project interpreter and lock dependencies; do not replace the user's global Python.

R06 uses Next.js16, Node24 and official SDK `@paypal/paypal-server-sdk@2.5.0`. Its sandbox-setup instructions and pinned boilerplate are useful, but its sample seeds include Payouts. **ProofRoute does not need Payouts, subscription plans, balances or Transaction Search to settle its one service purchase.** Do not copy those sample mutations into setup. Reporting can lag by hours, so it is unsuitable as the immediate capture/void gate; read the specific payment resources.

The pinned [workshop scripts revision](https://github.com/paypaldev/hackathon-paypal-ag-grid-boilerplate/tree/d7f892268cd43dde85554ac872cafca8d6f22b84/scripts) is a reference, not installed code. Review license and exact behavior before reuse. The official TypeScript SDK can help for supported calls; direct REST remains appropriate for the narrowly specified payment adapter.

## Claims deliberately not adopted

- Company-reported internal gateway scale is not a performance target or benchmark for ProofRoute.
- A green skill validation pipeline is not a proof of safety, and the article separates current checks from roadmap controls.
- PDF flattening removes form editability but is not cryptographic immutability; use canonical hashes, immutable storage controls and accurate trust claims instead.
- Public technical alignment does not establish an employee's private priorities or guarantee hiring.
- An extensive design should deepen the dispatch problem. Copying PayPal's internal gateway or registry would add scope while duplicating disclosed work.
