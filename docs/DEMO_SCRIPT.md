# Demo video script (target 2:45, hard limit < 3:00)

Organizer tips we follow: open with the problem and who it's for; show PayPal and AI working end to end; cut loading screens; an AI voiceover is fine; upload to YouTube **early** (processing takes hours), set it to **Public**.

## Before recording
- Record on the hosted demo, https://keepalive.pallabdas.me (PayPal plans are already set up there), or locally with `npm run dev` and `.env.local` filled in.
- For the PayPal shots, use **Subscribe with PayPal** and approve with the sandbox **personal** account, so PayPal really changes state. **Try the instant demo** skips the login and is fine for quick extra subscribers so the dashboard isn't empty: e.g. Maya (Standard), Leo (Premium), Priya (Standard).
- Open a second tab on `sandbox.paypal.com` logged in as the **business** account → Settings → Payments → Subscriptions, to show status changing on PayPal's side.
- Browser zoom 110%, hide bookmarks, close notifications.

## Shot list
| Time | Screen | Voiceover |
|---|---|---|
| 0:00–0:15 | Landing page hero | "Subscription businesses on PayPal lose customers at one place: the cancel button. Stripe merchants have retention tools. PayPal merchants have nothing. And soon it won't even be your customer clicking cancel, it'll be their AI agent." |
| 0:15–0:25 | `/shop` | "Meet Brewbox, a coffee subscription billed with PayPal Subscriptions. Maya subscribes…" (cut straight to the approved page; skip the PayPal login) |
| 0:25–1:05 | `/account/<id>` → Cancel subscription | Maya: "I'm travelling for two months." KeepAlive (Claude) offers **Pause for 2 months**. Click **Yes**. A blue PayPal line appears: "Paused on PayPal (status SUSPENDED)". Cut to the PayPal sandbox tab: the subscription shows Suspended. "Claude found the reason; our policy engine approved the offer; PayPal executed it. We read it back from PayPal before claiming success." |
| 1:05–1:50 | `/agent` | "Now the future case: Leo never visits our site. He tells his own AI agent 'cancel Brewbox, I have too much coffee.'" Press **Send my agent**. Left: Leo's Claude calls `request_cancellation`. Right: KeepAlive offers **Switch to Lite**. Leo's agent asks its human: **Approve**. The agent accepts; PayPal returns an approval link: "Plan changes always need the human's consent *inside PayPal*." Click it and approve (fast-cut). |
| 1:50–2:05 | Third brief "Firm cancel" (pre-recorded) | "And when someone really wants to go, we don't argue: one decline and it's cancelled on PayPal. Cancel is always one click." |
| 2:05–2:35 | `/merchant` | KPIs (saves, MRR kept, save rate, agent conversations) → Conversations page (AI rationale, guardrail notes) → PayPal activity page (every call with debug_id) → Guardrails page (max discount, pause, budget). "The AI proposes; deterministic code decides. The model never holds PayPal credentials." |
| 2:35–2:50 | Landing "PayPal APIs used" + MCP config | "Built on PayPal Subscriptions (suspend, activate, revise with re-consent, price overrides, cancel, verified webhooks), Claude and MCP. KeepAlive: the retention desk for PayPal subscriptions, ready for customers and their agents." |

## Lines to avoid
- Don't claim real revenue numbers or market statistics we haven't verified.
- Don't say "escrow", "guarantee" or "production-ready".
