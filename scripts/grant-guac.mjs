#!/usr/bin/env node
/**
 * Selectively grant or revoke Guac for one Firebase Auth UID (writes Workers KV via admin API).
 *
 * Usage:
 *   GOJITO_API_URL=https://<worker-host> GOJITO_ADMIN_SECRET=<secret> \
 *     node scripts/grant-guac.mjs <firebaseUid> [true|false]
 *
 * Examples:
 *   node scripts/grant-guac.mjs abc123xyz true    # grant Guac
 *   node scripts/grant-guac.mjs abc123xyz false   # revoke → Beef
 */

const uid = process.argv[2]?.trim()
const grantArg = process.argv[3]
const grantGuac =
  grantArg === undefined ? true : grantArg !== 'false' && grantArg !== '0'

const base = (process.env.GOJITO_API_URL ?? '').trim().replace(/\/+$/, '')
const secret = (process.env.GOJITO_ADMIN_SECRET ?? '').trim()

if (!uid) {
  console.error(
    'Usage: GOJITO_API_URL=https://<worker> GOJITO_ADMIN_SECRET=... node scripts/grant-guac.mjs <firebaseUid> [true|false]',
  )
  process.exit(1)
}

if (!base || !secret) {
  console.error('Missing GOJITO_API_URL or GOJITO_ADMIN_SECRET in environment.')
  process.exit(1)
}

const url = `${base}/api/admin/entitlements`
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Gojito-Admin-Secret': secret,
  },
  body: JSON.stringify({ firebaseUid: uid, grantGuac }),
})

const text = await res.text()
console.log(`${res.status} ${text}`)
if (!res.ok) process.exit(1)
