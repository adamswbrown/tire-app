import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

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

    return NextResponse.json(map)
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
  const updates: { key: string; value: number }[] = []

  if (typeof body.distributionThreshold === 'number') {
    if (body.distributionThreshold < 0 || body.distributionThreshold > 100) {
      return NextResponse.json({ error: 'distributionThreshold must be between 0 and 100' }, { status: 400 })
    }
    updates.push({ key: 'distributionThreshold', value: body.distributionThreshold })
  }
  if (typeof body.tiebreakThreshold === 'number') {
    if (body.tiebreakThreshold < 0 || body.tiebreakThreshold > 100) {
      return NextResponse.json({ error: 'tiebreakThreshold must be between 0 and 100' }, { status: 400 })
    }
    updates.push({ key: 'tiebreakThreshold', value: body.tiebreakThreshold })
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No valid thresholds provided' }, { status: 400 })
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
