# Team guide: how we work on KeepAlive

**Deadline: Thu Nov 12, 12:00 PST = Fri Nov 13, 01:30 IST.** After it, nothing changes: no commits, no README edits, no video swaps.

## Ground rules
1. **Pull before you push:** `git pull --rebase` and then `git push`. Never force-push `main`.
2. **Small commits, pushed often.** WIP is fine; a broken `main` build is not. Run `npm run build` before pushing anything that touches `src/`.
3. **Secrets live only in `.env.local`** (git-ignored). See `.env.example`.
4. **PayPal sandbox only.** Never put live credentials anywhere.
5. Record what you're doing in the "Status board" section below, so nobody duplicates work.

## Local setup
```bash
npm install
cp .env.example .env.local   # fill in PayPal sandbox + Anthropic keys
npm run dev                  # http://localhost:3000
# then open /merchant and click "Set up PayPal plans" once (creates the Brewbox product + 3 plans)
npm test                     # guardrail + engine tests (no keys needed)
```

## Where things live
See [ARCHITECTURE.md](ARCHITECTURE.md). Short version:
- `src/lib/paypal/*`: every PayPal REST call
- `src/lib/retention/*`: the Claude retention agent, the session engine and the offer executor
- `src/lib/policy.ts`: merchant guardrails (the AI proposes, this file decides)
- `src/lib/agents/consumer.ts`: the subscriber-side AI agent used in the `/agent` demo
- `src/app/*`: pages and API routes

## Status board (update when you pick something up)
_Last updated 2026-11-11 by Aditya._

| Area | Owner | State |
|---|---|---|
| Core engine, PayPal wrappers, AI agent | Aditya | ✅ done, verified on the real sandbox |
| Subscriber cancel-flow UI | Aditya | ✅ done (cancel works while paused too) |
| Agent-to-agent demo + MCP | Aditya | ✅ done. Travelling and Firm-cancel presets verified live; MCP verified with raw JSON-RPC |
| Merchant dashboard (AG Grid) | Aditya | ✅ done |
| Landing page (`/`, 3D orrery, scroll story, guardrail playground) | Aditya | ✅ done; static, no backend calls. Scenes: `src/components/orrery/` |
| Tests | Aditya | ✅ 24 offline tests (`npm test`) + 8 live Claude evals (`npm run eval:ai`) |
| Sandbox end-to-end test | Aditya | ✅ steps 1–9 passed, see [TESTING.md](TESTING.md) |
| Deploy to Render + webhooks (TESTING step 10) | open | not started: `render.yaml` is ready, set env vars, then add the webhook URL |
| MCP from Claude Desktop (`mcp-remote`) | open | not tried yet |
| Demo video (≤ 2:50) | team | not started; script in [DEMO_SCRIPT.md](DEMO_SCRIPT.md) |
| Devpost submission text | team | draft in [SUBMISSION.md](SUBMISSION.md) |
| Review/remove raw third-party captures in `docs/archive/proofroute/research/raw` | repo owner | before going public |
| Make the repo public (LICENSE is MIT) | repo owner | **required before submitting** |

## Sandbox accounts (save yourself an hour)
- Buyer = a sandbox **Personal account in the United States**. The account that owns the REST app is the *seller* and can't subscribe; India-region accounts fail at checkout with a generic error.
- Each run of "Subscribe" creates a real sandbox subscription; cancel your test ones from `/account/<id>`.
