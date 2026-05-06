export type StoredEntitlement = {
  tier: 'beef' | 'guac'
  guacActive: boolean
  guacExpiresAt: number | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  updatedAt: number
}

export type StripeCustomerLink = {
  firebaseUid: string | null
  stripeCustomerId: string
  updatedAt: number
}

export function entitlementKey(uid: string) {
  return `entitlement:user:${uid}`
}

export function stripeCustomerLinkKey(customerId: string) {
  return `stripe:link:${customerId}`
}

export function stripeEventDedupeKey(eventId: string) {
  return `stripe:event:${eventId}`
}

/** Migrate legacy KV docs (`mvp`/`gold`, `goldActive`) to beef/guac naming. */
function migrateRaw(raw: Record<string, unknown>): StoredEntitlement | null {
  const tierRaw = raw.tier
  let tier: 'beef' | 'guac' = 'beef'
  if (tierRaw === 'guac' || tierRaw === 'gold') tier = 'guac'
  else if (tierRaw === 'beef' || tierRaw === 'mvp') tier = 'beef'

  const guacActive =
    typeof raw.guacActive === 'boolean'
      ? raw.guacActive
      : typeof raw.goldActive === 'boolean'
        ? raw.goldActive
        : false

  const guacExpiresAt =
    typeof raw.guacExpiresAt === 'number' || raw.guacExpiresAt === null
      ? (raw.guacExpiresAt as number | null)
      : typeof raw.goldExpiresAt === 'number' || raw.goldExpiresAt === null
        ? (raw.goldExpiresAt as number | null)
        : null

  const stripeCustomerId =
    typeof raw.stripeCustomerId === 'string' || raw.stripeCustomerId === null
      ? raw.stripeCustomerId
      : null
  const stripeSubscriptionId =
    typeof raw.stripeSubscriptionId === 'string' || raw.stripeSubscriptionId === null
      ? raw.stripeSubscriptionId
      : null
  const updatedAt = typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now()

  return {
    tier,
    guacActive,
    guacExpiresAt,
    stripeCustomerId,
    stripeSubscriptionId,
    updatedAt,
  }
}

export async function readEntitlement(
  kv: KVNamespace,
  uid: string,
): Promise<StoredEntitlement | null> {
  const rawUnknown = await kv.get(entitlementKey(uid), 'json')
  if (!rawUnknown || typeof rawUnknown !== 'object') return null
  const migrated = migrateRaw(rawUnknown as Record<string, unknown>)
  return migrated
}

export async function upsertEntitlement(
  kv: KVNamespace,
  uid: string,
  patch: Partial<StoredEntitlement>,
): Promise<StoredEntitlement> {
  const existing = (await readEntitlement(kv, uid)) ?? defaultEntitlementForUid(uid)
  const next: StoredEntitlement = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  }
  await kv.put(entitlementKey(uid), JSON.stringify(next))
  return next
}

function defaultEntitlementForUid(_uid: string): StoredEntitlement {
  return {
    tier: 'beef',
    guacActive: false,
    guacExpiresAt: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    updatedAt: Date.now(),
  }
}

export async function readStripeCustomerLink(
  kv: KVNamespace,
  customerId: string,
): Promise<StripeCustomerLink | null> {
  const raw = await kv.get(stripeCustomerLinkKey(customerId), 'json')
  if (!raw || typeof raw !== 'object') return null
  const l = raw as Partial<StripeCustomerLink>
  if (typeof l.stripeCustomerId !== 'string') return null
  return {
    firebaseUid:
      typeof l.firebaseUid === 'string' || l.firebaseUid === null ? l.firebaseUid : null,
    stripeCustomerId: l.stripeCustomerId,
    updatedAt: typeof l.updatedAt === 'number' ? l.updatedAt : Date.now(),
  }
}

export async function writeStripeCustomerLink(
  kv: KVNamespace,
  customerId: string,
  firebaseUid: string | null,
): Promise<void> {
  const payload: StripeCustomerLink = {
    stripeCustomerId: customerId,
    firebaseUid,
    updatedAt: Date.now(),
  }
  await kv.put(stripeCustomerLinkKey(customerId), JSON.stringify(payload))
}
