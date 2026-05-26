# Phase 3: Deploy backend + paid tier

Run after [LOGIN-SAVES-MVP.md](../../docs/LOGIN-SAVES-MVP.md) hub login and cloud saves are verified.

## 1. Cloudflare KV

```bash
cd gojito-backend
wrangler kv namespace create GOJITO_KV
wrangler kv namespace create GOJITO_KV --preview
```

Paste `id` and `preview_id` into [wrangler.jsonc](../wrangler.jsonc) (replace `REPLACE_ME_*`).

## 2. Secrets and vars

```bash
wrangler secret put SUPABASE_JWT_SECRET
wrangler secret put STRIPE_WEBHOOK_SECRET
# Optional until checkout ships:
wrangler secret put STRIPE_SECRET_KEY
```

Set `SUPABASE_URL` and `STRIPE_PRICE_ID_PREMIUM_ANNUAL` in `wrangler.jsonc` `vars` or dashboard.

## 3. Deploy

```bash
npm run verify:deploy
wrangler deploy
```

Point `VITE_GOJITO_API_URL` / `GOJITO_BACKEND_URL` at the Workers URL in all three frontends.

## 4. Stripe

- Webhook URL: `https://<worker>/webhooks/stripe`
- Checkout sessions must include metadata `supabase_user_id` (see [README](../README.md)).
- Test Guac with `POST /api/admin/entitlements` before checkout UI ships.

## 5. Verify Guac sync

1. Grant Guac via admin API for a test user.
2. Sign in on hub → **Refresh access** → tier shows Guac.
3. Open Cakery → build tier `full`; Calculator premium routes unlock per game gates.
