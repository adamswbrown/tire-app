/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { generateETag, checkConditionalRequest, cachedJsonResponse, conditionalResponse } from '@/lib/api-cache'

describe('API Cache Utilities', () => {
  describe('generateETag', () => {
    it('returns a quoted MD5 hash string', () => {
      const etag = generateETag({ name: 'test' })
      expect(etag).toMatch(/^"[a-f0-9]{32}"$/)
    })

    it('produces the same hash for the same input', () => {
      const data = { id: 1, items: ['a', 'b'] }
      expect(generateETag(data)).toBe(generateETag(data))
    })

    it('produces different hashes for different input', () => {
      expect(generateETag({ a: 1 })).not.toBe(generateETag({ a: 2 }))
    })

    it('handles arrays', () => {
      const etag = generateETag([1, 2, 3])
      expect(etag).toMatch(/^"[a-f0-9]{32}"$/)
    })

    it('handles null and undefined', () => {
      expect(generateETag(null)).toMatch(/^"[a-f0-9]{32}"$/)
      expect(generateETag(undefined)).toMatch(/^"[a-f0-9]{32}"$/)
    })
  })

  describe('checkConditionalRequest', () => {
    it('returns null when no If-None-Match header', () => {
      const request = new NextRequest('http://localhost/api/test')
      const result = checkConditionalRequest(request, '"abc123"')
      expect(result).toBeNull()
    })

    it('returns null when ETag does not match', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: { 'If-None-Match': '"old-hash"' },
      })
      const result = checkConditionalRequest(request, '"new-hash"')
      expect(result).toBeNull()
    })

    it('returns 304 when ETag matches', () => {
      const etag = '"matching-hash"'
      const request = new NextRequest('http://localhost/api/test', {
        headers: { 'If-None-Match': etag },
      })
      const result = checkConditionalRequest(request, etag)
      expect(result).not.toBeNull()
      expect(result!.status).toBe(304)
      expect(result!.headers.get('ETag')).toBe(etag)
      expect(result!.headers.get('Cache-Control')).toBe('private, no-cache')
    })
  })

  describe('cachedJsonResponse', () => {
    it('returns JSON with ETag and Cache-Control headers', async () => {
      const data = { name: 'test' }
      const response = cachedJsonResponse(data)

      expect(response.status).toBe(200)
      expect(response.headers.get('ETag')).toMatch(/^"[a-f0-9]{32}"$/)
      expect(response.headers.get('Cache-Control')).toBe('private, no-cache')
      expect(response.headers.get('Vary')).toBe('Authorization')

      const body = await response.json()
      expect(body).toEqual(data)
    })

    it('respects custom status code', () => {
      const response = cachedJsonResponse({ ok: true }, { status: 201 })
      expect(response.status).toBe(201)
    })

    it('applies maxAge to Cache-Control', () => {
      const response = cachedJsonResponse({}, { maxAge: 300 })
      expect(response.headers.get('Cache-Control')).toBe('private, max-age=300, must-revalidate')
    })

    it('merges custom headers', () => {
      const response = cachedJsonResponse({}, { headers: { 'X-Custom': 'value' } })
      expect(response.headers.get('X-Custom')).toBe('value')
      expect(response.headers.get('ETag')).toBeTruthy()
    })
  })

  describe('conditionalResponse', () => {
    it('returns 304 when client has matching ETag', () => {
      const data = { id: 1 }
      const etag = generateETag(data)
      const request = new NextRequest('http://localhost/api/test', {
        headers: { 'If-None-Match': etag },
      })

      const response = conditionalResponse(request, data)
      expect(response.status).toBe(304)
    })

    it('returns full response when client has no ETag', async () => {
      const data = { id: 1 }
      const request = new NextRequest('http://localhost/api/test')

      const response = conditionalResponse(request, data)
      expect(response.status).toBe(200)
      expect(response.headers.get('ETag')).toMatch(/^"[a-f0-9]{32}"$/)

      const body = await response.json()
      expect(body).toEqual(data)
    })

    it('returns full response when client ETag is stale', async () => {
      const data = { id: 1, updated: true }
      const request = new NextRequest('http://localhost/api/test', {
        headers: { 'If-None-Match': '"stale-hash"' },
      })

      const response = conditionalResponse(request, data)
      expect(response.status).toBe(200)
    })

    it('passes options through to cached response', () => {
      const data = {}
      const request = new NextRequest('http://localhost/api/test')

      const response = conditionalResponse(request, data, { maxAge: 60 })
      expect(response.headers.get('Cache-Control')).toBe('private, max-age=60, must-revalidate')
    })
  })
})
