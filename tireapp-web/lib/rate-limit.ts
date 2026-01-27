// In-memory rate limiter for API routes
// Uses sliding window counter per IP address

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 60_000 // 1 minute

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number
  /** Window duration in seconds */
  windowSeconds: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  limit: 60,
  windowSeconds: 60,
}

/**
 * Check rate limit for a given identifier (typically IP address).
 * Returns whether the request should be allowed and rate limit metadata.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): RateLimitResult {
  cleanup()

  const now = Date.now()
  const key = identifier
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + config.windowSeconds * 1000
    rateLimitStore.set(key, { count: 1, resetAt })
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetAt,
    }
  }

  // Existing window
  entry.count++
  const remaining = Math.max(0, config.limit - entry.count)

  if (entry.count > config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  return {
    success: true,
    limit: config.limit,
    remaining,
    resetAt: entry.resetAt,
  }
}

/**
 * Extract client IP from request headers.
 * Checks x-forwarded-for (Vercel/proxy), then x-real-ip, then falls back to 'unknown'.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return headers.get('x-real-ip') || 'unknown'
}

/** Reset the rate limit store (for testing) */
export function resetRateLimitStore() {
  rateLimitStore.clear()
}
