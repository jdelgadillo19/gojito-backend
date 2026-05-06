# gojito-backend

Cloudflare Workers API for Gojito Games (**recommended** placement).

## Setup (recommended path)

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

3. Local secrets file `.dev.vars` (do not commit):

```
STRIPE_WEBHOOK_SECRET=whsec_...
GOJITO_ADMIN_SECRET=your-long-random-secret
```

`FIREBASE_PROJECT_ID` is defaulted in `wrangler.jsonc` (`cakery-bakery`); override per env if needed.

Production:

```bash
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put GOJITO_ADMIN_SECRET
```

4. Stripe webhook URL:

- Point Stripe webhook endpoint to `https://<your-worker-host>/webhooks/stripe`

## Stripe linkage requirement

Include Firebase UID on Stripe Checkout metadata:

- `firebase_uid=<FirebaseAuth UID>`

Checkout completion links `customer` ↔ `firebase_uid`. Subscription lifecycle sets **`guacActive`** (paid tier).

## Admin API (beta / manual Guac)

**Recommended:** grant or revoke sitewide paid tier without Stripe:

```bash
curl -sS -X POST "https://<worker>/api/admin/entitlements" \
  -H "Content-Type: application/json" \
  -H "X-Gojito-Admin-Secret: $GOJITO_ADMIN_SECRET" \
  -d '{"firebaseUid":"<Firebase UID>","grantGuac":true}'
```

`grantGuac: false` revokes Guac (sets Beef).

### CLI helper (same API)

From `gojito-backend/` (loads secrets from your shell env — **do not** commit them):

```bash
GOJITO_API_URL="https://<worker>" GOJITO_ADMIN_SECRET="$GOJITO_ADMIN_SECRET" \
  npm run grant-guac -- "<Firebase UID>" true

GOJITO_API_URL="https://<worker>" GOJITO_ADMIN_SECRET="$GOJITO_ADMIN_SECRET" \
  npm run grant-guac -- "<Firebase UID>" false
```

## Routes

- `GET /health`
- `POST /webhooks/stripe`
- `GET /api/entitlements/me` (Bearer Firebase ID token) → `{ profileTier: beef | guac, guacActive, ... }`
- `POST /api/migrations/bean-preview` (Bearer Firebase ID token, JSON `{ beanSave, cloudSave? }`)
- `POST /api/admin/entitlements` (`X-Gojito-Admin-Secret`, JSON `{ firebaseUid, grantGuac }`)
