import { Metadata } from "next"
import { CompanyList } from "@/components/companies"
import { ProtectedRoute } from "@/components/auth/protected-route"

export const metadata: Metadata = {
  title: "Companies | HubSpot Clone",
  description: "Manage your companies and business relationships",
}

function CompaniesContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="container mx-auto py-4 sm:py-6">
        <CompanyList />
      </div>
    </div>
  )
}

export default function CompaniesPage() {
  return (
    <ProtectedRoute>
      <CompaniesContent />
    </ProtectedRoute>
  )
}