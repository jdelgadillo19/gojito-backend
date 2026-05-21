import { jwtVerify } from 'jose'

function issuerForSupabaseUrl(supabaseUrl: string): string {
  const base = supabaseUrl.replace(/\/+$/, '')
  return `${base}/auth/v1`
}

/**
 * Verifies a Supabase Auth access token (HS256) and returns the auth user id (`sub`).
 */
export async function verifySupabaseAccessToken(
  token: string,
  jwtSecret: string,
  supabaseUrl: string,
): Promise<string> {
  const secret = new TextEncoder().encode(jwtSecret)
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256'],
    issuer: issuerForSupabaseUrl(supabaseUrl),
    audience: 'authenticated',
  })

  const sub = typeof payload.sub === 'string' ? payload.sub : null
  if (!sub) throw new Error('missing_sub')

  return sub
}

export async function requireSupabaseUserId(
  authHeader: string | undefined,
  jwtSecret: string,
  supabaseUrl: string,
): Promise<string> {
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    throw new Error('missing_bearer')
  }

  const token = authHeader.slice('bearer '.length).trim()
  if (!token) throw new Error('missing_token')

  return verifySupabaseAccessToken(token, jwtSecret, supabaseUrl)
}
