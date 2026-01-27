import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { stripHtml } from '@/lib/sanitize'
import { createCustomerSchema, formatZodErrors } from '@/lib/validations'
import { conditionalResponse } from '@/lib/api-cache'

// GET /api/customers?search=xxx&sort=name|createdAt&order=asc|desc - List customers
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = checkRateLimit(getClientIp(request.headers), { limit: 60, windowSeconds: 60 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const search = request.nextUrl.searchParams.get('search')
  const sort = request.nextUrl.searchParams.get('sort') || 'createdAt'
  const order = request.nextUrl.searchParams.get('order') || 'desc'

  const orderBy: Record<string, string> = {}
  if (sort === 'name' || sort === 'createdAt') {
    orderBy[sort] = order === 'asc' ? 'asc' : 'desc'
  } else {
    orderBy.createdAt = 'desc'
  }

  try {
    const customers = await prisma.customer.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      orderBy,
      include: {
        _count: { select: { applications: true } },
      },
    })

    return conditionalResponse(request, customers)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}

// POST /api/customers - Create a customer
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
  const parsed = createCustomerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 })
  }

  const name = stripHtml(parsed.data.name)
  if (!name) {
    return NextResponse.json({ error: 'Name is required (max 500 characters)' }, { status: 400 })
  }

  try {
    const customer = await prisma.customer.create({
      data: { name },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}
