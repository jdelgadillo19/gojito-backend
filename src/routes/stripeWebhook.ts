import type Stripe from 'stripe'
import { Stripe as StripeSdk } from 'stripe'
import type { Context } from 'hono'
import type { WorkerBindings } from '../app'
import {
  readStripeCustomerLink,
  stripeEventDedupeKey,
  upsertEntitlement,
  writeStripeCustomerLink,
} from '../lib/entitlementKv'

type EnvCtx = Context<{ Bindings: WorkerBindings }>

export async function handleStripeWebhook(c: EnvCtx): Promise<Response> {
  const signature = c.req.header('stripe-signature')
  if (!signature) return c.text('missing stripe-signature', 400)

  const rawBody = await c.req.text()
  let event: Stripe.Event

  try {
    event = StripeSdk.webhooks.constructEvent(rawBody, signature, c.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return c.text('invalid webhook signature', 400)
  }

  const dedupeKey = stripeEventDedupeKey(event.id)
  const dedupeHit = await c.env.GOJITO_KV.get(dedupeKey)
  if (dedupeHit) {
    return c.json({ received: true, duplicate: true })
  }
  await c.env.GOJITO_KV.put(dedupeKey, String(Date.now()), { expirationTtl: 60 * 60 * 24 * 30 })

  await dispatchStripeEvent(c.env.GOJITO_KV, event)

  return c.json({ received: true })
}

async function dispatchStripeEvent(kv: KVNamespace, event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const customerId =
        typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id ?? null
      const firebaseUid = metaFirebaseUid(session.metadata)
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id ?? null

      if (customerId) {
        const existing = await readStripeCustomerLink(kv, customerId)
        const mergedUid = firebaseUid ?? existing?.firebaseUid ?? null
        await writeStripeCustomerLink(kv, customerId, mergedUid)
      }

      if (firebaseUid && customerId) {
        await upsertEntitlement(kv, firebaseUid, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          tier: 'guac',
        })
      }

      break
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null

      let firebaseUid = metaFirebaseUid(sub.metadata)
      if (!firebaseUid && customerId) {
        const link = await readStripeCustomerLink(kv, customerId)
        firebaseUid = link?.firebaseUid ?? null
      }

      if (customerId) {
        await writeStripeCustomerLink(kv, customerId, firebaseUid ?? null)
      }

      if (!firebaseUid) break

      const eligible =
        sub.status === 'active' || sub.status === 'trialing'

      await upsertEntitlement(kv, firebaseUid, {
        tier: 'guac',
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
        guacActive: eligible,
      })

      break
    }
    default:
      break
  }
}

function metaFirebaseUid(metadata: Stripe.Metadata | null): string | null {
  if (!metadata) return null
  const raw = metadata.firebase_uid ?? metadata.firebaseUid ?? null
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed ? trimmed : null
}
