import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import os from 'os'

// GET /api/health - Health check endpoint (no auth required)
export async function GET() {
  const health: {
    status: string
    timestamp: string
    database: {
      connected: boolean
      latency?: number
    }
    uptime: number
    memory: {
      used: number
      total: number
      percent: number
    }
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: { connected: false },
    uptime: process.uptime(),
    memory: { used: 0, total: 0, percent: 0 },
  }

  // Database connectivity check with latency measurement
  try {
    const start = performance.now()
    await prisma.$queryRaw`SELECT 1`
    const latency = Math.round(performance.now() - start)
    health.database = { connected: true, latency }
  } catch {
    health.database = { connected: false }
    health.status = 'unhealthy'
  }

  // Memory usage
  const mem = process.memoryUsage()
  const totalMem = os.totalmem()
  health.memory = {
    used: mem.rss,
    total: totalMem,
    percent: (mem.rss / totalMem) * 100,
  }

  const statusCode = health.status === 'healthy' ? 200 : 503
  return NextResponse.json(health, { status: statusCode })
}
