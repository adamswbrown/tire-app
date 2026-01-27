/**
 * @jest-environment node
 */
import { stripHtml, sanitizeString, sanitizeName } from '@/lib/sanitize'

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('hello <b>world</b>')).toBe('hello world')
  })

  it('removes script tags', () => {
    expect(stripHtml('<script>alert("xss")</script>safe')).toBe('alert("xss")safe')
  })

  it('removes nested tags', () => {
    expect(stripHtml('<div><span>text</span></div>')).toBe('text')
  })

  it('preserves text without tags', () => {
    expect(stripHtml('plain text')).toBe('plain text')
  })

  it('handles empty string', () => {
    expect(stripHtml('')).toBe('')
  })

  it('removes self-closing tags', () => {
    expect(stripHtml('before<br/>after')).toBe('beforeafter')
  })
})

describe('sanitizeString', () => {
  it('trims whitespace and strips HTML', () => {
    expect(sanitizeString('  <b>hello</b>  ')).toBe('hello')
  })

  it('handles plain text', () => {
    expect(sanitizeString('  hello world  ')).toBe('hello world')
  })
})

describe('sanitizeName', () => {
  it('returns sanitized name for valid input', () => {
    expect(sanitizeName('  Test Customer  ')).toBe('Test Customer')
  })

  it('returns null for empty string', () => {
    expect(sanitizeName('')).toBeNull()
  })

  it('returns null for non-string input', () => {
    expect(sanitizeName(123)).toBeNull()
    expect(sanitizeName(null)).toBeNull()
    expect(sanitizeName(undefined)).toBeNull()
  })

  it('returns null for string exceeding max length', () => {
    expect(sanitizeName('a'.repeat(501))).toBeNull()
  })

  it('strips HTML from names', () => {
    expect(sanitizeName('<script>alert(1)</script>Company')).toBe('alert(1)Company')
  })

  it('respects custom max length', () => {
    expect(sanitizeName('abcdef', 5)).toBeNull()
    expect(sanitizeName('abcde', 5)).toBe('abcde')
  })

  it('returns null for whitespace-only after sanitization', () => {
    expect(sanitizeName('   ')).toBeNull()
  })
})
