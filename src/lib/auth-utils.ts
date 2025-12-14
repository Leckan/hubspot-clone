import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type UserRole = "admin" | "manager" | "user"

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  organizationId: string
}

/**
 * Get the current authenticated user from server-side
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
      },
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      organizationId: user.organizationId,
    }
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    user: 1,
    manager: 2,
    admin: 3,
  }

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

/**
 * Check if user has permission to access resource
 */
export function hasPermission(
  userRole: UserRole,
  action: "read" | "write" | "delete" | "admin",
  resourceType: "contact" | "deal" | "company" | "activity" | "user" | "system"
): boolean {
  // Admin has all permissions
  if (userRole === "admin") {
    return true
  }

  // Manager permissions
  if (userRole === "manager") {
    if (action === "admin") {
      return false // Only admin can perform admin actions
    }
    if (resourceType === "user" && action === "delete") {
      return false // Only admin can delete users
    }
    return true // Manager can read/write/delete other resources
  }

  // User permissions
  if (userRole === "user") {
    if (action === "admin") {
      return false
    }
    if (resourceType === "user") {
      return action === "read" // Users can only read user info
    }
    if (action === "delete") {
      return false // Users cannot delete resources
    }
    return true // Users can read/write contacts, deals, companies, activities
  }

  return false
}

/**
 * Ensure user belongs to the same organization as the resource
 */
export function checkOrganizationAccess(
  userOrganizationId: string,
  resourceOrganizationId: string
): boolean {
  return userOrganizationId === resourceOrganizationId
}

/**
 * Create authorization error response
 */
export function createAuthError(message: string = "Unauthorized", status: number = 401) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  )
}

/**
 * Middleware helper to check authentication and authorization
 */
export async function withAuth<T>(
  handler: (user: AuthUser) => Promise<T>,
  options?: {
    requiredRole?: UserRole
    requiredPermission?: {
      action: "read" | "write" | "delete" | "admin"
      resourceType: "contact" | "deal" | "company" | "activity" | "user" | "system"
    }
  }
): Promise<T | Response> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return createAuthError("Authentication required", 401)
    }

    // Check role requirement
    if (options?.requiredRole && !hasRole(user.role, options.requiredRole)) {
      return createAuthError("Insufficient permissions", 403)
    }

    // Check permission requirement
    if (options?.requiredPermission) {
      const { action, resourceType } = options.requiredPermission
      if (!hasPermission(user.role, action, resourceType)) {
        return createAuthError("Insufficient permissions", 403)
      }
    }

    return await handler(user)
  } catch (error) {
    console.error("Authorization error:", error)
    return createAuthError("Internal server error", 500)
  }
}