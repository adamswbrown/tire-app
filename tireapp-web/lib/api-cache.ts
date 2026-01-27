/**
 * API response caching utilities
 * Provides ETag generation and Cache-Control headers for GET endpoints
 */

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Generate an ETag from response data by hashing the JSON content
 */
export function generateETag(data: unknown): string {
  const hash = crypto.createHash('md5').update(JSON.stringify(data) ?? '').digest('hex')
  return `"${hash}"`
}

/**
 * Check if the client's cached version matches the current data.
 * Returns a 304 Not Modified response if the ETag matches,
 * or null if the data has changed and a full response should be sent.
 */
export function checkConditionalRequest(
  request: NextRequest,
  etag: string
): NextResponse | null {
  const ifNoneMatch = request.headers.get('if-none-match')
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        'ETag': etag,
        'Cache-Control': 'private, no-cache',
      },
    })
  }
  return null
}

/**
 * Create a JSON response with caching headers.
 * - ETag for conditional requests (If-None-Match)
 * - Cache-Control: private, no-cache (revalidate every time but allow client caching)
 *
 * Use maxAge > 0 for data that doesn't change frequently (e.g. thresholds, questionnaire definitions).
 */
export function cachedJsonResponse(
  data: unknown,
  options?: {
    status?: number
    maxAge?: number
    headers?: Record<string, string>
  }
): NextResponse {
  const etag = generateETag(data)
  const maxAge = options?.maxAge ?? 0
  const cacheControl = maxAge > 0
    ? `private, max-age=${maxAge}, must-revalidate`
    : 'private, no-cache'

  const headers: Record<string, string> = {
    'ETag': etag,
    'Cache-Control': cacheControl,
    'Vary': 'Authorization',
    ...options?.headers,
  }

  return NextResponse.json(data, {
    status: options?.status ?? 200,
    headers,
  })
}

/**
 * Full conditional response helper - checks ETag match and returns
 * either a 304 or a fresh cached response.
 */
export function conditionalResponse(
  request: NextRequest,
  data: unknown,
  options?: {
    status?: number
    maxAge?: number
    headers?: Record<string, string>
  }
): NextResponse {
  const etag = generateETag(data)

  // Check if client has a fresh copy
  const notModified = checkConditionalRequest(request, etag)
  if (notModified) {
    return notModified
  }

  return cachedJsonResponse(data, options)
}
