/**
 * Standardized API error codes for consistent error responses
 */

export const ApiErrorCode = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_PARAMETER: 'MISSING_PARAMETER',
  INVALID_PARAMETER: 'INVALID_PARAMETER',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',

  // Rate Limiting
  RATE_LIMITED: 'RATE_LIMITED',

  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode]

export interface ApiErrorResponse {
  error: string
  code: ApiErrorCode
  details?: string[]
}

/**
 * Create a standardized error response object
 */
export function apiError(
  message: string,
  code: ApiErrorCode,
  details?: string[]
): ApiErrorResponse {
  const response: ApiErrorResponse = { error: message, code }
  if (details && details.length > 0) {
    response.details = details
  }
  return response
}

/**
 * Map error codes to HTTP status codes
 */
export function errorStatusCode(code: ApiErrorCode): number {
  switch (code) {
    case ApiErrorCode.UNAUTHORIZED:
      return 401
    case ApiErrorCode.FORBIDDEN:
      return 403
    case ApiErrorCode.VALIDATION_ERROR:
    case ApiErrorCode.MISSING_PARAMETER:
    case ApiErrorCode.INVALID_PARAMETER:
      return 400
    case ApiErrorCode.NOT_FOUND:
      return 404
    case ApiErrorCode.CONFLICT:
      return 409
    case ApiErrorCode.RATE_LIMITED:
      return 429
    case ApiErrorCode.INTERNAL_ERROR:
    case ApiErrorCode.DATABASE_ERROR:
      return 500
  }
}
