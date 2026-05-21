import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handleStripeWebhook } from './routes/stripeWebhook'
import { getMyEntitlement } from './routes/entitlements'
import { previewBeanMigration } from './routes/migrations'
import { postAdminEntitlements } from './routes/adminEntitlements'

export type WorkerBindings = {
  GOJITO_KV: KVNamespace
  SUPABASE_URL: string
  SUPABASE_JWT_SECRET: string
  STRIPE_PRICE_ID_PREMIUM_ANNUAL: string
  STRIPE_WEBHOOK_SECRET: string
  GOJITO_ADMIN_SECRET?: string
}

const app = new Hono<{ Bindings: WorkerBindings }>()

app.use(
  '*',
  cors({
    origin: '*',
    allowHeaders: ['Authorization', 'Content-Type', 'Stripe-Signature', 'X-Gojito-Admin-Secret'],
    allowMethods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
    maxAge: 86400,
  }),
)

app.get('/health', (c) => c.json({ ok: true, service: 'gojito-backend' }))

app.post('/webhooks/stripe', async (c) => handleStripeWebhook(c))

app.get('/api/entitlements/me', async (c) => getMyEntitlement(c))

app.post('/api/migrations/bean-preview', async (c) => previewBeanMigration(c))

app.post('/api/admin/entitlements', async (c) => postAdminEntitlements(c))

export { app }
