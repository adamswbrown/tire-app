// Route protection middleware for TIREApp
// Source: M1-ResearchPack.md (Auth.js middleware with RBAC)

import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Protect /app/* routes - require authentication
  if (pathname.startsWith('/app')) {
    if (!session) {
      // Redirect to sign-in with callback URL
      const url = new URL('/api/auth/signin', req.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }
  }

  // Protect /admin/* routes - require Admin role
  if (pathname.startsWith('/admin')) {
    if (!session) {
      // Redirect to sign-in
      const url = new URL('/api/auth/signin', req.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }

    if (session.user?.role !== 'Admin') {
      // Redirect to unauthorized page
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  }

  const response = NextResponse.next()

  // Add observability headers
  response.headers.set('X-Response-Time', `${Date.now()}`)
  response.headers.set('X-Request-Id', crypto.randomUUID())

  // Add CORS headers for API routes
  if (pathname.startsWith('/api')) {
    const origin = req.headers.get('origin')
    const allowedOrigin = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    if (origin === allowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, If-None-Match')
    response.headers.set('Access-Control-Expose-Headers', 'ETag, X-Request-Id, X-Response-Time')
    response.headers.set('Access-Control-Max-Age', '86400')
  }

  return response
})

// Configure which routes to protect
export const config = {
  matcher: [
    '/app/:path*',
    '/admin/:path*',
    '/api/:path*',
  ],
}
