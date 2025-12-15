"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { 
  Home, 
  Users, 
  Building, 
  Target, 
  Activity, 
  Menu, 
  X,
  LogOut
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Companies", href: "/companies", icon: Building },
  { name: "Deals", href: "/deals", icon: Target },
  { name: "Activities", href: "/activities", icon: Activity },
]

export function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/auth/signin" })
  }

  if (!session) return null

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/dashboard" className="text-xl font-bold text-primary">
                  CRM
                </Link>
              </div>
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors",
                        isActive
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      )}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">
                {session.user?.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="touch-manipulation"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="text-xl font-bold text-primary">
              CRM
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="touch-manipulation"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors touch-manipulation",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                )
              })}
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="px-3 py-2 text-sm text-gray-500">
                  {session.user?.name}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="w-full justify-start touch-manipulation"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  )
}