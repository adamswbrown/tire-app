import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

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

  const { id } = await params
  const body = await request.json()

  // Validate name length if provided
  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.length > 500)) {
    return NextResponse.json({ error: 'Name must be a non-empty string under 500 characters' }, { status: 400 })
  }

  try {
    const existing = await prisma.application.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const application = await prisma.application.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.assessmentScope !== undefined && { assessmentScope: body.assessmentScope }),
        ...(body.initialTirePlacement !== undefined && { initialTirePlacement: body.initialTirePlacement }),
        ...(body.confirmedTirePlacement !== undefined && { confirmedTirePlacement: body.confirmedTirePlacement }),
        ...(body.appQuestionsCompleted !== undefined && { appQuestionsCompleted: body.appQuestionsCompleted }),
        ...(body.strategyCompleted !== undefined && { strategyCompleted: body.strategyCompleted }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.completedAt !== undefined && { completedAt: body.completedAt }),
      },
    })

    return NextResponse.json(application)
  } catch {
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
  }
}

// DELETE /api/applications/:id - Delete application
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
