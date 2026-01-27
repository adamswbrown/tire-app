/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/export/route'

// Mock auth
const mockAuth = jest.fn()
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

// Mock rate limiter
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ success: true, limit: 10, remaining: 9, resetAt: Date.now() + 60000 }),
  getClientIp: () => '127.0.0.1',
}))

// Mock prisma
const mockFindUnique = jest.fn()
const mockFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    application: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}))

// Mock XLSX
const mockBookNew = jest.fn()
const mockJsonToSheet = jest.fn()
const mockBookAppendSheet = jest.fn()
const mockWrite = jest.fn()
jest.mock('xlsx', () => ({
  utils: {
    book_new: () => mockBookNew(),
    json_to_sheet: (...args: unknown[]) => mockJsonToSheet(...args),
    book_append_sheet: (...args: unknown[]) => mockBookAppendSheet(...args),
  },
  write: (...args: unknown[]) => mockWrite(...args),
}))

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/export')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url)
}

describe('GET /api/export', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockBookNew.mockReturnValue({})
    mockJsonToSheet.mockReturnValue({})
    mockWrite.mockReturnValue(Buffer.from('xlsx-data'))
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(makeRequest({ customerId: 'cust-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when customerId is missing', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await GET(makeRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('customerId is required')
  })

  it('returns 404 when customer not found', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockFindUnique.mockResolvedValue(null)
    const res = await GET(makeRequest({ customerId: 'bad-id' }))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Customer not found')
  })

  it('generates xlsx export successfully', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockFindUnique.mockResolvedValue({ id: 'cust-1', name: 'Acme Corp' })
    mockFindMany.mockResolvedValue([
      {
        name: 'App 1',
        assessmentScope: 'In Scope',
        status: 'completed',
        appQuestionsCompleted: true,
        strategyCompleted: true,
        initialTirePlacement: 'Tolerate',
        confirmedTirePlacement: 'Invest',
        dataCenter: 'DC1',
        environment: 'Production',
        completedAt: new Date('2025-01-15'),
        questionnaires: [
          {
            type: 'strategy_questions',
            summary: {
              tireScores: {
                Tolerate: { percentageScore: 60, totalScore: 12 },
                Invest: { percentageScore: 80, totalScore: 16 },
                Replace: { percentageScore: 40, totalScore: 8 },
                Eliminate: { percentageScore: 20, totalScore: 4 },
              },
            },
          },
          {
            type: 'app_questions',
            answers: { q1: 'Yes', q2: ['A', 'B'] },
          },
        ],
      },
    ])

    const res = await GET(makeRequest({ customerId: 'cust-1' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    expect(res.headers.get('Content-Disposition')).toContain('Acme Corp-TIRE-Export')
    expect(res.headers.get('Content-Disposition')).toContain('.xlsx')

    // Should have created 3 sheets (summary, scores, questions)
    expect(mockBookAppendSheet).toHaveBeenCalledTimes(3)
  })

  it('generates csv export with correct content type', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockFindUnique.mockResolvedValue({ id: 'cust-1', name: 'TestCo' })
    mockFindMany.mockResolvedValue([
      {
        name: 'App 1',
        assessmentScope: 'In Scope',
        status: 'not_started',
        appQuestionsCompleted: false,
        strategyCompleted: false,
        initialTirePlacement: null,
        confirmedTirePlacement: null,
        dataCenter: null,
        environment: null,
        completedAt: null,
        questionnaires: [],
      },
    ])

    const res = await GET(makeRequest({ customerId: 'cust-1', format: 'csv' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/csv')
    expect(res.headers.get('Content-Disposition')).toContain('.csv')
  })

  it('skips TIRE scores sheet when no strategy completed', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockFindUnique.mockResolvedValue({ id: 'cust-1', name: 'TestCo' })
    mockFindMany.mockResolvedValue([
      {
        name: 'App 1',
        assessmentScope: 'In Scope',
        status: 'in_progress',
        appQuestionsCompleted: false,
        strategyCompleted: false,
        initialTirePlacement: null,
        confirmedTirePlacement: null,
        dataCenter: null,
        environment: null,
        completedAt: null,
        questionnaires: [],
      },
    ])

    const res = await GET(makeRequest({ customerId: 'cust-1' }))
    expect(res.status).toBe(200)
    // Only summary sheet (no strategy or app question data)
    expect(mockBookAppendSheet).toHaveBeenCalledTimes(1)
  })

  it('returns 500 on unexpected error', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockFindUnique.mockImplementation(() => { throw new Error('db crash') })

    const res = await GET(makeRequest({ customerId: 'cust-1' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to generate export')
  })
})
