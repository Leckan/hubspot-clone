import { Metadata } from "next"
import { ContactList } from "@/components/contacts"
import { ProtectedRoute } from "@/components/auth/protected-route"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Contacts | HubSpot Clone",
  description: "Manage your contacts and customer relationships",
}

function ContactsContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-xl font-semibold">CRM System</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto py-6">
        <ContactList />
      </div>
    </div>
  )
}

export default function ContactsPage() {
  return (
    <ProtectedRoute>
      <ContactsContent />
    </ProtectedRoute>
  )
}