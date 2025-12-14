"use client"

import { useAuth, type UserRole } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
  requiredPermission?: {
    action: "read" | "write" | "delete" | "admin"
    resourceType: "contact" | "deal" | "company" | "activity" | "user" | "system"
  }
  fallback?: React.ReactNode
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  fallback,
  redirectTo = "/auth/signin",
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole, hasPermission } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push(redirectTo)
      return
    }

    // Check role requirement
    if (requiredRole && !hasRole(requiredRole)) {
      router.push("/unauthorized")
      return
    }

    // Check permission requirement
    if (requiredPermission) {
      const { action, resourceType } = requiredPermission
      if (!hasPermission(action, resourceType)) {
        router.push("/unauthorized")
        return
      }
    }
  }, [
    isAuthenticated,
    isLoading,
    hasRole,
    hasPermission,
    requiredRole,
    requiredPermission,
    router,
    redirectTo,
  ])

  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">Loading...</div>
        </div>
      )
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return null // Will redirect
  }

  // Check permission requirement
  if (requiredPermission) {
    const { action, resourceType } = requiredPermission
    if (!hasPermission(action, resourceType)) {
      return null // Will redirect
    }
  }

  return <>{children}</>
}