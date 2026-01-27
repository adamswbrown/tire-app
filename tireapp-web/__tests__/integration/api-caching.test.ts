/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { conditionalResponse, generateETag, checkConditionalRequest, cachedJsonResponse } from '@/lib/api-cache'

describe('API ETag Caching Integration', () => {
  describe('generateETag', () => {
    it('generates consistent ETag for same data', () => {
      const data = { id: 1, name: 'Test' }
      const etag1 = generateETag(data)
      const etag2 = generateETag(data)

      expect(etag1).toBe(etag2)
      expect(etag1).toMatch(/^"[a-f0-9]{32}"$/)
    })

    it('generates different ETags for different data', () => {
      const data1 = { id: 1, name: 'Test1' }
      const data2 = { id: 2, name: 'Test2' }

      const etag1 = generateETag(data1)
      const etag2 = generateETag(data2)

      expect(etag1).not.toBe(etag2)
    })
  })

  describe('checkConditionalRequest', () => {
    it('returns 304 response when ETag matches', () => {
      const etag = '"test-etag-123"'
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'If-None-Match': etag },
      })

      const response = checkConditionalRequest(request, etag)

      expect(response).not.toBeNull()
      expect(response!.status).toBe(304)
      expect(response!.headers.get('etag')).toBe(etag)
    })

    it('returns null when ETag does not match', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'If-None-Match': '"different-etag"' },
      })

      const response = checkConditionalRequest(request, '"test-etag-123"')

      expect(response).toBeNull()
    })

    it('returns null when no If-None-Match header', () => {
      const request = new NextRequest('http://localhost:3000/api/test')

      const response = checkConditionalRequest(request, '"test-etag-123"')

      expect(response).toBeNull()
    })
  })

  describe('cachedJsonResponse', () => {
    it('returns response with ETag and default cache-control', async () => {
      const data = { id: 1, name: 'Test' }

      const response = cachedJsonResponse(data)

      expect(response.status).toBe(200)
      expect(response.headers.get('etag')).toBeTruthy()
      expect(response.headers.get('cache-control')).toBe('private, no-cache')

      const body = await response.json()
      expect(body).toEqual(data)
    })

    it('supports maxAge option', () => {
      const data = { id: 1, name: 'Test' }

      const response = cachedJsonResponse(data, { maxAge: 300 })

      expect(response.headers.get('cache-control')).toBe('private, max-age=300, must-revalidate')
    })

    it('supports custom headers', () => {
      const data = { id: 1, name: 'Test' }

      const response = cachedJsonResponse(data, {
        headers: { 'X-Custom': 'value' },
      })

      expect(response.headers.get('x-custom')).toBe('value')
    })

    it('supports custom status code', () => {
      const data = { id: 1, name: 'Test' }

      const response = cachedJsonResponse(data, { status: 201 })

      expect(response.status).toBe(201)
    })
  })

  describe('conditionalResponse', () => {
    it('returns 304 for matching ETag', () => {
      const data = { id: 1, name: 'Test' }
      const etag = generateETag(data)
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'If-None-Match': etag },
      })

      const response = conditionalResponse(request, data)

      expect(response.status).toBe(304)
      expect(response.headers.get('etag')).toBe(etag)
    })

    it('returns 200 with data for non-matching ETag', async () => {
      const data = { id: 1, name: 'Test' }
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'If-None-Match': '"different-etag"' },
      })

      const response = conditionalResponse(request, data)

      expect(response.status).toBe(200)
      expect(response.headers.get('etag')).toBeTruthy()

      const body = await response.json()
      expect(body).toEqual(data)
    })

    it('returns 200 when no If-None-Match header', async () => {
      const data = { id: 1, name: 'Test' }
      const request = new NextRequest('http://localhost:3000/api/test')

      const response = conditionalResponse(request, data)

      expect(response.status).toBe(200)
      expect(response.headers.get('etag')).toBeTruthy()

      const body = await response.json()
      expect(body).toEqual(data)
    })

    it('supports maxAge option', () => {
      const data = { id: 1, name: 'Test' }
      const request = new NextRequest('http://localhost:3000/api/test')

      const response = conditionalResponse(request, data, { maxAge: 600 })

      expect(response.headers.get('cache-control')).toBe('private, max-age=600, must-revalidate')
    })

    it('supports custom headers', () => {
      const data = { id: 1, name: 'Test' }
      const request = new NextRequest('http://localhost:3000/api/test')

      const response = conditionalResponse(request, data, {
        headers: { 'X-Custom': 'test-value' },
      })

      expect(response.headers.get('x-custom')).toBe('test-value')
    })
  })
})
