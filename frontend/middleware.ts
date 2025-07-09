import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const protectedRoutes = [
  '/chat',
  '/library',
  '/books',
  '/profile',
  '/settings'
]

// Routes that should redirect to home if user is authenticated
const authRoutes = [
  '/login',
  '/register',
  '/reset-password'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if user has access token in cookies
  const accessToken = request.cookies.get('auth-storage')?.value
  const isAuthenticated = accessToken && 
    JSON.parse(accessToken).state?.isAuthenticated

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  // Check if the current route is an auth route
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Redirect to login if accessing protected route without authentication
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect to home if accessing auth routes while authenticated
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}