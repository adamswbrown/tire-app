import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { createApplicationSchema, batchCreateApplicationsSchema, formatZodErrors } from '@/lib/validations'

// GET /api/applications?customerId=xxx&page=1&limit=50&sort=name|createdAt&order=asc|desc&search=xxx
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

  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '50', 10)))
  const skip = (page - 1) * limit
  const sort = request.nextUrl.searchParams.get('sort') || 'createdAt'
  const order = request.nextUrl.searchParams.get('order') || 'desc'
  const search = request.nextUrl.searchParams.get('search')

  const orderBy: Record<string, string> = {}
  if (['name', 'createdAt', 'status'].includes(sort)) {
    orderBy[sort] = order === 'asc' ? 'asc' : 'desc'
  } else {
    orderBy.createdAt = 'desc'
  }

  const where: Record<string, unknown> = { customerId }
  if (search) {
    where.name = { contains: search, mode: 'insensitive' }
  }

  try {
    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          questionnaires: {
            select: { id: true, type: true, completedAt: true },
          },
          _count: { select: { assessmentHistory: true } },
        },
      }),
      prisma.application.count({ where }),
    ])

    return NextResponse.json({
      data: applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
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
      const parsed = batchCreateApplicationsSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 })
      }

      const { customerId, applications } = parsed.data
      const created = await prisma.application.createMany({
        data: applications.map((app) => ({
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
    const parsed = createApplicationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 })
    }

    const application = await prisma.application.create({
      data: {
        customerId: parsed.data.customerId,
        name: parsed.data.name,
        assessmentScope: parsed.data.assessmentScope || 'In Scope',
        dataCenter: parsed.data.dataCenter || null,
        environment: parsed.data.environment || null,
        server: parsed.data.server || null,
      },
    })

    return NextResponse.json(application, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create application(s)' }, { status: 500 })
  }
}
