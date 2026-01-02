import { OAuth2Client } from "google-auth-library"
import { encrypt, decrypt } from "./encryption"
import { MINIMAL_SCOPES } from "./scopes"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/oauth/google/callback`

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn("Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET")
}

/**
 * Create Google OAuth2 client
 */
export function createOAuthClient(): OAuth2Client {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth credentials not configured")
  }
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)
}

/**
 * Generate authorization URL for OAuth flow
 */
export function getAuthorizationUrl(scopes: string[] = MINIMAL_SCOPES, state?: string): { url: string; state: string } {
  const client = createOAuthClient()
  const stateToken = state || generateStateToken()

  const url = client.generateAuthUrl({
    access_type: "offline", // Required to get refresh token
    scope: scopes,
    prompt: "consent", // Force consent screen to get refresh token
    state: stateToken,
  })

  return { url, state: stateToken }
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_at: Date
  scopes: string[]
  email?: string
}> {
  const client = createOAuthClient()
  const { tokens } = await client.getToken(code)

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Failed to get tokens from Google")
  }

  const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000)

  // Get email from ID token if available
  let email: string | undefined
  if (tokens.id_token) {
    try {
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: GOOGLE_CLIENT_ID,
      })
      const payload = ticket.getPayload()
      email = payload?.email
    } catch (error) {
      console.warn("Failed to decode ID token:", error)
    }
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    scopes: tokens.scope ? tokens.scope.split(" ") : [],
    email,
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(encryptedRefreshToken: string): Promise<{
  access_token: string
  expires_at: Date
}> {
  const client = createOAuthClient()
  const refreshToken = decrypt(encryptedRefreshToken)

  client.setCredentials({
    refresh_token: refreshToken,
  })

  const { credentials } = await client.refreshAccessToken()

  if (!credentials.access_token) {
    throw new Error("Failed to refresh access token")
  }

  const expiresAt = credentials.expiry_date
    ? new Date(credentials.expiry_date)
    : new Date(Date.now() + 3600 * 1000)

  return {
    access_token: credentials.access_token,
    expires_at: expiresAt,
  }
}

/**
 * Encrypt and prepare token data for database storage
 */
export function encryptTokens(tokens: { access_token: string; refresh_token: string }): {
  encrypted_access_token: string
  encrypted_refresh_token: string
} {
  return {
    encrypted_access_token: encrypt(tokens.access_token),
    encrypted_refresh_token: encrypt(tokens.refresh_token),
  }
}

/**
 * Decrypt tokens from database
 */
export function decryptTokens(encryptedAccessToken: string, encryptedRefreshToken: string): {
  access_token: string
  refresh_token: string
} {
  return {
    access_token: decrypt(encryptedAccessToken),
    refresh_token: decrypt(encryptedRefreshToken),
  }
}

/**
 * Generate state token for OAuth flow
 */
function generateStateToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

// Import crypto for state token generation
import crypto from "crypto"
