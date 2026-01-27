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
const mockCount = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    application: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      createMany: (...args: unknown[]) => mockCreateMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}))

const authedSession = { user: { email: 'test@test.com', role: 'Consultant' } }

describe('Applications API - Error handling edge cases', () => {
  beforeEach(() => jest.clearAllMocks())

  it('GET /api/applications returns 500 on database error', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockFindMany.mockRejectedValue(new Error('DB connection lost'))

    const req = new NextRequest('http://localhost/api/applications?customerId=cust-1')
    const res = await GET(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to fetch applications')
  })

  it('POST /api/applications returns 500 on database error (single)', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockCreate.mockRejectedValue(new Error('Unique constraint violation'))

    const req = new NextRequest('http://localhost/api/applications', {
      method: 'POST',
      body: JSON.stringify({ customerId: 'cust-1', name: 'Test' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to create application(s)')
  })

  it('POST /api/applications returns 500 on database error (batch)', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockCreateMany.mockRejectedValue(new Error('DB timeout'))

    const req = new NextRequest('http://localhost/api/applications', {
      method: 'POST',
      body: JSON.stringify({
        customerId: 'cust-1',
        applications: [{ name: 'App1' }, { name: 'App2' }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })

  it('POST /api/applications returns 400 for empty batch', async () => {
    mockAuth.mockResolvedValue(authedSession)

    const req = new NextRequest('http://localhost/api/applications', {
      method: 'POST',
      body: JSON.stringify({
        customerId: 'cust-1',
        applications: [],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('GET /api/applications/:id returns 500 on database error', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockFindUnique.mockRejectedValue(new Error('DB error'))

    const req = new NextRequest('http://localhost/api/applications/1')
    const res = await GET_BY_ID(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to fetch application')
  })

  it('PATCH /api/applications/:id returns 500 on update error', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockFindUnique.mockResolvedValue({ id: '1', name: 'App' })
    mockUpdate.mockRejectedValue(new Error('Update failed'))

    const req = new NextRequest('http://localhost/api/applications/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to update application')
  })

  it('DELETE /api/applications/:id returns 500 on delete error', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockFindUnique.mockResolvedValue({ id: '1', name: 'App' })
    mockDelete.mockRejectedValue(new Error('FK constraint'))

    const req = new NextRequest('http://localhost/api/applications/1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to delete application')
  })

  it('PATCH accepts boolean fields like appQuestionsCompleted', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockFindUnique.mockResolvedValue({ id: '1', name: 'App' })
    const updated = { id: '1', name: 'App', appQuestionsCompleted: true }
    mockUpdate.mockResolvedValue(updated)

    const req = new NextRequest('http://localhost/api/applications/1', {
      method: 'PATCH',
      body: JSON.stringify({ appQuestionsCompleted: true }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: '1' },
      data: expect.objectContaining({ appQuestionsCompleted: true }),
    })
  })

  it('POST batch creation maps optional fields correctly', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockCreateMany.mockResolvedValue({ count: 1 })

    const req = new NextRequest('http://localhost/api/applications', {
      method: 'POST',
      body: JSON.stringify({
        customerId: 'cust-1',
        applications: [{
          name: 'Full App',
          assessmentScope: 'Out of Scope',
          dataCenter: 'DC1',
          environment: 'Production',
          server: 'srv-01',
          treatment: 'Migrate',
          solution: 'Cloud',
          powerStatus: 'On',
          os: 'Linux',
          sqlDetected: 'Yes',
          vmwareDesc: 'VM1',
        }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(mockCreateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({
          name: 'Full App',
          dataCenter: 'DC1',
          environment: 'Production',
          os: 'Linux',
        }),
      ]),
    }))
  })
})
