/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/users/route'

const mockAuth = jest.fn()
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

const mockFindMany = jest.fn()
const mockUpdate = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}))

const adminSession = { user: { email: 'admin@test.com', role: 'Admin' } }
const consultantSession = { user: { email: 'user@test.com', role: 'Consultant' } }

describe('GET /api/users', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    mockAuth.mockResolvedValue(consultantSession)
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('returns user list for admin', async () => {
    mockAuth.mockResolvedValue(adminSession)
    const users = [
      { id: '1', name: 'Admin', email: 'admin@test.com', role: 'Admin', createdAt: new Date() },
      { id: '2', name: 'User', email: 'user@test.com', role: 'Consultant', createdAt: new Date() },
    ]
    mockFindMany.mockResolvedValue(users)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
    expect(mockFindMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
  })
})

describe('PATCH /api/users', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: '1', role: 'Admin' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    mockAuth.mockResolvedValue(consultantSession)
    const req = new NextRequest('http://localhost/api/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: '1', role: 'Admin' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when userId or role missing', async () => {
    mockAuth.mockResolvedValue(adminSession)
    const req = new NextRequest('http://localhost/api/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: '1' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid role', async () => {
    mockAuth.mockResolvedValue(adminSession)
    const req = new NextRequest('http://localhost/api/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: '1', role: 'SuperAdmin' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid role')
  })

  it('updates user role for admin', async () => {
    mockAuth.mockResolvedValue(adminSession)
    const updatedUser = { id: '2', name: 'User', email: 'user@test.com', role: 'Viewer' }
    mockUpdate.mockResolvedValue(updatedUser)

    const req = new NextRequest('http://localhost/api/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: '2', role: 'Viewer' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.role).toBe('Viewer')
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: '2' },
      data: { role: 'Viewer' },
      select: { id: true, name: true, email: true, role: true },
    })
  })

  it('accepts all valid roles', async () => {
    mockAuth.mockResolvedValue(adminSession)
    mockUpdate.mockResolvedValue({ id: '2', role: 'Consultant' })

    for (const role of ['Admin', 'Consultant', 'Viewer']) {
      const req = new NextRequest('http://localhost/api/users', {
        method: 'PATCH',
        body: JSON.stringify({ userId: '2', role }),
      })
      const res = await PATCH(req)
      expect(res.status).toBe(200)
    }
    expect(mockUpdate).toHaveBeenCalledTimes(3)
  })
})
