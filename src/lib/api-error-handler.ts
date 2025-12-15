/**
 * API Error Handler Middleware
 * Provides consistent error handling for Next.js API routes
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { handleApiError, ErrorLogger, AppError, ErrorType, AuthenticationError } from "@/lib/errors"

// Request context for error logging
interface RequestContext {
  userId?: string
  organizationId?: string
  requestId: string
  userAgent?: string
  ip?: string
  method: string
  url: string
}

// API handler wrapper type
export type ApiHandler = (
  request: NextRequest,
  context?: { params?: any }
) => Promise<NextResponse>

// Wrapper function for API routes with error handling
export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: { params?: any }) => {
    const requestId = crypto.randomUUID()
    const startTime = Date.now()
    
    try {
      // Get request context
      const requestContext: RequestContext = {
        requestId,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown',
        method: request.method,
        url: request.url
      }

      // Try to get user context for logging
      try {
        const session = await getServerSession(authOptions)
        if (session?.user) {
          requestContext.userId = session.user.id
          requestContext.organizationId = session.user.organizationId
        }
      } catch (sessionError) {
        // Don't fail the request if session retrieval fails
        console.warn('Failed to get session for error context:', sessionError)
      }

      // Add request ID to headers for tracing
      const response = await handler(request, context)
      response.headers.set('X-Request-ID', requestId)
      
      // Log successful requests in development
      if (process.env.NODE_ENV === 'development') {
        const duration = Date.now() - startTime
        console.log(`${request.method} ${request.url} - ${response.status} (${duration}ms)`)
      }
      
      return response
      
    } catch (error) {
      // Handle the error using our centralized error handler
      const { error: appError, response: errorResponse } = handleApiError(error, {
        userId: undefined, // Will be set by handleApiError if available
        organizationId: undefined,
        requestId,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown'
      })

      // Create error response
      const response = NextResponse.json(errorResponse, { 
        status: appError.statusCode 
      })
      
      // Add request ID for tracing
      response.headers.set('X-Request-ID', requestId)
      
      // Add CORS headers if needed
      response.headers.set('Access-Control-Allow-Origin', '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      
      return response
    }
  }
}

// Validation helper for API routes
export function validateRequest<T>(
  data: unknown,
  schema: { parse: (data: unknown) => T }
): T {
  try {
    return schema.parse(data)
  } catch (error) {
    throw error // Will be caught by withErrorHandler and converted to ValidationError
  }
}

// Authentication helper for API routes
export async function requireAuth(request: NextRequest): Promise<{
  userId: string
  organizationId: string
  role: string
}> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id || !session?.user?.organizationId) {
    throw new AuthenticationError("Authentication required")
  }

  return {
    userId: session.user.id,
    organizationId: session.user.organizationId,
    role: session.user.role || 'user'
  }
}

// Authorization helper for API routes
export function requireRole(userRole: string, requiredRole: string): void {
  const roleHierarchy = ['user', 'admin', 'super_admin']
  const userRoleIndex = roleHierarchy.indexOf(userRole)
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)
  
  if (userRoleIndex === -1 || requiredRoleIndex === -1 || userRoleIndex < requiredRoleIndex) {
    throw new AppError("Insufficient permissions", ErrorType.AUTHORIZATION, 403)
  }
}

// Rate limiting helper (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 60000 // 1 minute
): void {
  const now = Date.now()
  const windowStart = now - windowMs
  
  // Clean up old entries
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < windowStart) {
      rateLimitMap.delete(key)
    }
  }
  
  const current = rateLimitMap.get(identifier)
  
  if (!current) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now })
    return
  }
  
  if (current.resetTime < windowStart) {
    // Reset the counter
    rateLimitMap.set(identifier, { count: 1, resetTime: now })
    return
  }
  
  if (current.count >= maxRequests) {
    throw new AppError(
      "Rate limit exceeded. Please try again later.",
      ErrorType.RATE_LIMIT,
      429
    )
  }
  
  current.count++
}

// Helper to create standardized success responses
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  const response: any = { data }
  
  if (message) {
    response.message = message
  }
  
  return NextResponse.json(response, { status })
}

// Helper to handle CORS preflight requests
export function handleCORS(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    })
  }
  return null
}