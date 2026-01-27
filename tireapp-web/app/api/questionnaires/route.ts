import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { createQuestionnaireSchema, formatZodErrors } from '@/lib/validations'
import {
  calculateTirePlacement,
  type StrategyQuestion,
} from '@/lib/tire-scoring'
import { conditionalResponse } from '@/lib/api-cache'

// GET /api/questionnaires?applicationId=xxx&type=xxx
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = checkRateLimit(getClientIp(request.headers), { limit: 60, windowSeconds: 60 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const applicationId = request.nextUrl.searchParams.get('applicationId')
  const type = request.nextUrl.searchParams.get('type')

  if (!applicationId) {
    return NextResponse.json({ error: 'applicationId is required' }, { status: 400 })
  }

  try {
    const where: Record<string, string> = { applicationId }
    if (type) where.type = type

    const questionnaires = await prisma.questionnaire.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return conditionalResponse(request, questionnaires)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch questionnaires' }, { status: 500 })
  }
}

// POST /api/questionnaires - Save questionnaire answers
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl2 = checkRateLimit(getClientIp(request.headers), { limit: 20, windowSeconds: 60 })
  if (!rl2.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await request.json()
  const parsed = createQuestionnaireSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 })
  }

  const { applicationId, type, completed } = parsed.data
  const answers = parsed.data.answers as Prisma.InputJsonValue

  try {
    // Calculate summary for strategy questions
    let summary: Prisma.InputJsonValue | undefined = undefined
    let tirePlacement = null
    if (type === 'strategy_questions' && Array.isArray(answers)) {
      const result = calculateTirePlacement(answers as StrategyQuestion[])
      summary = JSON.parse(JSON.stringify({
        totalQuestions: answers.length,
        answeredQuestions: answers.filter(
          (q: StrategyQuestion) => q.clientAnswer && q.clientAnswer !== '-'
        ).length,
        tireScores: result.scores,
      }))
      tirePlacement = result
    }

    // Upsert: create or update questionnaire for this app+type
    const questionnaire = await prisma.questionnaire.upsert({
      where: {
        applicationId_type: { applicationId, type },
      },
      create: {
        applicationId,
        type,
        answers,
        summary,
        completedAt: completed ? new Date() : null,
      },
      update: {
        answers,
        summary,
        completedAt: completed ? new Date() : null,
      },
    })

    // Update application TIRE placement if strategy questions completed
    if (tirePlacement && completed) {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          initialTirePlacement: tirePlacement.initialPlacement,
          confirmedTirePlacement: tirePlacement.confirmedPlacement,
          strategyCompleted: true,
          status: 'completed',
          completedAt: new Date(),
        },
      })
    } else if (type === 'app_questions' && completed) {
      await prisma.application.update({
        where: { id: applicationId },
        data: { appQuestionsCompleted: true },
      })
    }

    return NextResponse.json({
      questionnaire,
      ...(tirePlacement && { tirePlacement }),
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to save questionnaire' }, { status: 500 })
  }
}
