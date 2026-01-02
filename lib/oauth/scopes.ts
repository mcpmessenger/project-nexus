/**
 * Google OAuth scope definitions and management
 */

export const GOOGLE_SCOPES = {
  // Drive scopes
  DRIVE_METADATA_READONLY: "https://www.googleapis.com/auth/drive.metadata.readonly",
  DRIVE_READONLY: "https://www.googleapis.com/auth/drive.readonly",
  DRIVE_FILE: "https://www.googleapis.com/auth/drive.file", // Create/update files
  DRIVE: "https://www.googleapis.com/auth/drive", // Full access

  // Calendar scopes
  CALENDAR_READONLY: "https://www.googleapis.com/auth/calendar.readonly",
  CALENDAR_EVENTS: "https://www.googleapis.com/auth/calendar.events",
  CALENDAR: "https://www.googleapis.com/auth/calendar", // Full access

  // Gmail scopes
  GMAIL_READONLY: "https://www.googleapis.com/auth/gmail.readonly",
  GMAIL_SEND: "https://www.googleapis.com/auth/gmail.send",
  GMAIL_MODIFY: "https://www.googleapis.com/auth/gmail.modify",
  GMAIL: "https://www.googleapis.com/auth/gmail", // Full access

  // Docs, Sheets, Slides
  DOCUMENTS: "https://www.googleapis.com/auth/documents",
  SPREADSHEETS: "https://www.googleapis.com/auth/spreadsheets",
  PRESENTATIONS: "https://www.googleapis.com/auth/presentations",
} as const

/**
 * Minimal scopes for initial connection (read-only metadata)
 */
export const MINIMAL_SCOPES = [
  GOOGLE_SCOPES.DRIVE_METADATA_READONLY,
  GOOGLE_SCOPES.CALENDAR_READONLY,
  GOOGLE_SCOPES.GMAIL_READONLY,
]

/**
 * Scope groups for incremental upgrades
 */
export const SCOPE_GROUPS = {
  drive_read: [GOOGLE_SCOPES.DRIVE_METADATA_READONLY, GOOGLE_SCOPES.DRIVE_READONLY],
  drive_write: [GOOGLE_SCOPES.DRIVE_FILE, GOOGLE_SCOPES.DRIVE],
  calendar_read: [GOOGLE_SCOPES.CALENDAR_READONLY],
  calendar_write: [GOOGLE_SCOPES.CALENDAR_EVENTS, GOOGLE_SCOPES.CALENDAR],
  gmail_read: [GOOGLE_SCOPES.GMAIL_READONLY],
  gmail_write: [GOOGLE_SCOPES.GMAIL_SEND, GOOGLE_SCOPES.GMAIL_MODIFY, GOOGLE_SCOPES.GMAIL],
} as const

/**
 * Check if account has required scope
 */
export function hasScope(accountScopes: string[], requiredScope: string): boolean {
  return accountScopes.includes(requiredScope)
}

/**
 * Check if account has any scope from a group
 */
export function hasAnyScope(accountScopes: string[], scopeGroup: readonly string[]): boolean {
  return scopeGroup.some((scope) => accountScopes.includes(scope))
}

/**
 * Get missing scopes needed for an operation
 */
export function getMissingScopes(accountScopes: string[], requiredScopes: string[]): string[] {
  return requiredScopes.filter((scope) => !accountScopes.includes(scope))
}

/**
 * Determine which scope upgrade is needed for an operation
 */
export function getRequiredScopeUpgrade(
  accountScopes: string[],
  operation: "drive_read" | "drive_write" | "calendar_read" | "calendar_write" | "gmail_read" | "gmail_write"
): string[] {
  const requiredGroup = SCOPE_GROUPS[operation]
  return getMissingScopes(accountScopes, requiredGroup)
}
