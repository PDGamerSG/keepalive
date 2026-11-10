# Recommendation: ProofRoute Dispatch Assurance

First-pass research captured November9 UTC / November10 IST,2026; updated after the deeper agent review. This is a project selection/implementation brief, not a built application. **Start with the [second-pass synthesis](round2/README.md) for the current decision, stronger competition, new public PayPal engineering work, corrected contracts and resource catalogs.** Source IDs S/Q below refer to the original [search log](SEARCH_LOG.md), [evidence map](EVIDENCE_MATRIX.md) and preserved extracts. New C/O/P/R IDs are in the second-pass catalogs.

**Build ProofRoute Dispatch Assurance: audit an existing plan against reviewed promises and frozen travel scenarios, then sell one independently checked rescue through PayPal.** Its promise is “Find the broken promise. Buy a verified rescue plan.” The original paid-route foundation below remains relevant; the [expanded blueprint](../docs/superpowers/specs/2026-11-10-proofroute-assurance.md) and [integrated implementation plan](../docs/superpowers/plans/2026-11-10-proofroute-assurance.md) define the current12-module product and flagship scope.

A small merchant uploads deliveries and vehicles, describes requirements in ordinary language, reviews the resulting contract, and approves a $4.50 sandbox authorization. A local optimization service computes a route. A separate TypeScript checker recomputes every constraint from the frozen inputs. A valid, durably saved plan permits capture; failure or timeout initiates a void. The buyer receives the routes, computed schedule, payment receipt, and an offline verification bundle.

This is the strongest recommendation from this bounded screen because it brings together a useful merchant workflow, meaningful AI, a substantial PayPal lifecycle, checkable technical depth, and a short, legible demonstration. It is **not a claim of global novelty, validated demand, or a guaranteed prize**. Generic acceptance-gated payments already appear in this event's public project descriptions. The execution must earn the distinction through a rigorous routing contract and honest payment recovery.

## 1. What the actual event requires

