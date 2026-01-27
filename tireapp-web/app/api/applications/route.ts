import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// GET /api/applications?customerId=xxx - List applications for a customer
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = checkRateLimit(getClientIp(request.headers), { limit: 60, windowSeconds: 60 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const customerId = request.nextUrl.searchParams.get('customerId')
  if (!customerId) {
    return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
  }

  try {
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
  } catch {
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
  }
}

// POST /api/applications - Create application(s) from upload or manual entry
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = checkRateLimit(getClientIp(request.headers), { limit: 20, windowSeconds: 60 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await request.json()

  try {
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
  } catch {
    return NextResponse.json({ error: 'Failed to create application(s)' }, { status: 500 })
  }
}
