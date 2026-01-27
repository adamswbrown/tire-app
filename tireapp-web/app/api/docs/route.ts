import { NextResponse } from 'next/server'
import { openApiSpec } from '@/lib/openapi'

// GET /api/docs - Serve OpenAPI specification (no auth required)
export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
