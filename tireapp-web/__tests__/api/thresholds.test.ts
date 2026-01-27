/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, PUT } from '@/app/api/thresholds/route'

const mockAuth = jest.fn()
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

const mockFindMany = jest.fn()
const mockUpsert = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    threshold: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}))

const adminSession = { user: { email: 'admin@test.com', role: 'Admin' } }
const consultantSession = { user: { email: 'user@test.com', role: 'Consultant' } }

describe('GET /api/thresholds', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns defaults when no thresholds stored', async () => {
    mockAuth.mockResolvedValue(consultantSession)
    mockFindMany.mockResolvedValue([])

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.distributionThreshold).toBe(78)
    expect(body.tiebreakThreshold).toBe(6)
  })

  it('returns stored thresholds overriding defaults', async () => {
    mockAuth.mockResolvedValue(consultantSession)
    mockFindMany.mockResolvedValue([
      { key: 'distributionThreshold', value: 85 },
    ])

    const res = await GET()
    const body = await res.json()
    expect(body.distributionThreshold).toBe(85)
    expect(body.tiebreakThreshold).toBe(6) // still default
  })
})

describe('PUT /api/thresholds', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/thresholds', {
      method: 'PUT',
      body: JSON.stringify({ distributionThreshold: 80 }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    mockAuth.mockResolvedValue(consultantSession)
    const req = new NextRequest('http://localhost/api/thresholds', {
      method: 'PUT',
      body: JSON.stringify({ distributionThreshold: 80 }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when no valid thresholds provided', async () => {
    mockAuth.mockResolvedValue(adminSession)
    const req = new NextRequest('http://localhost/api/thresholds', {
      method: 'PUT',
      body: JSON.stringify({ invalidField: 123 }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('updates distribution threshold for admin', async () => {
    mockAuth.mockResolvedValue(adminSession)
    mockUpsert.mockResolvedValue({})

    const req = new NextRequest('http://localhost/api/thresholds', {
      method: 'PUT',
      body: JSON.stringify({ distributionThreshold: 85 }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { key: 'distributionThreshold' },
      create: { key: 'distributionThreshold', value: 85 },
      update: { value: 85 },
    })
  })

  it('updates both thresholds at once', async () => {
    mockAuth.mockResolvedValue(adminSession)
    mockUpsert.mockResolvedValue({})

    const req = new NextRequest('http://localhost/api/thresholds', {
      method: 'PUT',
      body: JSON.stringify({ distributionThreshold: 80, tiebreakThreshold: 10 }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledTimes(2)
  })
})
