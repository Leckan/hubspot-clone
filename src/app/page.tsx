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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div className="text-sm text-muted-foreground">Loading your CRM...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center sm:text-left">
              <CardTitle className="text-2xl sm:text-3xl font-bold">
                HubSpot Clone CRM
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                A comprehensive customer relationship management system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {session ? (
                <div className="space-y-4">
                  <p className="text-base sm:text-lg">
                    Welcome back,{" "}
                    <span className="font-semibold">{session.user?.name}</span>!
                  </p>
                  <p className="text-gray-600 text-sm sm:text-base">
                    Your CRM system is ready to use. Start managing your
                    contacts, deals, and pipeline.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Button 
                      onClick={() => router.push("/dashboard")}
                      className="w-full sm:w-auto touch-manipulation"
                    >
                      View Dashboard
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => router.push("/contacts")}
                      className="w-full sm:w-auto touch-manipulation"
                    >
                      Manage Contacts
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-base sm:text-lg">
                    Get started with your CRM system by signing in or creating
                    an account.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Button 
                      onClick={() => router.push("/auth/signin")}
                      className="w-full sm:w-auto touch-manipulation"
                    >
                      Sign In
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => router.push("/auth/register")}
                      className="w-full sm:w-auto touch-manipulation"
                    >
                      Sign Up
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="touch-manipulation">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Contact Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm sm:text-base">
                  Organize and manage all your customer contacts in one place.
                </p>
              </CardContent>
            </Card>

            <Card className="touch-manipulation">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Deal Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm sm:text-base">
                  Track deals through your sales pipeline with visual Kanban
                  boards.
                </p>
              </CardContent>
            </Card>

            <Card className="touch-manipulation sm:col-span-2 lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Analytics Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm sm:text-base">
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
