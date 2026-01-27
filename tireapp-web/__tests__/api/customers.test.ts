/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/customers/route'

// Mock auth
const mockAuth = jest.fn()
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

// Mock rate limiter
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ success: true, limit: 60, remaining: 59, resetAt: Date.now() + 60000 }),
  getClientIp: () => '127.0.0.1',
}))

// Mock prisma
const mockFindMany = jest.fn()
const mockCreate = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}))

describe('GET /api/customers', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/customers')
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns customers list when authenticated', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const customers = [
      { id: '1', name: 'Acme', _count: { applications: 3 } },
      { id: '2', name: 'Globex', _count: { applications: 1 } },
    ]
    mockFindMany.mockResolvedValue(customers)

    const req = new NextRequest('http://localhost/api/customers')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(customers)
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { applications: true } } },
    }))
  })

  it('filters customers by search term', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockFindMany.mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/customers?search=acme')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { name: { contains: 'acme', mode: 'insensitive' } },
    }))
  })

  it('sorts customers by name ascending', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockFindMany.mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/customers?sort=name&order=asc')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { name: 'asc' },
    }))
  })

  it('returns ETag and Cache-Control headers', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockFindMany.mockResolvedValue([{ id: '1', name: 'Test' }])

    const req = new NextRequest('http://localhost/api/customers')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('ETag')).toMatch(/^"[a-f0-9]{32}"$/)
    expect(res.headers.get('Cache-Control')).toBe('private, no-cache')
    expect(res.headers.get('Vary')).toBe('Authorization')
  })

  it('returns 304 when ETag matches If-None-Match', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const data = [{ id: '1', name: 'Test' }]
    mockFindMany.mockResolvedValue(data)

    // First request to get ETag
    const req1 = new NextRequest('http://localhost/api/customers')
    const res1 = await GET(req1)
    const etag = res1.headers.get('ETag')!

    // Second request with matching ETag
    const req2 = new NextRequest('http://localhost/api/customers', {
      headers: { 'If-None-Match': etag },
    })
    const res2 = await GET(req2)
    expect(res2.status).toBe(304)
  })

  it('returns 200 when ETag does not match If-None-Match', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockFindMany.mockResolvedValue([{ id: '1', name: 'Changed' }])

    const req = new NextRequest('http://localhost/api/customers', {
      headers: { 'If-None-Match': '"stale-etag"' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('ETag')).toMatch(/^"[a-f0-9]{32}"$/)
  })
})

describe('POST /api/customers', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/customers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is missing', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const req = new NextRequest('http://localhost/api/customers', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('name')
  })

  it('returns 400 when name is not a string', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const req = new NextRequest('http://localhost/api/customers', {
      method: 'POST',
      body: JSON.stringify({ name: 123 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('creates customer with trimmed name', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const customer = { id: '1', name: 'New Customer', createdAt: new Date() }
    mockCreate.mockResolvedValue(customer)

    const req = new NextRequest('http://localhost/api/customers', {
      method: 'POST',
      body: JSON.stringify({ name: '  New Customer  ' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(mockCreate).toHaveBeenCalledWith({
      data: { name: 'New Customer' },
    })
  })
})
