import { Metadata } from "next"
import { ActivityList } from "@/components/activities"
import { ProtectedRoute } from "@/components/auth/protected-route"

export const metadata: Metadata = {
  title: "Activities | HubSpot Clone",
  description: "Manage your activities and tasks",
}

function ActivitiesContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="container mx-auto py-4 sm:py-6">
        <ActivityList activities={[]} showFilters={true} />
      </div>
    </div>
  )
}

export default function ActivitiesPage() {
  return (
    <ProtectedRoute>
      <ActivitiesContent />
    </ProtectedRoute>
  )
}