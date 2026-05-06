import type { Context } from 'hono'
import type { WorkerBindings } from '../app'
import { timingSafeEqual } from '../lib/adminSecret'
import { upsertEntitlement } from '../lib/entitlementKv'

type EnvCtx = Context<{ Bindings: WorkerBindings }>

/**
 * Recommended: grant or revoke Guac (paid) access for beta / manual overrides.
 * Protected by `X-Gojito-Admin-Secret` (set via `wrangler secret put GOJITO_ADMIN_SECRET`).
 *
 * Body: `{ "firebaseUid": "<uid>", "grantGuac": true | false }`
 */
export async function postAdminEntitlements(c: EnvCtx): Promise<Response> {
  const configured = c.env.GOJITO_ADMIN_SECRET?.trim()
  if (!configured) {
    return c.json({ error: 'admin_not_configured' }, 503)
  }

  const headerSecret = c.req.header('x-gojito-admin-secret') ?? ''
  if (!timingSafeEqual(headerSecret, configured)) {
    return c.json({ error: 'forbidden' }, 403)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid_json' }, 400)
  }

  if (!body || typeof body !== 'object') {
    return c.json({ error: 'invalid_body' }, 400)
  }

  const firebaseUid =
    'firebaseUid' in body && typeof (body as { firebaseUid?: unknown }).firebaseUid === 'string'
      ? (body as { firebaseUid: string }).firebaseUid.trim()
      : ''
  const grantGuac =
    'grantGuac' in body && typeof (body as { grantGuac?: unknown }).grantGuac === 'boolean'
      ? (body as { grantGuac: boolean }).grantGuac
      : null

  if (!firebaseUid || grantGuac === null) {
    return c.json({ error: 'missing_firebaseUid_or_grantGuac' }, 400)
  }

  await upsertEntitlement(c.env.GOJITO_KV, firebaseUid, {
    tier: grantGuac ? 'guac' : 'beef',
    guacActive: grantGuac,
    ...(grantGuac ? {} : { guacExpiresAt: null }),
  })

  return c.json({ ok: true, firebaseUid, grantGuac })
}
