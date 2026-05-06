import { createRemoteJWKSet, jwtVerify } from 'jose'

const JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
)

/**
 * Verifies a Firebase Auth ID token and returns the Firebase user UID (`sub`).
 */
export async function verifyFirebaseIdToken(
  token: string,
  firebaseProjectId: string,
): Promise<string> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${firebaseProjectId}`,
    audience: firebaseProjectId,
  })

  const sub = typeof payload.sub === 'string' ? payload.sub : null
  if (!sub) throw new Error('missing_sub')

  return sub
}

export async function requireFirebaseUid(
  authHeader: string | undefined,
  firebaseProjectId: string,
): Promise<string> {
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    throw new Error('missing_bearer')
  }

  const token = authHeader.slice('bearer '.length).trim()
  if (!token) throw new Error('missing_token')

  return verifyFirebaseIdToken(token, firebaseProjectId)
}
