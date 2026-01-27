import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { parseExcelFile } from '@/lib/excel-parser'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// POST /api/upload - Upload Excel file and create applications
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = checkRateLimit(getClientIp(request.headers), { limit: 10, windowSeconds: 60 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const customerId = formData.get('customerId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const result = parseExcelFile(buffer)

    if (result.errors.length > 0 && result.applications.length === 0) {
      return NextResponse.json(
        { error: result.errors.join('; '), errors: result.errors },
        { status: 400 },
      )
    }

    // Create applications in database
    const created = await prisma.application.createMany({
      data: result.applications.map(app => ({
        customerId,
        ...app,
      })),
      skipDuplicates: true,
    })

    return NextResponse.json({
      created: created.count,
      total: result.applications.length,
      duplicatesRemoved: result.duplicatesRemoved,
      warnings: result.errors,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 })
  }
}
