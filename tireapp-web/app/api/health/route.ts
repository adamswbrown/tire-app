import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/health - Health check endpoint (no auth required)
export async function GET() {
  const health: {
    status: string
    timestamp: string
    database: string
    uptime: number
  } = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'unknown',
    uptime: process.uptime(),
  }

  try {
    // Test database connectivity with a simple query
    await prisma.$queryRaw`SELECT 1`
    health.database = 'connected'
  } catch {
    health.database = 'disconnected'
    health.status = 'degraded'
  }

  const statusCode = health.status === 'ok' ? 200 : 503
  return NextResponse.json(health, { status: statusCode })
}
