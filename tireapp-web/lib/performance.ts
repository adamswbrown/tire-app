/**
 * Performance monitoring utilities for API routes and server actions
 */

export interface PerformanceMetrics {
  route: string
  method: string
  duration: number
  timestamp: string
}

/**
 * Measure the execution time of an async function
 */
export async function measurePerformance<T>(
  fn: () => Promise<T>,
  route: string,
  method: string
): Promise<T> {
  const before = performance.now()

  try {
    const result = await fn()
    const after = performance.now()
    const duration = Math.round(after - before)

    // Log slow requests (> 2000ms / 2 seconds)
    if (duration > 2000) {
      console.warn(`[Slow Request] ${method} ${route} took ${duration}ms`)
    }

    // In development, log all requests
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${method} ${route} - ${duration}ms`)
    }

    return result
  } catch (error) {
    const after = performance.now()
    const duration = Math.round(after - before)
    console.error(`[API Error] ${method} ${route} failed after ${duration}ms`, error)
    throw error
  }
}

/**
 * Create a performance timer for manual tracking
 */
export function createTimer() {
  const start = performance.now()

  return {
    elapsed: () => Math.round(performance.now() - start),
    end: (label: string) => {
      const duration = Math.round(performance.now() - start)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Timer] ${label} - ${duration}ms`)
      }
      return duration
    },
  }
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  return `${(ms / 60000).toFixed(2)}m`
}
