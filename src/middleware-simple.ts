import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  // Simple middleware without NextAuth to test header size issues
  const pathname = request.nextUrl.pathname

  // Allow all requests for now to test if the issue is with NextAuth
  console.log(`Request to: ${pathname}`)
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}