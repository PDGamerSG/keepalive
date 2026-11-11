# Deploy KeepAlive on Vercel

Production origin: `https://keepalive.pallabdas.me`.

## Configuration

Use Node 22 or newer and link this repository to the `keepalive` Vercel project. The root is a single Next.js application; `vercel.json` contains its region and scheduled job.

Set these **production** environment variables in Vercel:

| Variable | Purpose |
|---|---|
| `APP_URL` | `https://keepalive.pallabdas.me`; PayPal return URLs and MCP endpoint |
| `PAYPAL_ENV` | `sandbox` |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | The sandbox **REST application** credentials from PayPal Developer → Apps & Credentials; sandbox account login passwords are separate |
| `ANTHROPIC_API_KEY` | Claude API access |
| `BLOB_READ_WRITE_TOKEN` | Automatically supplied when a **private** Vercel Blob store is connected |
| `CRON_SECRET` | A random secret; Vercel sends `Authorization: Bearer <secret>` to `/api/cron` |
| `PAYPAL_WEBHOOK_ID` | ID of the webhook registered for `https://keepalive.pallabdas.me/api/webhooks/paypal` |

Optional catalog IDs and `ADMIN_TOKEN` are documented in `.env.example`. Keep credentials in Vercel or ignored local environment files. Use separate storage and sandbox credentials for preview environments so previews cannot change the production demo's state.

## Persistence and scheduling

Hosted requests store subscribers, conversations, PayPal catalog IDs, policy, audit events and agent runs in private Blob storage. Reads bypass the CDN. Conditional ETag writes retry conflicts, and offer acceptance claims the offer before executing a payment operation. Provider errors are surfaced; they never reset existing data to an empty store. Local development keeps using `data/store.json` when no Blob token is configured. Vercel refuses to fall back to an ephemeral file.

The Hobby-compatible cron runs daily at 00:00 UTC. It resumes due pauses and restores expired discounts; relevant page visits also run due actions. Unattended actions can therefore run up to a day after their stored due time. Use a more frequent schedule on a supporting Vercel plan if tighter timing is needed.

## Release checks

```sh
npm ci
npm test
npm run lint
npm run typecheck
npm run build
npm run eval:ai  # loads .env.local; calls Claude and costs API tokens
npx vercel --prod --yes --scope pallab-das-projects-d3f377fd
```

The AI evaluation runs in a temporary local store. Both agents enable five-minute prompt caching on their stable system context and use automatic breakpoints for growing requests. `ai.usage` events retain the provider's input/output, cache-write and cache-read token counters. A configured cache does not imply a hit: inspect those counters to verify reuse.

After setting credentials, run **Set up PayPal plans** once from `/merchant`. Register the webhook for supported `BILLING.SUBSCRIPTION.*` events and `PAYMENT.SALE.COMPLETED`, then save its ID in Vercel and redeploy. Use a US Personal sandbox buyer for checkout. Follow the real sandbox checklist in [TESTING.md](TESTING.md).

Attach the hostname to the exact Vercel project before obtaining its DNS recommendation. In Namecheap Advanced DNS add the recommended CNAME for host `keepalive` with Automatic TTL, preserving every other record. Confirm provider verification, valid HTTPS, release assets, and a harmless route interaction.
