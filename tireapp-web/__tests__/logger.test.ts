/**
 * @jest-environment node
 */
import { logger } from '@/lib/logger'

describe('Structured Logger', () => {
  const consoleSpy = {
    log: jest.spyOn(console, 'log').mockImplementation(),
    warn: jest.spyOn(console, 'warn').mockImplementation(),
    error: jest.spyOn(console, 'error').mockImplementation(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    consoleSpy.log.mockRestore()
    consoleSpy.warn.mockRestore()
    consoleSpy.error.mockRestore()
  })

  describe('info', () => {
    it('logs info messages to console.log', () => {
      logger.info('test message')
      expect(consoleSpy.log).toHaveBeenCalledTimes(1)
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('INFO'))
    })

    it('includes metadata', () => {
      logger.info('with meta', { route: '/api/test', method: 'GET' })
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('/api/test'))
    })
  })

  describe('warn', () => {
    it('logs warn messages to console.warn', () => {
      logger.warn('warning message')
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1)
      expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('WARN'))
    })
  })

  describe('error', () => {
    it('logs error messages to console.error', () => {
      logger.error('error message')
      expect(consoleSpy.error).toHaveBeenCalledTimes(1)
      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('ERROR'))
    })

    it('includes error details from Error object', () => {
      logger.error('failed', new Error('something broke'))
      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('something broke'))
    })

    it('handles non-Error objects', () => {
      logger.error('failed', 'string error')
      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('string error'))
    })
  })

  describe('api', () => {
    it('logs successful requests to console.log', () => {
      logger.api('/api/customers', 'GET', 200, 45)
      expect(consoleSpy.log).toHaveBeenCalledTimes(1)
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('GET'))
    })

    it('logs client errors to console.warn', () => {
      logger.api('/api/customers', 'POST', 400, 10)
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1)
    })

    it('logs server errors to console.error', () => {
      logger.api('/api/customers', 'GET', 500, 100)
      expect(consoleSpy.error).toHaveBeenCalledTimes(1)
    })

    it('includes duration in output', () => {
      logger.api('/api/test', 'GET', 200, 123)
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('123ms'))
    })
  })
})
