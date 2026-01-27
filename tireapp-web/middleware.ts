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

  // Add response timing header for observability
  response.headers.set('X-Response-Time', `${Date.now()}`)

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
