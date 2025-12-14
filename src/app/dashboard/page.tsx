"use client"

import { signOut } from "next-auth/react"
import { useAuth } from "@/hooks/use-auth"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

function DashboardContent() {
  const { user, hasRole, hasPermission } = useAuth()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/auth/signin" })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.name}!</p>
          </div>
          <div className="flex items-center gap-4">
            {hasRole("admin") && (
              <Button variant="outline" disabled>
                Admin Panel (Coming Soon)
              </Button>
            )}
            <Button onClick={handleSignOut} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Name:</strong> {user?.name}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Role:</strong> {user?.role}</p>
                <p><strong>User ID:</strong> {user?.id}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common CRM tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link href="/contacts">
                  <Button className="w-full" variant="outline">
                    Manage Contacts
                  </Button>
                </Link>
                {hasPermission("write", "deal") && (
                  <Button className="w-full" variant="outline" disabled>
                    Create Deal (Coming Soon)
                  </Button>
                )}
                {hasPermission("write", "company") && (
                  <Button className="w-full" variant="outline" disabled>
                    Add Company (Coming Soon)
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Authentication system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-green-600">✓ Authentication: Active</p>
                <p className="text-green-600">✓ Session: Valid</p>
                <p className="text-green-600">✓ Role: {user?.role}</p>
                <p className="text-gray-600">Database: Connected</p>
                {hasRole("admin") && (
                  <p className="text-blue-600">✓ Admin Access: Enabled</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}