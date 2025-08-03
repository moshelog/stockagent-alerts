import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get the pathname of the request (e.g. /login, /dashboard)
  const path = request.nextUrl.pathname

  // Define public paths that don't require authentication
  const isPublicPath = path === '/login'

  // Get the token from the cookies
  const token = request.cookies.get('authToken')?.value || ''

  // If trying to access login while authenticated, redirect to dashboard
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL('/', request.nextUrl))
  }

  // If trying to access protected route without token, redirect to login
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/login', request.nextUrl))
  }

  // For API routes, check authentication
  if (path.startsWith('/api/') && !path.startsWith('/api/auth/')) {
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
  }

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