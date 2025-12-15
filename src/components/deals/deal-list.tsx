"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Search, Plus, Filter, MoreHorizontal, DollarSign, Calendar, User, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DealForm } from "./deal-form"
import { DealDetail } from "./deal-detail"
import { DealStage } from "@/types"

interface DealWithRelations {
  id: string
  title: string
  amount?: number
  stage: DealStage
  probability: number
  expectedCloseDate?: Date
  contactId?: string
  companyId?: string
  ownerId: string
  organizationId: string
  createdAt: Date
  updatedAt: Date
  contact?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  company?: {
    id: string
    name: string
    domain?: string
  }
  owner?: {
    id: string
    name: string
    email: string
  }
  _count?: {
    activities: number
  }
}

interface DealListProps {
  initialDeals?: DealWithRelations[]
  initialPagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const STAGE_LABELS: Record<DealStage, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
}

const STAGE_COLORS: Record<DealStage, string> = {
  lead: "bg-gray-100 text-gray-800",
  qualified: "bg-blue-100 text-blue-800",
  proposal: "bg-yellow-100 text-yellow-800",
  negotiation: "bg-orange-100 text-orange-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
}

export function DealList({ initialDeals = [], initialPagination }: DealListProps) {
  const { data: session } = useSession()
  const [deals, setDeals] = useState<DealWithRelations[]>(initialDeals)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStage, setSelectedStage] = useState<string>("")
  const [selectedOwner, setSelectedOwner] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(initialPagination?.page || 1)
  const [pagination, setPagination] = useState(initialPagination)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<DealWithRelations | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  // Fetch deals with filters
  const fetchDeals = async (
    page = 1,
    search = searchTerm,
    stage = selectedStage,
    ownerId = selectedOwner
  ) => {
    if (!session) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      })

      if (search) params.append("search", search)
      if (stage) params.append("stage", stage)
      if (ownerId) params.append("ownerId", ownerId)

      const response = await fetch(`/api/deals?${params}`)
      if (!response.ok) throw new Error("Failed to fetch deals")

      const data = await response.json()
      setDeals(data.data)
      setPagination(data.pagination)
      setCurrentPage(page)
    } catch (error) {
      console.error("Error fetching deals:", error)
    } finally {
      setLoading(false)
    }
  }

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== "" || selectedStage !== "" || selectedOwner !== "") {
        fetchDeals(1, searchTerm, selectedStage, selectedOwner)
      } else if (searchTerm === "" && selectedStage === "" && selectedOwner === "") {
        fetchDeals(1)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, selectedStage, selectedOwner])

  // Handle deal creation success
  const handleDealCreated = (newDeal: DealWithRelations) => {
    setDeals(prev => [newDeal, ...prev])
    setIsCreateDialogOpen(false)
    // Refresh the list to get updated pagination
    fetchDeals(currentPage)
  }

  // Handle deal update success
  const handleDealUpdated = (updatedDeal: DealWithRelations) => {
    setDeals(prev => 
      prev.map(deal => 
        deal.id === updatedDeal.id ? updatedDeal : deal
      )
    )
    setSelectedDeal(updatedDeal)
  }

  // Handle deal deletion
  const handleDealDeleted = (dealId: string) => {
    setDeals(prev => prev.filter(deal => deal.id !== dealId))
    setIsDetailDialogOpen(false)
    setSelectedDeal(null)
    // Refresh the list to get updated pagination
    fetchDeals(currentPage)
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    fetchDeals(page, searchTerm, selectedStage, selectedOwner)
  }

  // Open deal detail
  const handleDealClick = (deal: DealWithRelations) => {
    setSelectedDeal(deal)
    setIsDetailDialogOpen(true)
  }

  // Format currency
  const formatCurrency = (amount?: number) => {
    if (!amount) return "$0"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format date
  const formatDate = (date?: Date) => {
    if (!date) return "—"
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Deals</h1>
          <p className="text-muted-foreground">
            Manage your sales opportunities and track revenue
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Add Deal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Deal</DialogTitle>
            </DialogHeader>
            <DealForm
              onSuccess={handleDealCreated}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search deals by title, contact, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Stages</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deal List */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Deals
            {pagination && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({pagination.total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading deals...</div>
            </div>
          ) : deals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-muted-foreground mb-2">No deals found</div>
              <p className="text-sm text-muted-foreground">
                {searchTerm || selectedStage || selectedOwner
                  ? "Try adjusting your search criteria"
                  : "Get started by creating your first deal"}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Probability</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Close Date</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal) => (
                    <TableRow
                      key={deal.id}
                      className="cursor-pointer"
                      onClick={() => handleDealClick(deal)}
                    >
                      <TableCell>
                        <div className="font-medium">{deal.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {deal._count?.activities || 0} activities
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={STAGE_COLORS[deal.stage]}>
                          {STAGE_LABELS[deal.stage]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          {formatCurrency(deal.amount)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{deal.probability}%</div>
                      </TableCell>
                      <TableCell>
                        {deal.contact ? (
                          <div>
                            <div className="font-medium text-sm">
                              {deal.contact.firstName} {deal.contact.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {deal.contact.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {deal.company ? (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm">{deal.company.name}</div>
                              {deal.company.domain && (
                                <div className="text-xs text-muted-foreground">
                                  {deal.company.domain}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(deal.expectedCloseDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{deal.owner?.name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Handle menu actions
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                    {pagination.total} deals
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => handlePageChange(pagination.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => handlePageChange(pagination.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Deal Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedDeal && (
            <DealDetail
              deal={selectedDeal}
              onUpdate={handleDealUpdated}
              onDelete={handleDealDeleted}
              onClose={() => setIsDetailDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}