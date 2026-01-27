/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/upload/route'

// Mock auth
const mockAuth = jest.fn()
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

// Mock excel parser
const mockParseExcelFile = jest.fn()
jest.mock('@/lib/excel-parser', () => ({
  parseExcelFile: (...args: unknown[]) => mockParseExcelFile(...args),
}))

// Mock prisma
const mockCreateMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    application: {
      createMany: (...args: unknown[]) => mockCreateMany(...args),
    },
  },
}))

function makeFormData(fields: Record<string, string | Blob>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value)
  }
  return formData
}

function makeRequest(formData: FormData) {
  return new NextRequest('http://localhost/api/upload', {
    method: 'POST',
    body: formData,
  })
}

describe('POST /api/upload', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const formData = makeFormData({ customerId: 'cust-1' })
    const res = await POST(makeRequest(formData))
    expect(res.status).toBe(401)
  })

  it('returns 400 when no file provided', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const formData = makeFormData({ customerId: 'cust-1' })
    const res = await POST(makeRequest(formData))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('No file provided')
  })

  it('returns 400 when no customerId provided', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const file = new Blob(['data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const formData = makeFormData({ file: file })
    const res = await POST(makeRequest(formData))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('customerId is required')
  })

  it('returns 400 when parser finds only errors', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockParseExcelFile.mockReturnValue({
      applications: [],
      errors: ['Invalid format', 'Missing header'],
      duplicatesRemoved: 0,
    })

    const file = new Blob(['data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const formData = new FormData()
    formData.append('file', file, 'test.xlsx')
    formData.append('customerId', 'cust-1')

    const res = await POST(makeRequest(formData))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid format; Missing header')
    expect(body.errors).toEqual(['Invalid format', 'Missing header'])
  })

  it('creates applications and returns 201', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockParseExcelFile.mockReturnValue({
      applications: [
        { name: 'App 1', dataCenter: 'DC1' },
        { name: 'App 2', dataCenter: 'DC2' },
      ],
      errors: [],
      duplicatesRemoved: 1,
    })
    mockCreateMany.mockResolvedValue({ count: 2 })

    const file = new Blob(['data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const formData = new FormData()
    formData.append('file', file, 'test.xlsx')
    formData.append('customerId', 'cust-1')

    const res = await POST(makeRequest(formData))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.created).toBe(2)
    expect(body.total).toBe(2)
    expect(body.duplicatesRemoved).toBe(1)

    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        { customerId: 'cust-1', name: 'App 1', dataCenter: 'DC1' },
        { customerId: 'cust-1', name: 'App 2', dataCenter: 'DC2' },
      ],
      skipDuplicates: true,
    })
  })

  it('returns warnings when some apps parse with errors', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockParseExcelFile.mockReturnValue({
      applications: [{ name: 'App 1' }],
      errors: ['Row 5: missing server name'],
      duplicatesRemoved: 0,
    })
    mockCreateMany.mockResolvedValue({ count: 1 })

    const file = new Blob(['data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const formData = new FormData()
    formData.append('file', file, 'test.xlsx')
    formData.append('customerId', 'cust-1')

    const res = await POST(makeRequest(formData))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.created).toBe(1)
    expect(body.warnings).toEqual(['Row 5: missing server name'])
  })

  it('returns 500 on unexpected error', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })

    const file = new Blob(['data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const formData = new FormData()
    formData.append('file', file, 'test.xlsx')
    formData.append('customerId', 'cust-1')

    mockParseExcelFile.mockImplementation(() => { throw new Error('parse crash') })

    const res = await POST(makeRequest(formData))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to process upload')
  })
})
