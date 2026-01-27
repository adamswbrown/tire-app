import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// GET /api/applications?customerId=xxx - List applications for a customer
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const customerId = request.nextUrl.searchParams.get('customerId')
  if (!customerId) {
    return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
  }

  const applications = await prisma.application.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    include: {
      questionnaires: {
        select: { id: true, type: true, completedAt: true },
      },
      _count: { select: { assessmentHistory: true } },
    },
  })

  return NextResponse.json(applications)
}

// POST /api/applications - Create application(s) from upload or manual entry
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Support single or batch creation
  if (Array.isArray(body.applications)) {
    // Batch creation from Excel upload
    const { customerId, applications } = body
    if (!customerId || !applications.length) {
      return NextResponse.json({ error: 'customerId and applications are required' }, { status: 400 })
    }

    const created = await prisma.application.createMany({
      data: applications.map((app: Record<string, string>) => ({
        customerId,
        name: app.name,
        assessmentScope: app.assessmentScope || 'In Scope',
        dataCenter: app.dataCenter || null,
        environment: app.environment || null,
        server: app.server || null,
        treatment: app.treatment || null,
        solution: app.solution || null,
        powerStatus: app.powerStatus || null,
        os: app.os || null,
        sqlDetected: app.sqlDetected || null,
        vmwareDesc: app.vmwareDesc || null,
      })),
      skipDuplicates: true,
    })

    return NextResponse.json({ count: created.count }, { status: 201 })
  }

  // Single creation
  if (!body.customerId || !body.name) {
    return NextResponse.json({ error: 'customerId and name are required' }, { status: 400 })
  }

  const application = await prisma.application.create({
    data: {
      customerId: body.customerId,
      name: body.name.trim(),
      assessmentScope: body.assessmentScope || 'In Scope',
      dataCenter: body.dataCenter || null,
      environment: body.environment || null,
      server: body.server || null,
    },
  })

  return NextResponse.json(application, { status: 201 })
}
