/**
 * @jest-environment node
 */
import { GET } from '@/app/api/health/route'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}))

import { prisma } from '@/lib/prisma'

describe('GET /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 200 when database is connected', async () => {
    ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.database.connected).toBe(true)
    expect(typeof data.database.latency).toBe('number')
    expect(data.timestamp).toBeDefined()
    expect(typeof data.uptime).toBe('number')
  })

  it('returns 503 when database is disconnected', async () => {
    ;(prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection failed'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('unhealthy')
    expect(data.database.connected).toBe(false)
  })

  it('includes memory usage in response', async () => {
    ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }])

    const response = await GET()
    const data = await response.json()

    expect(typeof data.memory.used).toBe('number')
    expect(typeof data.memory.total).toBe('number')
    expect(typeof data.memory.percent).toBe('number')
    expect(data.memory.used).toBeGreaterThan(0)
    expect(data.memory.total).toBeGreaterThan(0)
    expect(data.memory.percent).toBeGreaterThan(0)
    expect(data.memory.percent).toBeLessThanOrEqual(100)
  })

  it('includes uptime in response', async () => {
    ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }])

    const response = await GET()
    const data = await response.json()

    expect(data.uptime).toBeGreaterThan(0)
  })

  it('includes ISO timestamp', async () => {
    ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }])

    const response = await GET()
    const data = await response.json()

    expect(() => new Date(data.timestamp)).not.toThrow()
    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp)
  })
})
