/**
 * @jest-environment node
 */

import { performance } from 'perf_hooks'
import { NextRequest } from 'next/server'
import { generateETag, conditionalResponse, checkConditionalRequest, cachedJsonResponse } from '@/lib/api-cache'

describe('API Caching Performance Benchmarks', () => {
  const ITERATIONS = 1000
  const WARMUP = 100

  function measurePerformance(name: string, times: number[]): {
    mean: number
    median: number
    p95: number
    p99: number
    min: number
    max: number
  } {
    const sorted = times.slice().sort((a, b) => a - b)
    const mean = times.reduce((a, b) => a + b, 0) / times.length
    const median = sorted[Math.floor(sorted.length / 2)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    const p99 = sorted[Math.floor(sorted.length * 0.99)]
    const min = sorted[0]
    const max = sorted[sorted.length - 1]

    console.log(`\n${name} Performance (${times.length} iterations):`)
    console.log(`  Mean: ${mean.toFixed(3)}ms`)
    console.log(`  Median (p50): ${median.toFixed(3)}ms`)
    console.log(`  P95: ${p95.toFixed(3)}ms`)
    console.log(`  P99: ${p99.toFixed(3)}ms`)
    console.log(`  Min: ${min.toFixed(3)}ms`)
    console.log(`  Max: ${max.toFixed(3)}ms`)

    return { mean, median, p95, p99, min, max }
  }

  describe('generateETag performance', () => {
    it('generates ETags efficiently for small objects', () => {
      const data = { id: 1, name: 'Test' }
      const times: number[] = []

      // Warmup
      for (let i = 0; i < WARMUP; i++) {
        generateETag(data)
      }

      // Measure
      for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now()
        generateETag(data)
        const end = performance.now()
        times.push(end - start)
      }

      const stats = measurePerformance('generateETag (small)', times)
      expect(stats.median).toBeLessThan(1) // Should be sub-millisecond
      expect(stats.p95).toBeLessThan(2)
      expect(stats.p99).toBeLessThan(5)
    })

    it('generates ETags efficiently for medium objects', () => {
      const data = Array(50).fill(null).reduce((acc, _, i) => ({
        ...acc,
        [`field${i}`]: `value ${i}`,
      }), {})
      const times: number[] = []

      // Warmup
      for (let i = 0; i < WARMUP; i++) {
        generateETag(data)
      }

      // Measure
      for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now()
        generateETag(data)
        const end = performance.now()
        times.push(end - start)
      }

      const stats = measurePerformance('generateETag (medium)', times)
      expect(stats.median).toBeLessThan(2)
      expect(stats.p95).toBeLessThan(5)
      expect(stats.p99).toBeLessThan(10)
    })

    it('generates ETags efficiently for large objects', () => {
      const data = Array(200).fill(null).map((_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random(),
        nested: { foo: 'bar', baz: i },
      }))
      const times: number[] = []

      // Warmup
      for (let i = 0; i < WARMUP; i++) {
        generateETag(data)
      }

      // Measure
      for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now()
        generateETag(data)
        const end = performance.now()
        times.push(end - start)
      }

      const stats = measurePerformance('generateETag (large)', times)
      expect(stats.median).toBeLessThan(5)
      expect(stats.p95).toBeLessThan(15)
      expect(stats.p99).toBeLessThan(30)
    })
  })

  describe('checkConditionalRequest performance', () => {
    it('checks ETags efficiently for cache hits', () => {
      const etag = '"test-etag-123"'
      const times: number[] = []

      // Warmup
      for (let i = 0; i < WARMUP; i++) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          headers: { 'If-None-Match': etag },
        })
        checkConditionalRequest(request, etag)
      }

      // Measure
      for (let i = 0; i < ITERATIONS; i++) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          headers: { 'If-None-Match': etag },
        })

        const start = performance.now()
        checkConditionalRequest(request, etag)
        const end = performance.now()
        times.push(end - start)
      }

      const stats = measurePerformance('checkConditionalRequest (hit)', times)
      expect(stats.median).toBeLessThan(0.5)
      expect(stats.p95).toBeLessThan(2)
      expect(stats.p99).toBeLessThan(5)
    })

    it('checks ETags efficiently for cache misses', () => {
      const etag = '"test-etag-123"'
      const times: number[] = []

      // Warmup
      for (let i = 0; i < WARMUP; i++) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          headers: { 'If-None-Match': '"stale-etag"' },
        })
        checkConditionalRequest(request, etag)
      }

      // Measure
      for (let i = 0; i < ITERATIONS; i++) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          headers: { 'If-None-Match': '"stale-etag"' },
        })

        const start = performance.now()
        checkConditionalRequest(request, etag)
        const end = performance.now()
        times.push(end - start)
      }

      const stats = measurePerformance('checkConditionalRequest (miss)', times)
      expect(stats.median).toBeLessThan(0.5)
      expect(stats.p95).toBeLessThan(2)
      expect(stats.p99).toBeLessThan(5)
    })
  })

  describe('cachedJsonResponse performance', () => {
    it('creates responses efficiently', () => {
      const data = { id: 1, name: 'Test', items: [1, 2, 3] }
      const times: number[] = []

      // Warmup
      for (let i = 0; i < WARMUP; i++) {
        cachedJsonResponse(data)
      }

      // Measure
      for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now()
        cachedJsonResponse(data)
        const end = performance.now()
        times.push(end - start)
      }

      const stats = measurePerformance('cachedJsonResponse', times)
      expect(stats.median).toBeLessThan(2)
      expect(stats.p95).toBeLessThan(5)
      expect(stats.p99).toBeLessThan(10)
    })
  })

  describe('conditionalResponse performance', () => {
    it('handles 304 responses efficiently', () => {
      const data = { id: 1, name: 'Test', value: 42 }
      const etag = generateETag(data)
      const times: number[] = []

      // Warmup
      for (let i = 0; i < WARMUP; i++) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          headers: { 'If-None-Match': etag },
        })
        conditionalResponse(request, data)
      }

      // Measure
      for (let i = 0; i < ITERATIONS; i++) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          headers: { 'If-None-Match': etag },
        })

        const start = performance.now()
        conditionalResponse(request, data)
        const end = performance.now()
        times.push(end - start)
      }

      const stats = measurePerformance('conditionalResponse (304)', times)
      expect(stats.median).toBeLessThan(2)
      expect(stats.p95).toBeLessThan(5)
      expect(stats.p99).toBeLessThan(10)
    })

    it('handles 200 responses efficiently', () => {
      const data = { id: 1, name: 'Test', value: 42 }
      const times: number[] = []

      // Warmup
      for (let i = 0; i < WARMUP; i++) {
        const request = new NextRequest('http://localhost:3000/api/test')
        conditionalResponse(request, data)
      }

      // Measure
      for (let i = 0; i < ITERATIONS; i++) {
        const request = new NextRequest('http://localhost:3000/api/test')

        const start = performance.now()
        conditionalResponse(request, data)
        const end = performance.now()
        times.push(end - start)
      }

      const stats = measurePerformance('conditionalResponse (200)', times)
      expect(stats.median).toBeLessThan(3)
      expect(stats.p95).toBeLessThan(8)
      expect(stats.p99).toBeLessThan(15)
    })
  })

  describe('Performance comparison', () => {
    it('304 responses should be faster than 200 responses', () => {
      const data = { id: 1, name: 'Test', items: Array(10).fill(0).map((_, i) => ({ id: i })) }
      const etag = generateETag(data)
      const times304: number[] = []
      const times200: number[] = []

      // Warmup
      for (let i = 0; i < WARMUP; i++) {
        const request304 = new NextRequest('http://localhost:3000/api/test', {
          headers: { 'If-None-Match': etag },
        })
        const request200 = new NextRequest('http://localhost:3000/api/test')
        conditionalResponse(request304, data)
        conditionalResponse(request200, data)
      }

      // Measure 304
      for (let i = 0; i < ITERATIONS; i++) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          headers: { 'If-None-Match': etag },
        })
        const start = performance.now()
        conditionalResponse(request, data)
        const end = performance.now()
        times304.push(end - start)
      }

      // Measure 200
      for (let i = 0; i < ITERATIONS; i++) {
        const request = new NextRequest('http://localhost:3000/api/test')
        const start = performance.now()
        conditionalResponse(request, data)
        const end = performance.now()
        times200.push(end - start)
      }

      const median304 = times304.sort((a, b) => a - b)[Math.floor(times304.length / 2)]
      const median200 = times200.sort((a, b) => a - b)[Math.floor(times200.length / 2)]

      console.log(`\nPerformance comparison:`)
      console.log(`  304 Not Modified median: ${median304.toFixed(3)}ms`)
      console.log(`  200 OK median: ${median200.toFixed(3)}ms`)
      console.log(`  304 is ${(median200 / median304).toFixed(2)}x faster`)

      // 304 should be faster or at least not slower
      expect(median304).toBeLessThanOrEqual(median200)
    })
  })

  describe('Throughput calculation', () => {
    it('calculates requests per second', () => {
      const data = { id: 1, name: 'Test' }
      const etag = generateETag(data)
      const duration = 1000 // 1 second
      let count = 0

      const start = performance.now()
      while (performance.now() - start < duration) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          headers: { 'If-None-Match': etag },
        })
        conditionalResponse(request, data)
        count++
      }

      const requestsPerSecond = count
      console.log(`\nThroughput: ${requestsPerSecond.toLocaleString()} requests/second`)

      expect(requestsPerSecond).toBeGreaterThan(1000) // Should handle > 1000 req/s
    })
  })
})
