/**
 * @jest-environment node
 */
import { checkRateLimit, getClientIp, resetRateLimitStore } from '@/lib/rate-limit'

describe('Rate Limiter', () => {
  beforeEach(() => {
    resetRateLimitStore()
  })

  it('allows requests within limit', () => {
    const result = checkRateLimit('test-ip', { limit: 5, windowSeconds: 60 })
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(4)
    expect(result.limit).toBe(5)
  })

  it('tracks remaining requests correctly', () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit('test-ip', { limit: 5, windowSeconds: 60 })
    }
    const result = checkRateLimit('test-ip', { limit: 5, windowSeconds: 60 })
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(1)
  })

  it('blocks requests after limit exceeded', () => {
    const config = { limit: 3, windowSeconds: 60 }
    checkRateLimit('test-ip', config)
    checkRateLimit('test-ip', config)
    checkRateLimit('test-ip', config)
    const result = checkRateLimit('test-ip', config)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('tracks different IPs independently', () => {
    const config = { limit: 2, windowSeconds: 60 }
    checkRateLimit('ip-1', config)
    checkRateLimit('ip-1', config)
    const blocked = checkRateLimit('ip-1', config)
    const allowed = checkRateLimit('ip-2', config)
    expect(blocked.success).toBe(false)
    expect(allowed.success).toBe(true)
    expect(allowed.remaining).toBe(1)
  })

  it('uses separate windows for different identifiers', () => {
    const config = { limit: 1, windowSeconds: 60 }
    const r1 = checkRateLimit('ip-a', config)
    const r2 = checkRateLimit('ip-b', config)
    expect(r1.success).toBe(true)
    expect(r2.success).toBe(true)
    // Both should be blocked on second attempt
    expect(checkRateLimit('ip-a', config).success).toBe(false)
    expect(checkRateLimit('ip-b', config).success).toBe(false)
  })

  it('returns resetAt timestamp', () => {
    const before = Date.now()
    const result = checkRateLimit('test-ip', { limit: 5, windowSeconds: 60 })
    expect(result.resetAt).toBeGreaterThanOrEqual(before + 60000)
  })
})

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
    expect(getClientIp(headers)).toBe('1.2.3.4')
  })

  it('extracts IP from x-real-ip', () => {
    const headers = new Headers({ 'x-real-ip': '10.0.0.1' })
    expect(getClientIp(headers)).toBe('10.0.0.1')
  })

  it('falls back to unknown when no headers present', () => {
    const headers = new Headers()
    expect(getClientIp(headers)).toBe('unknown')
  })

  it('prefers x-forwarded-for over x-real-ip', () => {
    const headers = new Headers({
      'x-forwarded-for': '1.2.3.4',
      'x-real-ip': '10.0.0.1',
    })
    expect(getClientIp(headers)).toBe('1.2.3.4')
  })
})
