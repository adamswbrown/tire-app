/**
 * Client-side API fetch utility with ETag caching support.
 * Stores ETags per-URL and sends If-None-Match headers to enable
 * 304 Not Modified responses, reducing bandwidth and parse overhead.
 */

const etagCache = new Map<string, { etag: string; data: unknown }>()

interface FetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
}

/**
 * Fetch with automatic ETag caching.
 * On 304 responses, returns the cached data without re-parsing.
 * Falls back to standard fetch behavior for non-GET or uncached requests.
 */
export async function apiFetch<T = unknown>(
  url: string,
  options?: FetchOptions
): Promise<{ data: T; status: number; fromCache: boolean }> {
  const method = options?.method?.toUpperCase() || 'GET'
  const headers: Record<string, string> = { ...options?.headers }

  // Add If-None-Match header for GET requests with cached ETags
  if (method === 'GET') {
    const cached = etagCache.get(url)
    if (cached) {
      headers['If-None-Match'] = cached.etag
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Handle 304 Not Modified - return cached data
  if (response.status === 304) {
    const cached = etagCache.get(url)
    if (cached) {
      return { data: cached.data as T, status: 304, fromCache: true }
    }
  }

  // Parse response
  const data = await response.json() as T

  // Cache ETag for successful GET responses
  if (method === 'GET' && response.ok) {
    const etag = response.headers.get('etag')
    if (etag) {
      etagCache.set(url, { etag, data })
    }
  }

  // Invalidate cache on mutations to the same resource
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && response.ok) {
    // Invalidate the base URL (e.g., /api/customers for POST /api/customers)
    const baseUrl = url.split('?')[0]
    for (const key of etagCache.keys()) {
      if (key.startsWith(baseUrl)) {
        etagCache.delete(key)
      }
    }
  }

  return { data, status: response.status, fromCache: false }
}

/**
 * Clear all cached ETags. Useful after authentication changes.
 */
export function clearETagCache(): void {
  etagCache.clear()
}

/**
 * Get current cache size for monitoring.
 */
export function getETagCacheSize(): number {
  return etagCache.size
}
