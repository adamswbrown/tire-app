import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { updateApplicationSchema, formatZodErrors } from '@/lib/validations'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/applications/:id - Get application with questionnaires
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = checkRateLimit(getClientIp(request.headers), { limit: 60, windowSeconds: 60 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const { id } = await params
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        questionnaires: true,
        assessmentHistory: { orderBy: { createdAt: 'desc' } },
        customer: { select: { id: true, name: true } },
      },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    return NextResponse.json(application)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 })
  }
}

// PATCH /api/applications/:id - Update application
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = checkRateLimit(getClientIp(request.headers), { limit: 20, windowSeconds: 60 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { id } = await params
  const body = await request.json()

  const parsed = updateApplicationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 })
  }

  try {
    const existing = await prisma.application.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const data = parsed.data
    const application = await prisma.application.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.assessmentScope !== undefined && { assessmentScope: data.assessmentScope }),
        ...(data.initialTirePlacement !== undefined && { initialTirePlacement: data.initialTirePlacement }),
        ...(data.confirmedTirePlacement !== undefined && { confirmedTirePlacement: data.confirmedTirePlacement }),
        ...(data.appQuestionsCompleted !== undefined && { appQuestionsCompleted: data.appQuestionsCompleted }),
        ...(data.strategyCompleted !== undefined && { strategyCompleted: data.strategyCompleted }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
      },
    })

    return NextResponse.json(application)
  } catch {
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
  }
}

// DELETE /api/applications/:id - Delete application
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = checkRateLimit(getClientIp(request.headers), { limit: 20, windowSeconds: 60 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const { id } = await params

    const existing = await prisma.application.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    await prisma.application.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 })
  }
}
