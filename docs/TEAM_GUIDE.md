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
npm run setup:paypal         # one-time: creates the Brewbox product + 3 plans in your sandbox
```

## Where things live
See [ARCHITECTURE.md](ARCHITECTURE.md). Short version:
- `src/lib/paypal/*`: every PayPal REST call
- `src/lib/retention/*`: the Claude retention agent, the session engine and the offer executor
- `src/lib/policy.ts`: merchant guardrails (the AI proposes, this file decides)
- `src/lib/agents/consumer.ts`: the subscriber-side AI agent used in the `/agent` demo
- `src/app/*`: pages and API routes

## Status board (update when you pick something up)
| Area | Owner | State |
|---|---|---|
| Core engine, PayPal wrappers, AI agent | Claude | built (first pass) |
| Subscriber cancel-flow UI | Claude | in progress |
| Agent-to-agent demo + MCP | Claude | in progress |
| Merchant dashboard (AG Grid) | Claude | in progress |
| Sandbox end-to-end test | needs PayPal creds | blocked on `.env.local` |
| Demo video (≤ 2:50) | team | not started; script in [DEMO_SCRIPT.md](DEMO_SCRIPT.md) |
| Devpost submission text | team | draft in [SUBMISSION.md](SUBMISSION.md) |
| Make the repo public + LICENSE | repo owner | **required before submitting** |
