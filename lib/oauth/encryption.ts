import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Get encryption key from environment variable or generate a default (for development only)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY environment variable is required in production")
    }
    // Development fallback - DO NOT USE IN PRODUCTION
    console.warn("WARNING: Using default encryption key. Set ENCRYPTION_KEY in production!")
    return crypto.scryptSync("default-dev-key-change-in-production", "salt", KEY_LENGTH)
  }
  // If key is hex string, decode it; otherwise use it directly
  if (key.length === 64) {
    return Buffer.from(key, "hex")
  }
  return crypto.scryptSync(key, "salt", KEY_LENGTH)
}

/**
 * Encrypt sensitive data (OAuth tokens)
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")

  const tag = cipher.getAuthTag()

  // Return iv:tag:encrypted
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`
}

/**
 * Decrypt sensitive data (OAuth tokens)
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey()
  const parts = encryptedData.split(":")
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format")
  }

  const [ivHex, tagHex, encrypted] = parts
  const iv = Buffer.from(ivHex, "hex")
  const tag = Buffer.from(tagHex, "hex")

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}
