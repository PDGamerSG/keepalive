# PayPal AI Hackathon: strategy and recommendation

Researched Nov 11, 2026 (IST). **Deadline: Thu Nov 12, 12:00 PST = Fri Nov 13, 01:30 IST (about 45 hours from writing).** After the deadline nothing can change: no commits, no README edits, no video swaps.

## 1. What the event rewards

- **Hard requirement:** PayPal and AI must both be used *meaningfully*. Sandbox is fine. Working build (hosted URL or runnable repo), public repo with an OSS license, public YouTube video under 3 minutes.
- **Five equally weighted criteria:** Technological Implementation (PayPal + AI depth, non-trivial), Design (complete product, not a proof of concept), Potential Impact (specific real audience, demonstrated), Innovation (*"does the project differ from existing concepts?"*), Presentation (end-to-end video, problem → who → why). Implementation is the first tie-break.
- **Prizes:** 1st $12k, 2nd $8k, 3rd $5k. Then $5k each for Most Creative, Most Impactful, Best Demo Delivery, Best Use of PayPal + AI, and Best Use of Agentic Commerce. Sponsor prizes stack: one sponsor prize plus one grand or honorable prize. AG Grid pays $5k/$2k/$1k×3, APIMatic and Bryntum $1k×3 each, Channel3 $1.5k, Render gives credits.
- **Judges:** mostly PayPal DevRel (Jo Franchetti, Eddie Jaoude, Marco Podien), plus a PayPal SWE, an engineering manager and a senior PM, and one person from each sponsor. DevRel judges look hard at the video and at how deep the API usage is.
- **The organizers' own tips:** "Make PayPal and AI impossible to miss" in the description, the Built With list and the video. Open the video with the problem and who it's for. Cut loading screens. Give judges something to run. Upload the video early.
- **Scale:** about 32,300 registered participants. The gallery isn't published, but many Devpost entries are already indexed (see section 3).

## 2. Past PayPal hackathon winners

This is the first edition of this exact Devpost event, so there are no previous winners of it. These are the winners of other PayPal-sponsored hackathons. All repos were checked on GitHub.

