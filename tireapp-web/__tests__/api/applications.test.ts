/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/applications/route'
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/applications/[id]/route'

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
const mockFindUnique = jest.fn()
const mockCreate = jest.fn()
const mockCreateMany = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    application: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      createMany: (...args: unknown[]) => mockCreateMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}))

const authedSession = { user: { email: 'test@test.com', role: 'Consultant' } }

describe('GET /api/applications', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/applications')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when customerId missing', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const req = new NextRequest('http://localhost/api/applications')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('customerId is required')
  })

  it('returns applications for customer', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const apps = [{ id: '1', name: 'App1' }]
    mockFindMany.mockResolvedValue(apps)

    const req = new NextRequest('http://localhost/api/applications?customerId=cust-1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { customerId: 'cust-1' },
      orderBy: { createdAt: 'desc' },
      include: {
        questionnaires: { select: { id: true, type: true, completedAt: true } },
        _count: { select: { assessmentHistory: true } },
      },
    })
  })
})

describe('POST /api/applications', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/applications', {
      method: 'POST',
      body: JSON.stringify({ customerId: '1', name: 'Test' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('creates single application', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const app = { id: '1', name: 'New App', customerId: 'cust-1' }
    mockCreate.mockResolvedValue(app)

    const req = new NextRequest('http://localhost/api/applications', {
      method: 'POST',
      body: JSON.stringify({ customerId: 'cust-1', name: ' New App ' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        customerId: 'cust-1',
        name: 'New App',
      }),
    }))
  })

  it('creates batch applications from array', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockCreateMany.mockResolvedValue({ count: 2 })

    const req = new NextRequest('http://localhost/api/applications', {
      method: 'POST',
      body: JSON.stringify({
        customerId: 'cust-1',
        applications: [
          { name: 'App 1', assessmentScope: 'In Scope' },
          { name: 'App 2', assessmentScope: 'Out of Scope' },
        ],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.count).toBe(2)
  })

  it('returns 400 for single creation without customerId', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const req = new NextRequest('http://localhost/api/applications', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for batch creation without customerId', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const req = new NextRequest('http://localhost/api/applications', {
      method: 'POST',
      body: JSON.stringify({ applications: [{ name: 'Test' }] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('GET /api/applications/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/applications/1')
    const res = await GET_BY_ID(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when application not found', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockFindUnique.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/applications/missing')
    const res = await GET_BY_ID(req, { params: Promise.resolve({ id: 'missing' }) })
    expect(res.status).toBe(404)
  })

  it('returns application with relations', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const app = { id: '1', name: 'Test App', questionnaires: [], assessmentHistory: [], customer: { id: 'c1', name: 'Customer' } }
    mockFindUnique.mockResolvedValue(app)

    const req = new NextRequest('http://localhost/api/applications/1')
    const res = await GET_BY_ID(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('Test App')
  })
})

describe('PATCH /api/applications/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/applications/1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when application not found', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockFindUnique.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/applications/1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'missing' }) })
    expect(res.status).toBe(404)
  })

  it('returns 400 for empty name', async () => {
    mockAuth.mockResolvedValue(authedSession)

    const req = new NextRequest('http://localhost/api/applications/1', {
      method: 'PATCH',
      body: JSON.stringify({ name: '   ' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 400 for name over 500 chars', async () => {
    mockAuth.mockResolvedValue(authedSession)

    const req = new NextRequest('http://localhost/api/applications/1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'x'.repeat(501) }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(400)
  })

  it('updates application fields selectively', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockFindUnique.mockResolvedValue({ id: '1', name: 'Old' })
    const updated = { id: '1', name: 'Updated', status: 'in_progress' }
    mockUpdate.mockResolvedValue(updated)

    const req = new NextRequest('http://localhost/api/applications/1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated', confirmedTirePlacement: 'Invest' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: '1' },
      data: expect.objectContaining({
        name: 'Updated',
        confirmedTirePlacement: 'Invest',
      }),
    })
  })
})

describe('DELETE /api/applications/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/applications/1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when application not found', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockFindUnique.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/applications/missing', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'missing' }) })
    expect(res.status).toBe(404)
  })

  it('deletes application successfully', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockFindUnique.mockResolvedValue({ id: '1', name: 'App' })
    mockDelete.mockResolvedValue({ id: '1' })

    const req = new NextRequest('http://localhost/api/applications/1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: '1' } })
  })
})
