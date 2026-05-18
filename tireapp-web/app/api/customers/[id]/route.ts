import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

type RouteParams = { params: Promise<{ id: string }> }

// DELETE /api/customers/:id - Delete a customer (and all related applications via cascade)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const rl = checkRateLimit(getClientIp(request.headers), { limit: 20, windowSeconds: 60 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const { id } = await params

    const existing = await prisma.customer.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    await prisma.customer.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}
