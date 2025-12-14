import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const pathname = req.nextUrl.pathname

    // Allow access to auth API routes
    if (pathname.startsWith("/api/auth")) {
      return NextResponse.next()
    }

    // Allow access to public API routes
    if (pathname.startsWith("/api/public")) {
      return NextResponse.next()
    }

    // Redirect authenticated users away from auth pages
    if (pathname.startsWith("/auth")) {
      if (isAuth) {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
      return NextResponse.next()
    }

    // Protect API routes (except auth and public routes)
    if (pathname.startsWith("/api")) {
      if (!isAuth) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        )
      }

      // Check role-based access for admin routes
      if (pathname.startsWith("/api/admin")) {
        if (token?.role !== "admin") {
          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 }
          )
        }
      }

      return NextResponse.next()
    }

    // Protect dashboard and other protected pages
    if (!isAuth && pathname !== "/") {
      const from = pathname + (req.nextUrl.search || "")
      return NextResponse.redirect(
        new URL(`/auth/signin?from=${encodeURIComponent(from)}`, req.url)
      )
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to home page and auth pages without authentication
        const pathname = req.nextUrl.pathname
        if (pathname === "/" || pathname.startsWith("/auth")) {
          return true
        }
        
        // For all other protected routes, require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api/auth (NextAuth routes)
     */
    "/((?!_next/static|_next/image|favicon.ico|public/|api/auth).*)",
  ],
}