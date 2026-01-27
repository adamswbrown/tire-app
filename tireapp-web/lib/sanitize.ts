// Input sanitization utilities for API routes
// React auto-escapes in JSX, but we sanitize at API boundary for defense-in-depth

/**
 * Strip HTML tags from a string to prevent stored XSS.
 * Keeps the text content, removes all HTML/script elements.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}

/**
 * Sanitize a string input: trim whitespace and strip HTML tags.
 */
export function sanitizeString(input: string): string {
  return stripHtml(input).trim()
}

/**
 * Validate and sanitize a name field.
 * Returns null if invalid, sanitized string if valid.
 */
export function sanitizeName(input: unknown, maxLength = 500): string | null {
  if (!input || typeof input !== 'string') return null
  const sanitized = sanitizeString(input)
  if (sanitized.length === 0 || sanitized.length > maxLength) return null
  return sanitized
}
