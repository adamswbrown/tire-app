/**
 * @jest-environment node
 */
import { ApiErrorCode, apiError, errorStatusCode } from '@/lib/api-errors'

describe('API Error Utilities', () => {
  describe('ApiErrorCode', () => {
    it('has all expected error codes', () => {
      expect(ApiErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED')
      expect(ApiErrorCode.FORBIDDEN).toBe('FORBIDDEN')
      expect(ApiErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
      expect(ApiErrorCode.MISSING_PARAMETER).toBe('MISSING_PARAMETER')
      expect(ApiErrorCode.INVALID_PARAMETER).toBe('INVALID_PARAMETER')
      expect(ApiErrorCode.NOT_FOUND).toBe('NOT_FOUND')
      expect(ApiErrorCode.CONFLICT).toBe('CONFLICT')
      expect(ApiErrorCode.RATE_LIMITED).toBe('RATE_LIMITED')
      expect(ApiErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR')
      expect(ApiErrorCode.DATABASE_ERROR).toBe('DATABASE_ERROR')
    })
  })

  describe('apiError', () => {
    it('creates error with message and code', () => {
      const error = apiError('Not found', ApiErrorCode.NOT_FOUND)
      expect(error).toEqual({ error: 'Not found', code: 'NOT_FOUND' })
    })

    it('includes details when provided', () => {
      const error = apiError('Validation failed', ApiErrorCode.VALIDATION_ERROR, ['field1 is required', 'field2 is invalid'])
      expect(error).toEqual({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: ['field1 is required', 'field2 is invalid'],
      })
    })

    it('omits details when empty array', () => {
      const error = apiError('Error', ApiErrorCode.INTERNAL_ERROR, [])
      expect(error.details).toBeUndefined()
    })
  })

  describe('errorStatusCode', () => {
    it('maps UNAUTHORIZED to 401', () => {
      expect(errorStatusCode(ApiErrorCode.UNAUTHORIZED)).toBe(401)
    })

    it('maps FORBIDDEN to 403', () => {
      expect(errorStatusCode(ApiErrorCode.FORBIDDEN)).toBe(403)
    })

    it('maps validation errors to 400', () => {
      expect(errorStatusCode(ApiErrorCode.VALIDATION_ERROR)).toBe(400)
      expect(errorStatusCode(ApiErrorCode.MISSING_PARAMETER)).toBe(400)
      expect(errorStatusCode(ApiErrorCode.INVALID_PARAMETER)).toBe(400)
    })

    it('maps NOT_FOUND to 404', () => {
      expect(errorStatusCode(ApiErrorCode.NOT_FOUND)).toBe(404)
    })

    it('maps CONFLICT to 409', () => {
      expect(errorStatusCode(ApiErrorCode.CONFLICT)).toBe(409)
    })

    it('maps RATE_LIMITED to 429', () => {
      expect(errorStatusCode(ApiErrorCode.RATE_LIMITED)).toBe(429)
    })

    it('maps server errors to 500', () => {
      expect(errorStatusCode(ApiErrorCode.INTERNAL_ERROR)).toBe(500)
      expect(errorStatusCode(ApiErrorCode.DATABASE_ERROR)).toBe(500)
    })
  })
})
