import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// GET /api/customers - List all customers
export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { applications: true } },
    },
  })

  return NextResponse.json(customers)
}

// POST /api/customers - Create a customer
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const customer = await prisma.customer.create({
    data: { name: body.name.trim() },
  })

  return NextResponse.json(customer, { status: 201 })
}
