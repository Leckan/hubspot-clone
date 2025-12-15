"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DealForm } from "@/components/deals/deal-form"
import { CompanyForm } from "@/components/companies/company-form"
import { DashboardMain } from "@/components/dashboard"
import { toast } from "sonner"
import Link from "next/link"

function DashboardContent() {
  const { user, hasRole, hasPermission } = useAuth()
  const [showCreateDealDialog, setShowCreateDealDialog] = useState(false)
  const [showCreateCompanyDialog, setShowCreateCompanyDialog] = useState(false)

  const handleDealSuccess = (deal: any) => {
    toast.success("Deal created successfully!")
    setShowCreateDealDialog(false)
    // Optionally redirect to deals page or refresh data
  }

  const handleDealCancel = () => {
    setShowCreateDealDialog(false)
  }

  const handleCompanySuccess = (company: any) => {
    toast.success("Company created successfully!")
    setShowCreateCompanyDialog(false)
  }

  const handleCompanyCancel = () => {
    setShowCreateCompanyDialog(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Main Dashboard Analytics */}
        <DashboardMain />

        {/* Quick Actions Section */}
        <div className="mt-6 sm:mt-8">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                    <Button className="w-full touch-manipulation" variant="outline">
                      Manage Contacts
                    </Button>
                  </Link>
                  {hasPermission("write", "deal") && (
                    <Button 
                      className="w-full touch-manipulation" 
                      variant="outline"
                      onClick={() => setShowCreateDealDialog(true)}
                    >
                      Create Deal
                    </Button>
                  )}
                  {hasPermission("write", "company") && (
                    <Button 
                      className="w-full touch-manipulation" 
                      variant="outline"
                      onClick={() => setShowCreateCompanyDialog(true)}
                    >
                      Add Company
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

        {/* Create Deal Dialog */}
        <Dialog open={showCreateDealDialog} onOpenChange={setShowCreateDealDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Deal</DialogTitle>
              <DialogDescription>
                Fill in the details below to create a new deal in your pipeline.
              </DialogDescription>
            </DialogHeader>
            <DealForm
              onSuccess={handleDealSuccess}
              onCancel={handleDealCancel}
            />
          </DialogContent>
        </Dialog>

        {/* Create Company Dialog */}
        <Dialog open={showCreateCompanyDialog} onOpenChange={setShowCreateCompanyDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Company</DialogTitle>
              <DialogDescription>
                Fill in the company details below to add it to your CRM.
              </DialogDescription>
            </DialogHeader>
            <CompanyForm
              onSuccess={handleCompanySuccess}
              onCancel={handleCompanyCancel}
            />
          </DialogContent>
        </Dialog>
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