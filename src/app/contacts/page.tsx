import { Metadata } from "next"
import { ContactList } from "@/components/contacts"
import { ProtectedRoute } from "@/components/auth/protected-route"


export const metadata: Metadata = {
  title: "Contacts | HubSpot Clone",
  description: "Manage your contacts and customer relationships",
}

function ContactsContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="container mx-auto py-4 sm:py-6">
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