import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { updateUserRoleSchema, formatZodErrors } from '@/lib/validations'
import { conditionalResponse } from '@/lib/api-cache'
import bcrypt from 'bcrypt'

// GET /api/users - List all users (admin only)
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const rl = checkRateLimit(getClientIp(request.headers), { limit: 60, windowSeconds: 60 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    return conditionalResponse(request, users)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST /api/users - Create user (admin only)
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const { email, name, role, password } = body

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  // Validate role
  const validRoles = ['Admin', 'Consultant', 'Viewer']
  const userRole = validRoles.includes(role) ? role : 'Consultant'

  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
    }

    // Hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null

    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        role: userRole,
        password: hashedPassword,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })

    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

// PATCH /api/users - Update user role (admin only)
export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = updateUserRoleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 })
  }

  const { userId, role } = parsed.data

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    })

    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 })
  }
}
