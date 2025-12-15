"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold">
                HubSpot Clone CRM
              </CardTitle>
              <CardDescription>
                A comprehensive customer relationship management system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {session ? (
                <div className="space-y-4">
                  <p className="text-lg">
                    Welcome back,{" "}
                    <span className="font-semibold">{session.user?.name}</span>!
                  </p>
                  <p className="text-gray-600">
                    Your CRM system is ready to use. Start managing your
                    contacts, deals, and pipeline.
                  </p>
                  <div className="flex gap-4">
                    <Button onClick={() => router.push("/dashboard")}>
                      View Dashboard
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => router.push("/contacts")}
                    >
                      Manage Contacts
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-lg">
                    Get started with your CRM system by signing in or creating
                    an account.
                  </p>
                  <div className="flex gap-4">
                    <Button onClick={() => router.push("/auth/signin")}>
                      Sign In
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => router.push("/auth/register")}
                    >
                      Sign Up
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Organize and manage all your customer contacts in one place.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deal Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Track deals through your sales pipeline with visual Kanban
                  boards.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Monitor your sales performance with comprehensive analytics.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
