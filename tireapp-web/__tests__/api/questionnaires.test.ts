/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/questionnaires/route'

// Mock auth
const mockAuth = jest.fn()
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

// Mock prisma
const mockFindMany = jest.fn()
const mockUpsert = jest.fn()
const mockAppUpdate = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    questionnaire: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
    application: {
      update: (...args: unknown[]) => mockAppUpdate(...args),
    },
  },
}))

// Mock tire-scoring
jest.mock('@/lib/tire-scoring', () => ({
  calculateTirePlacement: jest.fn().mockReturnValue({
    initialPlacement: 'Invest',
    confirmedPlacement: 'Invest',
    scores: {
      Tolerate: { totalScore: 3, maxPossibleScore: 10, percentageScore: 30, answeredQuestions: 2 },
      Invest: { totalScore: 9, maxPossibleScore: 10, percentageScore: 90, answeredQuestions: 2 },
      Replace: { totalScore: 1, maxPossibleScore: 10, percentageScore: 10, answeredQuestions: 2 },
      Eliminate: { totalScore: 0, maxPossibleScore: 10, percentageScore: 0, answeredQuestions: 2 },
    },
    tiebreakNeeded: false,
    tiedCategories: [],
  }),
}))

const authedSession = { user: { email: 'test@test.com', role: 'Consultant' } }

describe('GET /api/questionnaires', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/questionnaires?applicationId=1')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when applicationId missing', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const req = new NextRequest('http://localhost/api/questionnaires')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns questionnaires for application', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const questionnaires = [{ id: 'q1', type: 'app_questions', answers: {} }]
    mockFindMany.mockResolvedValue(questionnaires)

    const req = new NextRequest('http://localhost/api/questionnaires?applicationId=app-1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(questionnaires)
  })

  it('filters by type when provided', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockFindMany.mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/questionnaires?applicationId=app-1&type=strategy_questions')
    await GET(req)
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { applicationId: 'app-1', type: 'strategy_questions' },
      orderBy: { createdAt: 'desc' },
    })
  })
})

describe('POST /api/questionnaires', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/questionnaires', {
      method: 'POST',
      body: JSON.stringify({ applicationId: '1', type: 'app_questions', answers: {} }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields missing', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const req = new NextRequest('http://localhost/api/questionnaires', {
      method: 'POST',
      body: JSON.stringify({ applicationId: '1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid type', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const req = new NextRequest('http://localhost/api/questionnaires', {
      method: 'POST',
      body: JSON.stringify({ applicationId: '1', type: 'invalid', answers: {} }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('type must be')
  })

  it('saves app_questions and marks complete', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const questionnaire = { id: 'q1', type: 'app_questions', answers: { q1: 'answer' } }
    mockUpsert.mockResolvedValue(questionnaire)
    mockAppUpdate.mockResolvedValue({})

    const req = new NextRequest('http://localhost/api/questionnaires', {
      method: 'POST',
      body: JSON.stringify({
        applicationId: 'app-1',
        type: 'app_questions',
        answers: { q1: 'answer' },
        completed: true,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    // Should update application appQuestionsCompleted flag
    expect(mockAppUpdate).toHaveBeenCalledWith({
      where: { id: 'app-1' },
      data: { appQuestionsCompleted: true },
    })
  })

  it('saves strategy_questions with TIRE scoring', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const questionnaire = { id: 'q2', type: 'strategy_questions' }
    mockUpsert.mockResolvedValue(questionnaire)
    mockAppUpdate.mockResolvedValue({})

    const strategyAnswers = [
      { time: 'Invest', weight: 5, clientAnswer: 'Yes', clientScore: 5 },
    ]

    const req = new NextRequest('http://localhost/api/questionnaires', {
      method: 'POST',
      body: JSON.stringify({
        applicationId: 'app-1',
        type: 'strategy_questions',
        answers: strategyAnswers,
        completed: true,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.tirePlacement).toBeDefined()
    expect(body.tirePlacement.confirmedPlacement).toBe('Invest')
    // Should update application with TIRE placement
    expect(mockAppUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'app-1' },
      data: expect.objectContaining({
        initialTirePlacement: 'Invest',
        strategyCompleted: true,
        status: 'completed',
      }),
    }))
  })

  it('does not update application when not completed', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockUpsert.mockResolvedValue({ id: 'q1' })

    const req = new NextRequest('http://localhost/api/questionnaires', {
      method: 'POST',
      body: JSON.stringify({
        applicationId: 'app-1',
        type: 'app_questions',
        answers: { q1: 'draft' },
        completed: false,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(mockAppUpdate).not.toHaveBeenCalled()
  })
})
