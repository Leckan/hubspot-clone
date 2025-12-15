"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Search, Filter, X, Calendar, DollarSign, User, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DealStage } from "@/types"

interface DealFilters {
  search?: string
  stage?: DealStage
  ownerId?: string
  companyId?: string
  contactId?: string
  minAmount?: number
  maxAmount?: number
  startDate?: Date
  endDate?: Date
}

interface DealFiltersProps {
  filters: DealFilters
  onFiltersChange: (filters: DealFilters) => void
  onClearFilters: () => void
}

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface Company {
  id: string
  name: string
  domain?: string
}

interface User {
  id: string
  name: string
  email: string
}

const STAGE_OPTIONS: { value: DealStage; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
]

export function DealFilters({ filters, onFiltersChange, onClearFilters }: DealFiltersProps) {
  const { data: session } = useSession()
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  // Fetch filter options
  useEffect(() => {
    const fetchOptions = async () => {
      if (!session) return

      try {
        const [contactsRes, companiesRes] = await Promise.all([
          fetch("/api/contacts?limit=100"),
          fetch("/api/companies?limit=100"),
        ])

        if (contactsRes.ok) {
          const contactsData = await contactsRes.json()
          setContacts(contactsData.data || [])
        }

        if (companiesRes.ok) {
          const companiesData = await companiesRes.json()
          setCompanies(companiesData.data || [])
        }

        // For now, we'll just use the current user as the only owner option
        // In a real app, you'd fetch all users in the organization
        if (session.user) {
          setUsers([{
            id: session.user.id!,
            name: session.user.name!,
            email: session.user.email!,
          }])
        }
      } catch (error) {
        console.error("Error fetching filter options:", error)
      } finally {
        setLoadingOptions(false)
      }
    }

    fetchOptions()
  }, [session])

  // Update search filter
  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search: search || undefined })
  }

  // Update stage filter
  const handleStageChange = (stage: string) => {
    onFiltersChange({ ...filters, stage: stage as DealStage || undefined })
  }

  // Update owner filter
  const handleOwnerChange = (ownerId: string) => {
    onFiltersChange({ ...filters, ownerId: ownerId || undefined })
  }

  // Update company filter
  const handleCompanyChange = (companyId: string) => {
    onFiltersChange({ ...filters, companyId: companyId || undefined })
  }

  // Update contact filter
  const handleContactChange = (contactId: string) => {
    onFiltersChange({ ...filters, contactId: contactId || undefined })
  }

  // Update amount range filters
  const handleMinAmountChange = (value: string) => {
    const amount = value ? parseFloat(value) : undefined
    onFiltersChange({ ...filters, minAmount: amount })
  }

  const handleMaxAmountChange = (value: string) => {
    const amount = value ? parseFloat(value) : undefined
    onFiltersChange({ ...filters, maxAmount: amount })
  }

  // Update date range filters
  const handleStartDateChange = (value: string) => {
    const date = value ? new Date(value) : undefined
    onFiltersChange({ ...filters, startDate: date })
  }

  const handleEndDateChange = (value: string) => {
    const date = value ? new Date(value) : undefined
    onFiltersChange({ ...filters, endDate: date })
  }

  // Check if any advanced filters are active
  const hasAdvancedFilters = !!(
    filters.ownerId ||
    filters.companyId ||
    filters.contactId ||
    filters.minAmount ||
    filters.maxAmount ||
    filters.startDate ||
    filters.endDate
  )

  // Check if any filters are active
  const hasActiveFilters = !!(
    filters.search ||
    filters.stage ||
    hasAdvancedFilters
  )

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Basic Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search deals by title, contact, or company..."
                value={filters.search || ""}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filters.stage || ""} onValueChange={handleStageChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Stages</SelectItem>
                {STAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4" />
                  Advanced Filters
                  {hasAdvancedFilters && (
                    <span className="ml-1 h-2 w-2 rounded-full bg-blue-600" />
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Advanced Filters</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Owner and Company */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="owner">Deal Owner</Label>
                      <Select
                        value={filters.ownerId || ""}
                        onValueChange={handleOwnerChange}
                        disabled={loadingOptions}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={loadingOptions ? "Loading..." : "Any owner"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Any owner</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="company">Company</Label>
                      <Select
                        value={filters.companyId || ""}
                        onValueChange={handleCompanyChange}
                        disabled={loadingOptions}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={loadingOptions ? "Loading..." : "Any company"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Any company</SelectItem>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                              {company.domain && ` (${company.domain})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Contact */}
                  <div>
                    <Label htmlFor="contact">Contact</Label>
                    <Select
                      value={filters.contactId || ""}
                      onValueChange={handleContactChange}
                      disabled={loadingOptions}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={loadingOptions ? "Loading..." : "Any contact"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any contact</SelectItem>
                        {contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.firstName} {contact.lastName} ({contact.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount Range */}
                  <div>
                    <Label>Deal Amount Range</Label>
                    <div className="grid grid-cols-2 gap-4 mt-1">
                      <div>
                        <Input
                          type="number"
                          placeholder="Min amount"
                          value={filters.minAmount?.toString() || ""}
                          onChange={(e) => handleMinAmountChange(e.target.value)}
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          placeholder="Max amount"
                          value={filters.maxAmount?.toString() || ""}
                          onChange={(e) => handleMaxAmountChange(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Date Range */}
                  <div>
                    <Label>Expected Close Date Range</Label>
                    <div className="grid grid-cols-2 gap-4 mt-1">
                      <div>
                        <Input
                          type="date"
                          value={filters.startDate ? filters.startDate.toISOString().split('T')[0] : ""}
                          onChange={(e) => handleStartDateChange(e.target.value)}
                        />
                      </div>
                      <div>
                        <Input
                          type="date"
                          value={filters.endDate ? filters.endDate.toISOString().split('T')[0] : ""}
                          onChange={(e) => handleEndDateChange(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => {
                        onClearFilters()
                        setIsAdvancedOpen(false)
                      }}
                      disabled={!hasActiveFilters}
                    >
                      Clear All Filters
                    </Button>
                    <Button onClick={() => setIsAdvancedOpen(false)}>
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={onClearFilters}>
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                  <Search className="h-3 w-3" />
                  Search: {filters.search}
                </div>
              )}
              {filters.stage && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                  Stage: {STAGE_OPTIONS.find(s => s.value === filters.stage)?.label}
                </div>
              )}
              {filters.ownerId && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                  <User className="h-3 w-3" />
                  Owner: {users.find(u => u.id === filters.ownerId)?.name}
                </div>
              )}
              {filters.companyId && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                  <Building className="h-3 w-3" />
                  Company: {companies.find(c => c.id === filters.companyId)?.name}
                </div>
              )}
              {filters.contactId && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                  Contact: {contacts.find(c => c.id === filters.contactId)?.firstName} {contacts.find(c => c.id === filters.contactId)?.lastName}
                </div>
              )}
              {(filters.minAmount || filters.maxAmount) && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                  <DollarSign className="h-3 w-3" />
                  Amount: {filters.minAmount ? `$${filters.minAmount}` : '$0'} - {filters.maxAmount ? `$${filters.maxAmount}` : '∞'}
                </div>
              )}
              {(filters.startDate || filters.endDate) && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                  <Calendar className="h-3 w-3" />
                  Date: {filters.startDate ? filters.startDate.toLocaleDateString() : '∞'} - {filters.endDate ? filters.endDate.toLocaleDateString() : '∞'}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}