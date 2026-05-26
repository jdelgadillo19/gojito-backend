# Backend entitlement path — readiness checklist

Use when moving from **Supabase SQL grants** to **KV + admin API** as source of truth.

## Prerequisites

- [ ] `wrangler kv namespace create GOJITO_KV` (+ `--preview`) — paste IDs into [wrangler.jsonc](../wrangler.jsonc) (no `REPLACE_ME_*`)
- [ ] `wrangler.jsonc` `vars.SUPABASE_URL` set to your project URL
- [ ] `wrangler secret put SUPABASE_JWT_SECRET` (Supabase Dashboard → API → JWT Secret)
- [ ] `wrangler secret put GOJITO_ADMIN_SECRET`
- [ ] `npm run verify:deploy` passes
- [ ] `wrangler deploy` (or `npm run deploy`)

## Frontend alignment

Set the **same** Worker URL (no trailing slash) on all three:

- `gojito-platform/.env` → `VITE_GOJITO_API_URL`
- `cakery-bakery/.env`
- `calculator-cove/.env`
- Hub static: `GOJITO_BACKEND_URL` in [games-config.js](../../gojito-platform/games-config.js) when using combined static host

Then: `cd gojito-platform && npm run build:combined`

## Grant Guac

```bash
cd gojito-backend
GOJITO_API_URL="https://<worker>" GOJITO_ADMIN_SECRET="$GOJITO_ADMIN_SECRET" \
  npm run grant-guac -- "<supabase-user-uuid>" true
```

User signs in (or waits for 5-minute poll) → `GET /api/entitlements/me` → `profiles.tier` updated → games apply full access.

## Verify

See [docs/testing/entitlement-test-matrix.md](../../docs/testing/entitlement-test-matrix.md) sections A–E.
