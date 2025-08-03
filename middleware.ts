import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get the pathname of the request (e.g. /login, /dashboard)
  const path = request.nextUrl.pathname

  // Skip middleware for API routes (they're handled by backend)
  if (path.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Since we're using localStorage for tokens (client-side only),
  // we can't check authentication in middleware.
  // Authentication checks will be handled client-side by AuthContext
  
  return NextResponse.next()
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}