import type { Context } from 'hono'
import type { WorkerBindings } from '../app'
import { requireSupabaseUserId } from '../lib/supabaseJwt'
import { readEntitlement } from '../lib/entitlementKv'

type EnvCtx = Context<{ Bindings: WorkerBindings }>

/**
 * Returns entitlement snapshot for the authenticated Supabase user.
 * accessTier: `beef` (free account) | `guac` (paid entitlement active; requires guacActive).
 */
export async function getMyEntitlement(c: EnvCtx): Promise<Response> {
  let uid: string
  try {
    uid = await requireSupabaseUserId(
      c.req.header('authorization'),
      c.env.SUPABASE_JWT_SECRET,
      c.env.SUPABASE_URL,
    )
  } catch {
    return c.json({ error: 'unauthorized' }, 401)
  }

  const snap = await readEntitlement(c.env.GOJITO_KV, uid)
  const guacActive = Boolean(snap?.guacActive)
  const accessTier: 'beef' | 'guac' = guacActive ? 'guac' : 'beef'

  return c.json({
    userId: uid,
    accessTier,
    guacActive,
    stripeCustomerId: snap?.stripeCustomerId ?? null,
    stripeSubscriptionId: snap?.stripeSubscriptionId ?? null,
    guacExpiresAt: snap?.guacExpiresAt ?? null,
    updatedAt: snap?.updatedAt ?? null,
  })
}
