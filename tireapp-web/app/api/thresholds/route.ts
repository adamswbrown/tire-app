import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { updateThresholdsSchema, formatZodErrors } from '@/lib/validations'
import { conditionalResponse } from '@/lib/api-cache'

// GET /api/thresholds - Get all thresholds
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = checkRateLimit(getClientIp(request.headers), { limit: 60, windowSeconds: 60 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const thresholds = await prisma.threshold.findMany()

    // Return as key-value map with defaults
    const map: Record<string, number> = {
      distributionThreshold: 78,
      tiebreakThreshold: 6,
    }
    for (const t of thresholds) {
      map[t.key] = t.value
    }

    return conditionalResponse(request, map, { maxAge: 300 })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch thresholds' }, { status: 500 })
  }
}

// PUT /api/thresholds - Update thresholds (admin only)
export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = updateThresholdsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 })
  }

  const updates: { key: string; value: number }[] = []
  if (parsed.data.distributionThreshold !== undefined) {
    updates.push({ key: 'distributionThreshold', value: parsed.data.distributionThreshold })
  }
  if (parsed.data.tiebreakThreshold !== undefined) {
    updates.push({ key: 'tiebreakThreshold', value: parsed.data.tiebreakThreshold })
  }

  try {
    for (const { key, value } of updates) {
      await prisma.threshold.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    }

    return NextResponse.json({ success: true, updated: updates })
  } catch {
    return NextResponse.json({ error: 'Failed to update thresholds' }, { status: 500 })
  }
}
