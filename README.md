# gojito-backend

Cloudflare Workers API for Gojito Games.

## Setup

1. Create a KV namespace and paste IDs into `wrangler.jsonc`:

```bash
cd gojito-backend
wrangler kv namespace create GOJITO_KV
wrangler kv namespace create GOJITO_KV --preview
```

2. Install deps:

```bash
npm install
```

Before deploying, run `npm run verify:deploy` (also runs automatically via `npm run deploy`). It fails if KV namespace IDs are still `REPLACE_ME_*` or `SUPABASE_URL` is empty in `wrangler.jsonc`. Set secrets with `wrangler secret put` (see below).

3. Local secrets (do not commit `.dev.vars`). See `.dev.vars.example`:

- `SUPABASE_URL` — project URL, e.g. `https://xxxxx.supabase.co`
- `SUPABASE_JWT_SECRET` — **JWT Secret** from Supabase Dashboard → Project Settings → API (used to verify user access tokens)
- `STRIPE_WEBHOOK_SECRET`, `GOJITO_ADMIN_SECRET` as needed

Set `SUPABASE_URL` in `wrangler.jsonc` `vars` for deployed Workers, and use `wrangler secret put SUPABASE_JWT_SECRET` (and Stripe secrets) in production.

4. Stripe webhook URL:

- Point Stripe webhook endpoint to `https://<your-worker-host>/webhooks/stripe`

## Stripe linkage

Include the Supabase user id on Stripe Checkout metadata so checkout can link the Stripe customer to KV entitlements:

- `supabase_user_id=<uuid from auth.users>`

Subscription lifecycle updates **`guacActive`** from Stripe events.

## Admin API (manual Guac)

```bash
curl -sS -X POST "https://<worker>/api/admin/entitlements" \
  -H "Content-Type: application/json" \
  -H "X-Gojito-Admin-Secret: $GOJITO_ADMIN_SECRET" \
  -d '{"userId":"<supabase-user-uuid>","grantGuac":true}'
```

### CLI helper

```bash
GOJITO_API_URL="https://<worker>" GOJITO_ADMIN_SECRET="$GOJITO_ADMIN_SECRET" \
  npm run grant-guac -- "<userId>" true
```

## Routes

- `GET /health`
- `POST /webhooks/stripe`
- `GET /api/entitlements/me` (Bearer Supabase access token) → `{ userId, accessTier, guacActive, ... }`
- `POST /api/migrations/bean-preview` (Bearer Supabase access token, JSON `{ beanSave, cloudSave? }`)
- `POST /api/admin/entitlements` (`X-Gojito-Admin-Secret`, JSON `{ userId, grantGuac }`)
