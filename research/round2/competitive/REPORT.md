# Competitive challenge and project-selection review

Second-pass public-source review, captured November 9 UTC / November 10 IST, 2026. An independent research agent collected the pages and code excerpts; the primary agent completed this synthesis after the research agent reached a usage limit. Sources were read, **not executed**. [Source catalog](SOURCES.json) · [Search log](QUERY_LOG.md).

## Decision

Keep the verified-computation/payment foundation, but change the product from a general paid route generator to **dispatch assurance and rescue**: audit a merchant's existing plan against reviewed promises and a frozen set of delay scenarios, explain exact failures, and sell a replacement plan that independently passes all accepted scenarios.

This is a concrete engineering/product recommendation, not a novelty finding. Generic evidence-gated money, route validation, what-if analysis and replanning are all established. The remaining proposition is the coherent, merchant-facing combination of reviewable semantic promises, finite-scenario stress testing, an independently implemented checker, useful rescue output and recoverable PayPal settlement. Demand for a separate paid assurance layer remains unvalidated.

## Stronger prior art than the first pass

| Inspected source | What was directly disclosed | What must change in our pitch |
|---|---|---|
| [Stood repository](https://github.com/ma-za-kpe/stood) [C01], [release code](https://github.com/ma-za-kpe/stood/blob/develop/services/api/src/domain/judged-release.ts) [C02], [decision code](https://github.com/ma-za-kpe/stood/blob/develop/services/api/src/domain/decision.ts) [C03] | Frozen/signed acceptance tests, allowance/hold/commit package/decision, deterministic rules, idempotent commands and transactional outbox. Profiles include code milestones and agent work. README distinguishes qualified sandbox, synthetic tests and unfinished trusted-runner work. | Do not claim to invent frozen-contract release gates. Several recovery/design principles are direct overlap. The inspected branch is mutable and the whole repository was not audited. |
| [Rentabot product](https://www.rentabot.tech/bots) [C04] and [agent interface](https://www.rentabot.tech/agents) [C05] | “Pay only for proof,” verified-unit/fixed pricing, code checks, Spec Copilot, contract hashes, spending mandate, MCP/A2A discovery and57 listed operations. Product labels some bots Live and others Demo. | A general bot marketplace or more tool endpoints would not differentiate ProofRoute. Its “escrow” and unattended-authorization language is not adopted as a valid PayPal guarantee. No bot/payment was run. |
| [AgentEscrow](https://devpost.com/software/agentescrow-q5tv0d), revisited [C00; original S30] | Agent-task acceptance with authorization/capture/void and code-check/repair claims. | Outcome-gated payment remains a mechanism inside our service, not the novel headline. |
| [Nevermined outcome pricing](https://nevermined.ai/blog/ai-agent-outcome-based-pricing) [C16]; [Sierra](https://sierra.ai/blog/outcome-based-pricing-for-ai-agents) [C17] | Commercial discussions of outcome-based agent pricing and outcomes. | Treat as vendor prior-art context, not impartial measured comparisons or proof of independent verification. |

## Existing dispatch products are already sophisticated

| Source | Directly inspected capability | Boundary for our design |
|---|---|---|
| [Routific MCP](https://mcp.routific.com/) [C06] | Quick route optimization; authenticated fleet optimization with windows/capacity/tags; maps; scheduled-order updates; driver assignment/publish with confirmation; tracking/POD access; advertised100-order free plan. | “AI dispatch assistant” and agent access are already product features. Quick-route stop limit does not describe the full authenticated optimizer's limit. Do not claim ProofRoute is cheaper or more complete. |
| [VROOM repository](https://github.com/VROOM-Project/vroom) [C10], [API](https://github.com/VROOM-Project/vroom/blob/master/docs/API.md) [C11] | `-c` plan mode accepts described routes, selects ETAs and reports violations. API supports custom matrices, capacities, skills, windows, vehicle limits and initial route information. Plan-mode constraints become soft for violation reporting. | Importing/auditing a route is not new by itself. Do not use a soft-constraint report as evidence of a hard-accepted plan. A separate checker and frozen acceptance criteria remain necessary for our payment rule. |
| [Timefold pinning](https://docs.timefold.ai/field-service-routing/latest/real-time-planning/real-time-planning-pinning-visits) [C08], [disruption minimization](https://docs.timefold.ai/field-service-routing/latest/real-time-planning/real-time-planning-minimize-disruption) [C09] | Freeze completed/in-progress visits, pin selected assignments and minimize disruption relative to an existing plan. | Replanning/lineage is useful product depth, not a new optimization mechanism. Physical in-progress fleet replanning exceeds our delivery-only one-depot model. |
| [Routific benchmark page](https://www.routific.com/route-optimization-benchmark) [C07 attempted] | Navigation returned the page title/URL but saved body text was empty in both attempts. No benchmark methodology/results were inspected in the retained evidence. | Treat as a follow-up resource, not support for a performance comparison. Any own benchmark must match objective, runtime, dataset and rounding. |

## RouteNexa: distinguish the actual scenario feature

The [project description](https://devpost.com/software/routenexa-ai-sa6vqt), [repository README](https://github.com/pranavkokande60/RouteNexa-AI) [C12], [API source](https://github.com/pranavkokande60/RouteNexa-AI/blob/main/backend/app/routes/api.py) [C13] and [route analytics](https://github.com/pranavkokande60/RouteNexa-AI/blob/main/src/route_analytics.py) [C14] were inspected.

Its README explicitly includes a **What-If Scenario Simulator**. The inspected `run_simulation` code compares current and alternative shipment modes on a factory-to-state corridor using prediction inputs; the viewed implementation contains fixed region/month/product-price assumptions. Route analytics aggregate historical corridor performance and efficiency. These excerpts are materially different from verifying each last-mile stop/vehicle constraint for one common route under several frozen travel matrices.

Correct comparison: related freight prediction/scenario analysis exists; our proposed demo is a last-mile promise counterexample and finite-scenario feasible rescue. **Incorrect comparison:** “RouteNexa has no scenarios,” “has no PayPal,” or “we proved its system is unreliable.” The entire repository, deployed ML models and payment code were not tested.

## Reliability tooling is also occupied

[Unhappy Path](https://devpost.com/software/unhappy-path) [C18] discloses Gemini planning, seven genuine-sandbox fault scenarios, deterministic release checks and source-cited remedies, with stated measured limits. These are entrant claims, not reproduced results here. They make a generic PayPal chaos lab a weak replacement idea. ProofRoute can use a fault harness to validate its own service, but it should not become the product headline.

## Better evidence about previous winners

[CrawlerPal's actual README](https://github.com/positiveblue/CrawlerPal) [C15] describes HTTP402/L402-style offers, PayPal payment and bearer-token access to API/news content. That establishes more than the initial one-sentence official winner summary, but no deployment/payment was exercised. It reinforces that a basic paywall for agent-accessed information is prior work.

[Shopware's first-party Codebusters retrospective](https://www.shopware.com/en/news/shopware-at-paypal-dev-days-2025/), June30, 2025 [C20], names a real merchant problem: lagging PayPal buttons on dynamic product/category pages. The prototype used nonblocking v6 SDK loading, a unified loader and improved context behavior, winning second place at the separate Dev Days2025 event. The lesson is a concrete merchant problem plus a working integration, **not arbitrary feature count**. It does not establish this current event's winner preferences.

## Adversarial alternatives

| Alternative | Why it could be stronger | Why it is not selected in this screen |
|---|---|---|
| Merchant catalog-readiness repair for agent commerce | Close to PayPal Store Sync/Agent Ready, visible merchant friction, grounded validation possible | Readiness/extraction bots already appear in Rentabot; [Google automatic item updates](https://support.google.com/merchants/answer/12157888?hl=en) [C19] show established merchant-feed correction. Store Sync access is gated; easy to collapse into a checklist or duplicate company work. No inspected evidence of a stronger underserved buyer. |
| PayPal integration/reliability rescue | Demonstrates directly relevant payments engineering and clear failures | Codebusters, PayPal's integration agent and Unhappy Path occupy much of this space. Replacing routing with another general reliability dashboard does not gain defensible novelty. |
| Staffing/appointment commitment assurance | Similar checkable constraints and possible paid optimization work | No stronger demand evidence surfaced; new domain semantics/workforce assumptions add risk within the remaining deadline. Do not switch solely to a less-searched domain. |
| Dispatch assurance/rescue | Existing plan + exact failed promise + all-scenario accepted replacement provides an understandable before/after | Still a composite differentiation hypothesis, but can be made concrete with a tiny oracle and useful12–20-stop workflow using the existing engineering foundation. **Selected.** |

This is a bounded screen. It does not rank all entries, establish patent novelty, or prove that a competitor lacks an unseen feature.

## Required product corrections

1. Lead with the dispatch failure/rescue, not generalized “trust for the agent economy.”
2. Include one nominally valid plan that fails a named stress scenario by a reproducible amount, and a shared rescue plan that passes all scenarios.
3. Use a separate TypeScript checker so acceptance does not depend on a solver's own report; accurately disclose platform operation and common-schema trust.
4. Keep distance tradeoffs explicit: a rescue may be longer, and its benefit is compliance with accepted assumptions, not guaranteed traffic savings.
5. Add provenance, reviewed remedies and lineage as connected workflow depth. No unreviewed window relaxation or new payee.
6. Keep recovery/agent tools as supporting infrastructure; only claim actual executed results and only publish licensed original work.

The full blueprint is [Dispatch Assurance](../../../docs/superpowers/specs/2026-11-10-proofroute-assurance.md). It is intentionally extensive, while the implementation plan identifies a demonstrable deadline version.
