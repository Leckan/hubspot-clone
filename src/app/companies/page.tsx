import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { CompanyList } from "@/components/companies"

export const metadata: Metadata = {
  title: "Companies | HubSpot Clone",
  description: "Manage your company records and business relationships",
}

export default async function CompaniesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <div className="container mx-auto py-6">
      <CompanyList />
    </div>
  )
}