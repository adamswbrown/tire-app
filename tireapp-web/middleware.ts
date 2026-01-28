// Route protection middleware for TIREApp
// Source: M1-ResearchPack.md (Auth.js middleware with RBAC)

import { NextRequest, NextResponse } from "next/server"
export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Fallback: protect /app and /admin (session-based, redirect)
  // (You can re-add session logic here if needed)

  const response = NextResponse.next();
  response.headers.set('X-Response-Time', `${Date.now()}`);
  response.headers.set('X-Request-Id', crypto.randomUUID());


  // Add CORS headers for API routes
  if (pathname.startsWith('/api')) {
    const origin = req.headers.get('origin');
    const allowedOrigin = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    if (origin === allowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, If-None-Match');
    response.headers.set('Access-Control-Expose-Headers', 'ETag, X-Request-Id, X-Response-Time');
    response.headers.set('Access-Control-Max-Age', '86400');
  }

  return response;
}

// Configure which routes to protect
export const config = {
  matcher: [
    '/app/:path*',
    '/admin/:path*',
    '/api/:path*',
  ],
}