The [official rules](https://paypalaihackathon.devpost.com/rules) and [latest organizer updates](https://paypalaihackathon.devpost.com/updates), rather than old event pages or search snippets, govern this plan. [S09, S07]

| Item | Verified requirement and practical implication |
|---|---|
| Submission deadline | Thursday **November 12, 2026, 12:00 noon PST** = November 12, 20:00 UTC = **Friday November 13, 01:30 IST**. Plan to finish several hours earlier. |
| Required integration | Meaningful PayPal developer-platform integration using the free sandbox, plus actual AI functionality. A decorative payment button and canned chatbot would weaken the case. |
| Working project | Either a hosted working demo or complete runnable repository instructions; a mockup alone does not qualify. |
| Repository | Public source repository with a recognizable open-source license file, required source/assets, and setup instructions. |
| Video | Public YouTube video **under three minutes**, showing the functioning application. Upload early; processing can take hours. |
| Language | English submission materials or the required English translation. |
| Judging | Five **equally weighted** criteria: technological implementation, design, potential impact, innovation/idea, and presentation. Technological implementation is the first tie-break. |
| Timeline | Judging December 1–15, 2026; winners on or around December 21. |
| Freeze | Latest update says no commits, README edits, or video swaps after the deadline until winner announcement. Keep the submitted revision immutable and access operational. |
| Awards | Overall first/second/third prizes are $12,000/$8,000/$5,000. Best Agentic Commerce and Best PayPal + AI are relevant honorable categories. A project can receive at most one grand plus one sponsor, or one honorable plus one sponsor. |
| Team/tools | No maximum team size in the FAQ; sponsor tools are optional. [S06] |

The overview displayed roughly 32,300 **participants**, not that many submitted projects. Its headline and body disagree on the total prize pool, so this brief does not rely on that total. The [current gallery](https://paypalaihackathon.devpost.com/project-gallery) explicitly says it has not been published. Therefore neither a complete entry list nor current-event winners can be established. [S01, S04]

The user described this as a hiring hackathon. I found no official promise of recruitment, interviews, or employment in the inspected rules and overview. Treat it as a chance to demonstrate engineering judgment to PayPal, with hiring as a possible indirect benefit.

## 2. What has actually won before

PayPal's [official Dev Days 2025 winners article](https://developer.paypal.com/community/blog/winners-dev-days-hackathon/), by Karen Bajza-Terlouw, May 29, 2025, records these results. **That was a separate event with different challenges**, not a previous completed edition of this exact current competition. [S03]

| Place | Project | What the official article establishes | Useful lesson |
|---|---|---|---|
| First | CrawlerPal — Jordi Montes and Neeraj Jhawar | A paywall AI-agent assistant built with PayPal APIs. | Paid agent services can be a credible PayPal use case. Do not copy the generic paywall. |
| Second | Codebusters | Upgraded Shopware 6's PayPal integration from JS SDK v5 to beta v6. | A concrete, working integration can be competitive without an enormous feature count. |
| Third | Rosen — Sida Zhang and Xiaobin Gu | Work on a global social trading application powered by PYUSD. | PayPal technology should materially enable the product. Crypto itself is not a requirement. |

These are evidence about past results, not a predictive model of the 2026 judges. The winners article does not provide enough detail to infer unseen architectures, evaluation scores, or hiring outcomes.

## 3. Strong disclosed projects and ideas to avoid repeating

The following are notable **public descriptions**, selected for relevance and disclosed engineering depth. They are not a verified quality ranking: their code, transaction histories, and tests were not executed in this research. Public Devpost pages can be indexed even while the central gallery is hidden.

| Project and source | Disclosed approach | Consequence for our choice |
|---|---|---|
| [Errand Agent](https://devpost.com/software/errand-agent-ai-shopping-agent-with-paypal-guardrails) [S14] | AI shopping, deterministic spending guardrails, buyer approval, Orders v2/SDK v6, MCP lookup. | A guarded shopping assistant is already direct overlap. |
| [CartBridge AI](https://devpost.com/software/cartbridge-ai) [S16] | Checkout recovery, verified payment state, duplicate prevention, Gemini explanations; Angular/Spring Boot. | Generic checkout recovery with an AI explanation layer is crowded. |
| [ClearLedger AI / PayPal AI Reconciliation](https://devpost.com/software/paypal-ai-reconciliation) [S17] | Deterministic reconciliation with local Qwen3, FastAPI/PostgreSQL, grounded financial explanations. | “Local AI plus a reconciliation dashboard” is insufficient differentiation. |
| [Settled](https://devpost.com/software/settled-gdqlfc) [S23] | Policy compilation with quoted evidence, triage, bounded refunds, unknown-outcome reconciliation. | Policy-aware refund automation already has a credible implementation story. |
| [Refund Relay](https://devpost.com/software/refund-relay) [S24] | Photo assessment, bounded refund execution, merchant integration, two MCP interfaces, idempotency. | Photo-to-refund agents are particularly strong direct competition. Its reported tests remain author claims here. |
| [RecallReady](https://devpost.com/software/recallready-2jglnt) [S28] | Recall evidence snapshots, reviewed product rules, matched orders, immutable refund proposals, durable verified refund worker. | A recall-to-refund project would substantially repeat an existing disclosed design. |
| [AgentEscrow](https://devpost.com/software/agentescrow-q5tv0d) [S30] | Agent task acceptance, authorization/capture/void, code auditing and repair. | **Close first-pass conceptual overlap; Stood/Rentabot add stronger evidence in round2.** Do not pitch “pay only if AI work passes” as our invention. Routing verification must be the actual product. |
| [RouteNexa AI](https://devpost.com/software/routenexa-ai-sa6vqt) [S31] | Logistics predictions, multi-objective/Pareto routing, visual freight analytics. | Routing and logistics are already represented. Its disclosure emphasizes analytics rather than a proof-conditioned PayPal lifecycle; absence in the description does not prove absence in its code. |
| [Kitty](https://devpost.com/software/kitty-autonomous-rotating-savings-on-paypal) [S19] | Rotating savings with agent coordination and PayPal settlement. | Social savings is another occupied direction. Claims about regulatory burden or payment guarantees should not be accepted without verification. |

[Terms Desk](https://devpost.com/software/terms-desk-jyi8bk) describes early-payment discount decisions and PayPal-related previous work, but the inspected page lists LaunchPad Hacks/SLAY HACKS. It is adjacent prior work, **not confirmed as an entry in this current event**. [S13]

The first pass surfaced Stood, PayPilot, PlateQuote, Payment Truth and Unhappy Path as search leads. **Round2 subsequently inspected Stood README/release/decision code and Unhappy Path's public description**, plus Rentabot, VROOM/Timefold/Routific and RouteNexa's actual scenario code. See the [competitive review](round2/competitive/REPORT.md); the generic payment/routing/audit/scenario ingredients are already well covered. Other unexamined leads remain unresolved rather than established implementations. [Q14,Q17,Q20–Q22; C01–C18]

“Delete previous projects” is applied as an **idea-screening instruction**: exclude substantially repeated project concepts. No user files, account projects, or other entrants' submissions have been deleted or modified.

## 4. What PayPal is publicly building now

The relevant theme is trusted agentic commerce for merchants: discovery and checkout, explicit consent, reliable money movement, and understandable outcomes. That is an interpretation of the following public disclosures, not inside knowledge of product roadmaps.

| Public initiative | What the source actually says | Implication for ProofRoute |
|---|---|---|
| [PayPal AI / Agent Ready / Store Sync](https://www.paypal.ai/) and [developer overview](https://developer.paypal.com/agentic-commerce-services/about) [S05, S08] | Catalog distribution and agent-ready commerce; the developer guide requires contacting PayPal for onboarding. Guide updated October 14, 2026. | Align with agent commerce, but use generally documented sandbox APIs for the core. Onboarding is too risky as a dependency. |
| [WebMCP + PayPal Agent Ready](https://developer.paypal.com/community/blog/WebMCP_PayPal_Agent_Ready), September 16, 2026 [S10] | Structured product/cart tools, with buyer approval inside PayPal; current approach tied to Store Sync merchants. | Explicit buyer authorization is a strength. A generic website-buying agent would duplicate company direction. |
| [Ai4 2026 presentation](https://newsroom.paypal-corp.com/2026-08-10-PayPal-Takes-Center-Stage-at-Ai4-2026), August 10, 2026 [S20] | Trust and SMB adoption; Merchant AI Integration Agent reads, upgrades, validates and certifies merchant integrations on merchant infrastructure. | Local compute and verifiable behavior fit the trust theme. Avoid a duplicate integration-upgrade assistant. |
| [Protocol explainer](https://newsroom.paypal-corp.com/2026-01-22-Making-Sense-of-the-AI-Shopping-Protocol-Moment), page dated January 21, 2026 [S21] | ACP/UCP concern commerce, AP2 concerns payment trust, MCP/A2A connect agents/tools; consent and post-purchase support matter. | Show clear authority boundaries. Do not add every protocol or claim AP2 compliance from a hash. |
| [OpenAI partnership](https://newsroom.paypal-corp.com/2025-10-28-OpenAI-and-PayPal-Team-Up-to-Power-Instant-Checkout-and-Agentic-Commerce-in-ChatGPT), October 28, 2025 [S26] | ACP/checkout partnership and merchant reach; also internal ChatGPT Enterprise/Codex use. | Selling useful computational work is more distinct than another general shopping front end. Announcements do not prove unrestricted API availability. |
| [Anthropic SMB partnership](https://newsroom.paypal-corp.com/2026-05-PayPal-partners-with-Anthropic-to-Close-the-AI-Gap-for-Small-Businesses), May 13, 2026 [S34] | SMB AI fluency and Claude-connected invoicing/refunds with approvals. | Target an understandable merchant job, not a general invoice/refund copilot. |
| [Google Cloud / PayPal agentic-commerce solution](https://cloud.google.com/blog/topics/financial-services/introducing-an-agentic-commerce-solution-for-merchants-from-paypal-and-google-cloud), October 28, 2025 [S53] | Agent collaboration, A2A/AP2, and consumer consent; sales-led adoption path. | Use the principles without making enterprise partnership access part of the critical path. |
| [Venmo receipt scanning](https://newsroom.paypal-corp.com/2026-11-09-Venmo-Launches-Receipt-Scanning-Feature-to-Split-Bills-by-Item), **November 9, 2026** [S52] | Receipt scanning, itemized bill splits, tax/tip allocation and requests. | A receipt-splitting app would overlap a product announced immediately before this research. |

The current [newsroom](https://newsroom.paypal-corp.com/) also highlights Q3 2026 results, Venmo rewards, tuition payments, and PayPal World/Weixin cross-border QR activity. Those broader payments directions were observed at headline/summary level; they are not the basis for unverified claims about APIs or internal teams. [S49]

There are two different developer tool repositories: [PayPal AI-Toolkit](https://github.com/paypal/AI-Toolkit) is a coding-assistant plugin, while [PayPal agent-toolkit](https://github.com/paypal/agent-toolkit) exposes runtime agent tools. Installing the former can help Claude implement correctly; neither must control settlement. Critical payment operations should use the explicitly reviewed REST endpoints. [S12, S41, S51]

## 5. What identifiable people are publicly working on

| Person/team | Public evidence | Responsible conclusion |
|---|---|---|
| **Srini Venkatesan**, CTO | Quoted in the August 10 Ai4 article on trust, merchant adoption, integration modernization and agentic commerce. [S20] | These are public themes associated with his presentation; no inference about his private hiring priorities. |
| **Prakhar Mehrotra** | Author of [PayPal's AP2 engineering article](https://developer.paypal.com/community/blog/PayPal-Agent-Payments-Protocol/), September 16, 2025. [S48] | Public work explains signed mandates, consent and accountability for agent payments. ProofRoute's local consent record is not an AP2 mandate. |
| **Brian Peters**, VP Strategic Partnerships Innovation | Coauthor of the Google Cloud article with Google's Rohit Bhat. [S53] | Public partnership work concerns collaborative agentic commerce and consent. |
| **Amy Bonitatibus**, Chief Corporate Affairs Officer | Quoted in the Anthropic SMB partnership announcement. [S34] | Public advocacy concerns SMB AI access and fluency; this is not a technical team-assignment disclosure. |
| **Alexis Sowa**, GM Venmo | Quoted in the November 9 receipt-scanning announcement. [S52] | Public product direction includes simpler itemized bill splitting. |
| **Jo Franchetti, Eddie Jaoude, Marco Podien** | Event roster lists Developer Advocates; organizer updates describe build sessions on sandbox/AI tooling. [S01, S07] | Judges will have a concrete integration to inspect; their personal preferences are unknown. |
| **Karthik Ravi, Himraj Singh, Nathaniel Olson** | Event roster lists Software Engineer, Engineering Manager, Senior Product Manager respectively. [S01] | Roles are public. The screen did not establish current private projects or hiring responsibilities. |

No employee contact was made, no private profile was accessed, and no speculative judge dossier was used. Public statements support alignment with reliability and merchant usability; they do not justify tailoring claims to imagined personal preferences.

## 6. Selection against plausible alternatives

These are qualitative engineering judgments, not measured scores or predicted win probabilities.

| Candidate | Attraction | Evidence against choosing it now | Decision |
|---|---|---|---|
| Guarded shopping agent | Strong agent-commerce alignment, easy demo | Errand Agent; PayPal Agent Ready/WebMCP; extensive existing shopping infrastructure | Exclude: too much direct overlap. |
| Refund/dispute/recall agent | Clear merchant pain, deep financial workflow | Refund Relay, Settled, RecallReady already disclose sophisticated versions | Exclude: difficult to distinguish in the remaining time. |
| Reconciliation copilot | Local AI and deterministic evidence fit finance | ClearLedger AI already uses essentially this combination | Exclude. |
| Generic outcome-payment/agent marketplace | Strong long-term platform story | AgentEscrow, subsequently inspected Stood/Rentabot, and agent-payments vendors cover the mechanism | Exclude as the headline; use only the necessary payment mechanism inside a specific service. |
| Receipt split assistant | Immediate consumer usability | Venmo announced this on November 9, 2026 | Exclude. |
| Merchant integration upgrader | Useful developer tooling and past winner precedent | PayPal publicly describes its own Merchant AI Integration Agent | Exclude as a duplicate of company work. |
| Full delivery fleet platform | Obvious operational product | Routific already offers routing, windows/capacity/shifts, APIs and MCP; real maps/tracking add risk [S36] | Exclude the full platform scope. |
| **ProofRoute: a purchased, independently checked dispatch plan** | Small merchant job; meaningful language-to-constraints AI; local optimization; authorization/capture/void; falsifiable result | Generic outcome payment and routing each exist; market demand and price remain unvalidated | **Select the narrow service with technical depth.** |

The [Nevermined comparison](https://nevermined.ai/blog/stripe-vs-skyfire-vs-nevermined) is a vendor description of an already active agent-payments market, including metering/outcome pricing. It is prior-art context, not independent proof of product superiority. [S40] Routific's public page directly defeats a claim that “agents that optimize routes” alone are new. Our distinctive proposition is a **buyer-approved, machine-checkable purchase contract for one bounded routing job**, with the payment state and failure evidence exposed.

## 7. Why this is technically feasible

PayPal's generally documented sandbox APIs support the necessary sequence:

1. Create an Orders v2 order with `intent: AUTHORIZE` and **one** purchase unit. [S42]
2. Let the buyer approve inside PayPal. SDK v6's `onApprove` documentation explicitly permits server-side authorization; its order promise resolves to `{ orderId }`. [S32, S37]
3. Authorize the approved order on the server; persist the distinct order and authorization IDs. [S43]
4. Compute and independently verify the output; preserve the accepted artifact before any capture.
5. Capture the authorized amount with Payments v2 only after acceptance, or request a void on pre-settlement failure. [S38, S39]
6. Reconcile uncertain outcomes with provider resource reads and verified, app-scoped webhooks. Persist stable request IDs; PayPal's idempotency retention is finite and endpoint dependent. [S25, S27, S45, S47]

Authorization is a temporary hold, **not escrow**. Documentation describes validity up to 29 days and a three-day honor period; capture remains subject to risk/funds. ProofRoute's work takes minutes and must not depend on long-term guaranteed funds. A successful void request does not promise an immediate visible bank-balance release. [S29, S39]

Google [OR-Tools time-window routing](https://developers.google.com/optimization/routing/vrptw) and [capacity constraints](https://developers.google.com/optimization/routing/cvrp) supply a credible local solver. Finding an acceptable plan is bounded, not a claim to prove global optimality. The independent checker needs only arithmetic and set operations, making it inexpensive to re-run. [S33, S35]

The local machine reports **64 GiB RAM and ten logical CPUs**, with Node, Python, pnpm, Docker and Ollama installed. Ollama was stopped; no inference was run. `qwen3:8b` is a roughly 5.2 GB quantized model with an Apache 2.0 license in its listing. It is a reasonable default to test, not an established accuracy or latency result. Local Ollama supports JSON Schema output; schema validity alone does not establish correct interpretation. [S46, S50]

## 8. Product risks and how to falsify the recommendation

| Risk | Concrete consequence | First check / mitigation |
|---|---|---|
| Overlap with AgentEscrow | Generic “AI work must pass” pitch will be weak | Lead with actual dispatch constraints and an independent routing checker; acknowledge the shared mechanism in prior-work notes. |
| Existing free routing software | A $4.50 fee may have no demand | Treat price as a demo hypothesis. After the hackathon, test occasional-use/API buyers rather than claim a cheaper replacement for Routific. |
| AI becomes decorative | A solver with an unrelated chat box misses the requirement | Make the actual local model produce a cited, editable contract from merchant prose; evaluate ambiguity and malicious notes. |
| Model extraction errors | A valid plan can satisfy the wrong requirements | Mandatory review, explicit units/semantics, immutable freeze, grounded quotes; never let the model decide payment eligibility. |
| Synthetic travel data | A verified plan may not reflect real traffic | Prominent “synthetic frozen travel estimates” badge. Verify against those estimates only; live road-matrix integration is a later extension. |
| PayPal access issues | No genuine integration for judges | Prove one real sandbox authorization/capture early. Approval redirect is a documented fallback to SDK embedding; no fake success state. |
| Distributed failures | Duplicate charges, lost artifacts, or contradictions | Durable operations, stable provider request IDs, serialized settlement choice, reconciliation, artifacts stored before capture. |
| Deadline pressure | Ambition displaces a working submission | Follow the integrated plan's gates. Actual success/void and core uncertain-effect recovery are mandatory; optional remedies, road data, MCP and dashboards are cut first. |

If a genuine sandbox authorization/capture cannot be completed by the first implementation day's gate, fix the integration before adding features. If the local model cannot reliably produce reviewable proposals on the evaluation set, investigate the observed failures and evaluate an already authorized compatible model if available, or show a transparent typed-input fallback while recording actual AI work separately; do not present canned output as inference.

## 9. Final recommendation and boundaries

Build one merchant-facing application and one computational service, operated by the same service merchant. Two solver profiles can be a later product choice, but they are not separate independent vendors. The payment is for the computed **plan**, not the actual delivery, courier wages, or a multi-party payout. No live money, escrow, trustless exchange, AP2 certification, cryptographic proof of optimality, or guaranteed savings is promised.

The foundation spans reviewed AI, frozen contracts, local optimization, independent verification, recoverable PayPal settlement and portable evidence. Round2 extends it into12 connected capabilities centered on exact existing-plan failures and finite-scenario rescue. Full first-build estimate70–100 hours; flagship44–58 including reserve, subject to deadline cuts. The under-three-minute demo must show actual working behavior, not substitute feature breadth for execution.

Read the [expanded product](../docs/superpowers/specs/2026-11-10-proofroute-assurance.md), [v2 contracts](../docs/ASSURANCE_CONTRACTS.md), [corrected financial contracts](../docs/TECHNICAL_CONTRACTS.md), [integrated plan](../docs/superpowers/plans/2026-11-10-proofroute-assurance.md), [resources](../docs/IMPLEMENTATION_RESOURCES.md) and [validation/demo](../docs/VALIDATION_AND_DEMO.md). Start implementation with [CLAUDE_HANDOFF.md](../CLAUDE_HANDOFF.md).
