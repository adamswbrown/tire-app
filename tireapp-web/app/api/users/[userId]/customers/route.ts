import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// GET /api/users/[userId]/customers - List assigned customers for user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { userId } = await params

  try {
    const assignments = await prisma.userCustomer.findMany({
      where: { userId },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
    })

    return NextResponse.json(assignments.map(a => ({
      id: a.id,
      customerId: a.customerId,
      customerName: a.customer.name,
      assignedAt: a.assignedAt,
    })))
  } catch {
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
  }
}

// POST /api/users/[userId]/customers - Assign customer to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { userId } = await params
  const body = await request.json()
  const { customerId } = body

  if (!customerId) {
    return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
  }

  try {
    // Check if already assigned
    const existing = await prisma.userCustomer.findUnique({
      where: { userId_customerId: { userId, customerId } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Customer already assigned to user' }, { status: 409 })
    }

    const assignment = await prisma.userCustomer.create({
      data: { userId, customerId },
      include: {
        customer: { select: { name: true } },
      },
    })

    return NextResponse.json({
      id: assignment.id,
      customerId: assignment.customerId,
      customerName: assignment.customer.name,
      assignedAt: assignment.assignedAt,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to assign customer' }, { status: 500 })
  }
}

// DELETE /api/users/[userId]/customers - Remove customer assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { userId } = await params
  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customerId')

  if (!customerId) {
    return NextResponse.json({ error: 'customerId query param is required' }, { status: 400 })
  }

  try {
    await prisma.userCustomer.delete({
      where: { userId_customerId: { userId, customerId } },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to remove assignment' }, { status: 500 })
  }
}