| Project | Event / prize | GitHub | What they built | How they sold it | Novelty (1–5) | What won it |
|---|---|---|---|---|---|---|
| **CrawlerPal** | Dev Days 2025, **1st** | [positiveblue/CrawlerPal](https://github.com/positiveblue/CrawlerPal) (Jordi Montes, Fewsats; ex-Lightning Labs) | News site returns HTTP 402 to AI bots with L402 offers (1¢/5¢), paid through PayPal sandbox; the agent then gets a bearer token | "Agents will be the main actors of the internet. Don't block them, make them pay." A curl demo shows the 402 | 4 | **Concept and timing.** It matched PayPal's agentic-commerce launch. A small Python repo; the idea won |
| **Codebusters** | Dev Days 2025, **2nd** | none public (Shopware staff) | Moved Shopware 6's PayPal checkout from JS SDK v5 to v6: non-blocking loader, context-aware Pay Later | "Merchants were disabling PayPal because the buttons were slow" | 1 | **Real merchant pain plus sponsor alignment.** It pushes adoption of PayPal's new SDK |
| **Rosen** | Dev Days 2025, **3rd**; GCP bounty, 2nd | [GoROSEN/rosen-pyusd](https://github.com/GoROSEN/rosen-pyusd) | Social chat with in-chat PYUSD tips and AI translation; live on app stores | Persona stories ("$25 fee on $50"), a before/after table, a "For Judges" section | 2 | **A shipped product and impact storytelling** |
| **Phaigo** | PayPal × Google Cloud bounty, **1st** | [tricodex/phaigo](https://github.com/tricodex/phaigo) | PYUSD send-to-username, payment links, Gemini payment assistant, on-chain trace analytics | The README maps every sponsor requirement to the file that implements it; live Vercel app | 2 | **Visibly ticked every judging box,** plus an AI layer |
| **Normie Tech** | GCP bounty, 3rd | [normiedottech/normie.tech](https://github.com/normiedottech/normie.tech) | Card/PayPal checkout with PYUSD merchant settlement; an existing startup | Merchant value | 2 | **A real business** |
| **PYUSD Hub** | GCP bounty, special merit | [amand4ngol/PYUSD-Hub](https://github.com/amand4ngol/PYUSD-Hub) | Flutter wallet with MEV-risk monitor and Gemini transaction analysis | APK, demo video | 3 | **Breadth and polish** |
| **Ripe** | PYUSD Solana hackathon 2024, **grand** | none public (existing startup) | Universal QR SDK: scan SEA e-wallet QR codes, pay in PYUSD, merchant gets local fiat | A specific region, a specific pain | 3 | **Real problem, reusable infrastructure** |
| **Lingocaster** | PYUSD Solana 2024, **2nd** | [Lingo-Labs/lingocaster](https://github.com/Lingo-Labs/lingocaster) | Farcaster language game: OpenAI turns posts into quizzes; PYUSD bets with friends | Viral-loop framing | 4 | **Creativity, unexpected domain** |
| **DevQuest** | ETHOnline 2025, PYUSD prize | [Tarif-dev/DevQuest](https://github.com/Tarif-dev/DevQuest) | PYUSD-escrowed OSS bounties; AI scores the PR 0–100; payout = bounty × score | "AI decides, stablecoin pays" | 3 | **A clear AI-to-money loop, full stack** |

**Patterns that win PayPal hackathons**
1. **Ride PayPal's current narrative.** In 2025 that was agentic commerce and SDK v6. Now it is the Agent Toolkit/MCP, agent-ready merchants, and trust and consent in agent payments. PayPal product people judge, and they reward what they want developers to build.
2. **Make the agent a real economic actor** that pays, gets paid or executes, rather than a chatbot bolted onto a form. The 1st-place winner made agents *pay*.
3. **Lead with a specific human or merchant problem, preferably quantified.** Rosen, Ripe and Codebusters all did this.
4. **Map the judging criteria explicitly.** Phaigo's README listed every required API and the file implementing it, and won 1st.
5. **Real and live beats ambitious and half-built.** Hosted URLs and shipped apps placed repeatedly.
6. **One visible "wow" moment in the demo,** such as a 402 turning into a paid token or a live state change.
7. **Tight scope.** The 1st-place repo is tiny.

## 3. Which ideas are already taken in this event

These are indexed Devpost entries for this hackathon. The descriptions are self-reported.

| Space | Existing entry | Verdict |
|---|---|---|
| Guarded AI shopping agent | Errand Agent, AI Pay, Shelfie Street (multi-shop errands) | Crowded |
| Refunds / returns / recalls | Settled, Refund Relay, RecallReady | Crowded |
| Disputes / chargebacks | Cleared (seller-approved dispute replies) | Taken |
| Reconciliation copilot | ClearLedger AI | Taken |
| Checkout recovery | CartBridge AI | Taken |
| Pay-when-verified / AI escrow | AgentEscrow, Stood, Rentabot | Crowded |
| Group money / treasurer / savings circles | Purser, Kitty | Crowded |
| Logistics / routing | RouteNexa AI | Present |
| Payment chaos / reliability lab | Unhappy Path | Taken |
| Receipt bill-splitting | Venmo shipped this on Nov 9, 2026 | Avoid |
| Anything in the official "Inspiration" list (agent pays contractor on job done, agent-to-agent negotiation, freelancer multi-currency invoicing, gig payouts, donation splits) | Many entrants will copy these | Avoid as the headline |

## 4. Verdict on ProofRoute (teammate's repo)

The research is careful and honest, but I recommend **not building it**:

1. **PayPal is peripheral.** The product is an OR-Tools route auditor, and PayPal is a $4.50 authorize/capture on top. The organizers' top tip is that PayPal should be impossible to miss, and a judge would ask "why is PayPal in this?"
2. **The repo's own estimate doesn't fit the time left.** The flagship is estimated at 44–58 hours, and we have about 45 hours, which also have to cover the video and the submission.
3. **Impact is hard to argue.** Nobody pays $4.50 per dispatch audit, and the repo itself says demand is unvalidated.
4. **It's hard to tell in under 3 minutes.** "Frozen travel scenarios, independent checker, finite-scenario robust rescue" is a lot for a DevRel judge to absorb.
5. **The core mechanism isn't new.** Its payment model, pay only when work verifies, is already covered by AgentEscrow, Stood and Rentabot.

Things worth reusing: the competitor screen, the payment-lifecycle rigor (idempotency, webhook verification) and the PayPal people/strategy notes.

## 5. Recommendation: **KeepAlive**, an AI retention desk for PayPal subscription merchants

**One-liner:** *When a subscriber, or their AI agent, tries to cancel or a renewal fails, KeepAlive negotiates a fair save inside the merchant's limits and executes it live through PayPal Subscriptions.*

### Why this idea
- **Real, specific gap.** Cancel-flow and retention tools (Churnkey and others) support Stripe, Braintree, Chargebee and Paddle, but **not PayPal Subscriptions**. Churn Buster covers PayPal failed-payment emails only. Creators, SaaS founders and subscription-box sellers who bill through PayPal have no AI retention layer.
- **PayPal is the core.** It uses Subscriptions v1 (plans, revise to a different plan with **buyer re-consent through PayPal**, suspend/pause, activate, cancel, capture outstanding balance, list transactions), webhooks (`BILLING.SUBSCRIPTION.CANCELLED`, `.SUSPENDED`, `.PAYMENT.FAILED`, `PAYMENT.SALE.COMPLETED`), the Agent Toolkit / MCP for the agent's tools, and Invoicing for a one-time "settle balance" fallback.
- **AI is the core too.** An LLM reads the cancellation reason, the subscriber's usage and payment history, and the merchant's policy. It picks and words an offer (pause 1 month, downgrade, a one-time discount, or plain cancel), within hard limits that deterministic code enforces.
- **The agentic-commerce angle is the novelty.** Consumers will soon send their *own* AI agents to cancel subscriptions. KeepAlive exposes an **agent-facing MCP endpoint** where a buyer's agent asks to cancel, receives machine-readable offers, relays them to its human, and gets an accept or cancel executed. A one-step plain cancel is always available, which fits click-to-cancel rules. This is agent-to-agent commerce on a real merchant problem, not a toy negotiation.
- **Measurable impact on screen.** The dashboard shows MRR saved, the save rate by reason and failed payments recovered, all computed from real sandbox subscriptions.
- **Easy to demo in 3 minutes.** (1) A subscriber clicks Cancel. (2) The AI asks why, then offers "pause for 1 month". (3) The subscriber accepts and the PayPal sandbox subscription shows SUSPENDED live. (4) Claude, acting as the subscriber's agent, tries to cancel a second subscription through MCP and gets a downgrade offer. The human approves the PayPal re-consent link and the plan is revised. (5) The dashboard updates with MRR saved.

### Prize targets
Primary: Best Use of Agentic Commerce, Best Use of PayPal + AI, and overall placement. Secondary: Most Impactful. Cheap sponsor add-on: **AG Grid** for the merchant dashboard's subscriber table (AG Grid's 1st place is $5k and it stacks), and **Render** for hosting.

### Honest risks
- An AI cancel flow alone is not new (Churnkey has AI offers). The differentiators are the PayPal-native execution and the agent-to-agent channel, so the pitch must lead with those.
- PayPal plan changes need buyer re-consent. That's fine, because it's a trust feature we can show on screen.
- Sandbox subscriptions need a sandbox buyer approval to start, so seed about 15 subscriptions early with a script plus sandbox buyer logins, or use the simulator for webhooks.

## 6. How KeepAlive maps to the winning patterns

| Pattern | KeepAlive |
|---|---|
| Ride PayPal's narrative | Agent Toolkit/MCP, agent-to-agent commerce, and consent (PayPal re-consent on plan changes) |
| Agent as an economic actor | The subscriber's AI agent negotiates through MCP and the merchant's agent executes on PayPal |
| Specific problem | PayPal subscription merchants have no cancel-flow tooling (Churnkey doesn't support PayPal) |
| Explicit criteria mapping | README section "For Judges": every PayPal API and AI call, with file links |
| Real and live | Hosted on Render or Vercel with seeded sandbox subscriptions; judges can cancel one themselves |
| One wow moment | Claude tries to cancel a subscription, negotiates, and the PayPal sandbox status flips live |
| Tight scope | Three flows: human cancel, agent cancel, dashboard. Failed-payment recovery only if time allows |

**Fallback idea** if the team prefers something smaller: **Agent 402 for PayPal Invoicing**, CrawlerPal's pattern applied to services. Rejected as the main pick because it is too close to a past winner.

## 7. 40-hour build plan (2–3 people)

| Block (IST) | Person A: backend/PayPal | Person B: AI/agents | Person C: UI/video |
|---|---|---|---|
| Nov 11, 09:00–13:00 | Next.js app + sandbox app keys; create product + 3 plans; subscription approve flow; seed script | Policy schema (merchant limits); offer engine with LLM + deterministic guardrails | Merchant dashboard skeleton (AG Grid); subscriber portal "Manage plan" page |
| 13:00–20:00 | suspend/revise/cancel/activate wrappers; webhook endpoint + verification; event log | Cancel-flow chat; reason classification; failed-payment outreach drafts | Cancel-flow chat UI; offer cards; live status badges |
| 20:00–02:00 | **Gate: one real save end-to-end in sandbox** | MCP server: `request_cancellation`, `get_offers`, `accept_offer`, `cancel_now` | MRR-saved metrics from real data |
| Nov 12, 09:00–15:00 | Deploy (Render or Vercel); env vars; README with run steps | Claude Desktop / agent demo through MCP; evals on 10 cancellation reasons | Record the demo; voiceover; edit to 2:45 |
| 15:00–20:00 | Bug bash, LICENSE, Built With | Polish prompts | **Upload video to YouTube by 20:00 IST**; submit to Devpost |
| 20:00–01:00 | Buffer only, then freeze | | |

**Cut first if behind:** failed-payment recovery, AG Grid extras, evals. **Never cut:** a real PayPal state change on screen, the AI offer, the agent MCP path, the video.
