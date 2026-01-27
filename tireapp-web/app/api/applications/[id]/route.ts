import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/applications/:id - Get application with questionnaires
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
}

// PATCH /api/applications/:id - Update application
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const application = await prisma.application.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
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
}

// DELETE /api/applications/:id - Delete application
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await prisma.application.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
