import type { Context } from 'hono'
import type { WorkerBindings } from '../app'
import { requireSupabaseUserId } from '../lib/supabaseJwt'

type EnvCtx = Context<{ Bindings: WorkerBindings }>

/**
 * Preview-only Bean → account migration merge (max progression wins).
 * Does not persist server-side yet — callers apply merged blob client-side or via future POST commit route.
 */
export async function previewBeanMigration(c: EnvCtx): Promise<Response> {
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

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid_json' }, 400)
  }

  const beanSave =
    body &&
    typeof body === 'object' &&
    'beanSave' in body &&
    body.beanSave &&
    typeof body.beanSave === 'object'
      ? (body.beanSave as Record<string, unknown>)
      : null

  const cloudSave =
    body &&
    typeof body === 'object' &&
    'cloudSave' in body &&
    body.cloudSave &&
    typeof body.cloudSave === 'object'
      ? (body.cloudSave as Record<string, unknown>)
      : {}

  if (!beanSave) {
    return c.json({ error: 'missing_beanSave' }, 400)
  }

  const merged = mergeMaxProgress(beanSave, cloudSave)

  return c.json({
    userId: uid,
    policy: 'max_progression_wins',
    mergedPreview: merged,
  })
}

function mergeMaxProgress(
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
): Record<string, unknown> {
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)])
  const out: Record<string, unknown> = {}

  for (const key of keys) {
    const l = local[key]
    const r = remote[key]

    if (isPlainObject(l) && isPlainObject(r)) {
      out[key] = mergeMaxProgress(l, r)
      continue
    }

    if (typeof l === 'number' && typeof r === 'number') {
      out[key] = Math.max(l, r)
      continue
    }

    if (typeof l === 'boolean' && typeof r === 'boolean') {
      out[key] = l || r
      continue
    }

    const picked = pickPreferDefined(l, r)
    if (picked !== undefined) out[key] = picked
  }

  return out
}

function pickPreferDefined(l: unknown, r: unknown): unknown {
  if (l !== undefined && l !== null) return l
  if (r !== undefined && r !== null) return r
  return undefined
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v))
}
