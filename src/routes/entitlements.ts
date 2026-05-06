import type { Context } from 'hono'
import type { WorkerBindings } from '../app'
import { requireFirebaseUid } from '../lib/firebaseJwt'
import { readEntitlement } from '../lib/entitlementKv'

type EnvCtx = Context<{ Bindings: WorkerBindings }>

/**
 * Returns entitlement snapshot for the authenticated Firebase user.
 * profileTier: `beef` (free account) | `guac` (paid entitlement active).
 */
export async function getMyEntitlement(c: EnvCtx): Promise<Response> {
  let uid: string
  try {
    uid = await requireFirebaseUid(c.req.header('authorization'), c.env.FIREBASE_PROJECT_ID)
  } catch {
    return c.json({ error: 'unauthorized' }, 401)
  }

  const snap = await readEntitlement(c.env.GOJITO_KV, uid)

  const profileTier: 'beef' | 'guac' = snap?.guacActive ? 'guac' : snap?.tier ?? 'beef'

  return c.json({
    firebaseUid: uid,
    profileTier,
    guacActive: Boolean(snap?.guacActive),
    stripeCustomerId: snap?.stripeCustomerId ?? null,
    stripeSubscriptionId: snap?.stripeSubscriptionId ?? null,
    guacExpiresAt: snap?.guacExpiresAt ?? null,
    updatedAt: snap?.updatedAt ?? null,
  })
}
