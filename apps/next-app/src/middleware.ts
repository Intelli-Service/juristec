import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Admin routes - require super_admin or moderator role
    if (pathname.startsWith('/admin')) {
      if (!token || (!['super_admin', 'moderator'].includes(token.role as string))) {
        return NextResponse.redirect(new URL('/auth/signin?error=AccessDenied', req.url))
      }
    }

    // Lawyer routes - require lawyer role or admin
    if (pathname.startsWith('/lawyer')) {
      if (!token || (!['lawyer', 'super_admin'].includes(token.role as string))) {
        return NextResponse.redirect(new URL('/auth/signin?error=AccessDenied', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages without authentication
        if (req.nextUrl.pathname.startsWith('/auth/')) {
          return true
        }
        
        // For protected routes, require a valid token
        if (req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname.startsWith('/lawyer')) {
          return !!token
        }
        
        // Allow all other routes
        return true
      },
    },
  }
)

export const config = {
  matcher: ['/admin/:path*', '/lawyer/:path*', '/auth/:path*']
}