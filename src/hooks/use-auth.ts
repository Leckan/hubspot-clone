"use client"

import { useSession } from "next-auth/react"
import { useMemo } from "react"

export type UserRole = "admin" | "manager" | "user"

export interface UseAuthReturn {
  user: {
    id: string
    email: string
    name: string
    role: UserRole
  } | null
  isAuthenticated: boolean
  isLoading: boolean
  hasRole: (requiredRole: UserRole) => boolean
  hasPermission: (
    action: "read" | "write" | "delete" | "admin",
    resourceType: "contact" | "deal" | "company" | "activity" | "user" | "system"
  ) => boolean
}

/**
 * Custom hook for authentication and authorization
 */
export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession()

  const user = useMemo(() => {
    if (!session?.user) return null
    
    return {
      id: session.user.id,
      email: session.user.email || "",
      name: session.user.name || "",
      role: (session.user.role as UserRole) || "user",
    }
  }, [session])

  const isAuthenticated = !!session?.user
  const isLoading = status === "loading"

  const hasRole = useMemo(() => {
    return (requiredRole: UserRole): boolean => {
      if (!user) return false

      const roleHierarchy: Record<UserRole, number> = {
        user: 1,
        manager: 2,
        admin: 3,
      }

      return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
    }
  }, [user])

  const hasPermission = useMemo(() => {
    return (
      action: "read" | "write" | "delete" | "admin",
      resourceType: "contact" | "deal" | "company" | "activity" | "user" | "system"
    ): boolean => {
      if (!user) return false

      // Admin has all permissions
      if (user.role === "admin") {
        return true
      }

      // Manager permissions
      if (user.role === "manager") {
        if (action === "admin") {
          return false // Only admin can perform admin actions
        }
        if (resourceType === "user" && action === "delete") {
          return false // Only admin can delete users
        }
        return true // Manager can read/write/delete other resources
      }

      // User permissions
      if (user.role === "user") {
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
  }, [user])

  return {
    user,
    isAuthenticated,
    isLoading,
    hasRole,
    hasPermission,
  }
}