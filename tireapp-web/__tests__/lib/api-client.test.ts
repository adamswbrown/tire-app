/**
 * @jest-environment jsdom
 */

import { apiFetch, clearETagCache, getETagCacheSize } from '@/lib/api-client'

describe('apiFetch', () => {
  beforeEach(() => {
    clearETagCache()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('makes GET request and caches ETag', async () => {
    const mockData = { id: 1, name: 'Test' }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['etag', '"abc123"']]),
      json: async () => mockData,
    })

    const result = await apiFetch('/api/test')

    expect(result).toEqual({
      data: mockData,
      status: 200,
      fromCache: false,
    })
    expect(getETagCacheSize()).toBe(1)
  })

  it('sends If-None-Match header on subsequent GET', async () => {
    const mockData = { id: 1, name: 'Test' }

    // First request
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['etag', '"abc123"']]),
      json: async () => mockData,
    })
    await apiFetch('/api/test')

    // Second request
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 304,
      headers: new Map([['etag', '"abc123"']]),
      json: async () => ({}),
    })
    await apiFetch('/api/test')

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect((global.fetch as jest.Mock).mock.calls[1][1].headers['If-None-Match']).toBe('"abc123"')
  })

  it('returns cached data on 304 response', async () => {
    const mockData = { id: 1, name: 'Test' }

    // First request
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['etag', '"abc123"']]),
      json: async () => mockData,
    })
    await apiFetch('/api/test')

    // Second request (304)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 304,
      headers: new Map([['etag', '"abc123"']]),
      json: async () => ({}),
    })
    const result = await apiFetch('/api/test')

    expect(result).toEqual({
      data: mockData,
      status: 304,
      fromCache: true,
    })
  })

  it('does not cache non-GET requests', async () => {
    const mockData = { id: 1, name: 'Test' }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Map([['etag', '"abc123"']]),
      json: async () => mockData,
    })

    await apiFetch('/api/test', { method: 'POST' })

    expect(getETagCacheSize()).toBe(0)
  })

  it('invalidates cache on POST to same URL', async () => {
    const mockData = { id: 1, name: 'Test' }

    // GET request to cache
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['etag', '"abc123"']]),
      json: async () => mockData,
    })
    await apiFetch('/api/test')
    expect(getETagCacheSize()).toBe(1)

    // POST request to invalidate
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Map(),
      json: async () => ({ id: 2 }),
    })
    await apiFetch('/api/test', { method: 'POST' })

    expect(getETagCacheSize()).toBe(0)
  })

  it('invalidates related URLs on mutation', async () => {
    // Cache multiple URLs
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['etag', '"abc123"']]),
      json: async () => ({}),
    })
    await apiFetch('/api/customers')
    await apiFetch('/api/customers?page=2')
    expect(getETagCacheSize()).toBe(2)

    // POST to base URL
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Map(),
      json: async () => ({ id: 1 }),
    })
    await apiFetch('/api/customers', { method: 'POST' })

    expect(getETagCacheSize()).toBe(0)
  })

  it('passes through custom headers', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => ({}),
    })

    await apiFetch('/api/test', {
      method: 'POST',
      headers: { 'X-Custom': 'value' },
    })

    expect((global.fetch as jest.Mock).mock.calls[0][1].headers).toMatchObject({
      'X-Custom': 'value',
    })
  })

  it('clears all cache entries', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['etag', '"abc123"']]),
      json: async () => ({}),
    })

    await apiFetch('/api/test1')
    await apiFetch('/api/test2')
    expect(getETagCacheSize()).toBe(2)

    clearETagCache()
    expect(getETagCacheSize()).toBe(0)
  })

  it('handles errors without breaking cache', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    await expect(apiFetch('/api/test')).rejects.toThrow('Network error')
    expect(getETagCacheSize()).toBe(0)
  })
})
