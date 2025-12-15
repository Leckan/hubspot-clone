"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { Plus, DollarSign, Calendar, User, Building, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DealForm } from "./deal-form"
import { DealDetail } from "./deal-detail"
import { Deal, DealStage } from "@/types"

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
  }
  owner?: {
    id: string
    name: string
    email: string
  }
}

interface PipelineStage {
  stage: DealStage
  dealCount: number
  totalValue: number
  averageValue: number
}

interface PipelineData {
  analytics: PipelineStage[]
  dealsByStage: {
    stage: DealStage
    deals: DealWithRelations[]
  }[]
  summary: {
    totalDeals: number
    activeDeals: number
    wonDeals: number
    lostDeals: number
    totalValue: number
    averageDealSize: number
    conversionRate: number
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

export function PipelineView() {
  const { data: session } = useSession()
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<DealWithRelations | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  // Fetch pipeline data
  const fetchPipelineData = async () => {
    if (!session) return

    setLoading(true)
    try {
      const response = await fetch("/api/deals/pipeline")
      if (!response.ok) throw new Error("Failed to fetch pipeline data")

      const data = await response.json()
      setPipelineData(data.data)
    } catch (error) {
      console.error("Error fetching pipeline data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPipelineData()
  }, [session])

  // Handle drag and drop
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    // If dropped outside a droppable area
    if (!destination) return

    // If dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const newStage = destination.droppableId as DealStage
    
    try {
      // Update deal stage via API
      const response = await fetch(`/api/deals/${draggableId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stage: newStage,
        }),
      })

      if (!response.ok) throw new Error("Failed to update deal stage")

      // Refresh pipeline data
      await fetchPipelineData()
    } catch (error) {
      console.error("Error updating deal stage:", error)
    }
  }

  // Handle deal creation success
  const handleDealCreated = () => {
    setIsCreateDialogOpen(false)
    fetchPipelineData()
  }

  // Handle deal update success
  const handleDealUpdated = () => {
    fetchPipelineData()
  }

  // Handle deal deletion
  const handleDealDeleted = () => {
    setIsDetailDialogOpen(false)
    setSelectedDeal(null)
    fetchPipelineData()
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
    if (!date) return null
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(date))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading pipeline...</div>
      </div>
    )
  }

  if (!pipelineData) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Failed to load pipeline data</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sales Pipeline</h1>
          <p className="text-muted-foreground">
            Track deals through your sales process
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

      {/* Pipeline Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold">
                {formatCurrency(pipelineData.summary.totalValue)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Total Pipeline Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {pipelineData.summary.activeDeals}
            </div>
            <p className="text-xs text-muted-foreground">Active Deals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatCurrency(pipelineData.summary.averageDealSize)}
            </div>
            <p className="text-xs text-muted-foreground">Average Deal Size</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {pipelineData.summary.conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Conversion Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 overflow-x-auto">
          {pipelineData.dealsByStage.map((stageData) => {
            const analytics = pipelineData.analytics.find(
              (a) => a.stage === stageData.stage
            )

            return (
              <div key={stageData.stage} className="min-w-[280px]">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {STAGE_LABELS[stageData.stage]}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className={STAGE_COLORS[stageData.stage]}
                      >
                        {analytics?.dealCount || 0}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(analytics?.totalValue || 0)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Droppable droppableId={stageData.stage}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`space-y-2 min-h-[200px] p-2 rounded-md transition-colors ${
                            snapshot.isDraggingOver
                              ? "bg-muted/50"
                              : "bg-transparent"
                          }`}
                        >
                          {stageData.deals.map((deal, index) => (
                            <Draggable
                              key={deal.id}
                              draggableId={deal.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-3 bg-white border rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                                    snapshot.isDragging ? "shadow-lg" : ""
                                  }`}
                                  onClick={() => handleDealClick(deal)}
                                >
                                  <div className="space-y-2">
                                    <div className="font-medium text-sm">
                                      {deal.title}
                                    </div>
                                    
                                    {deal.amount && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <DollarSign className="h-3 w-3" />
                                        {formatCurrency(deal.amount)}
                                      </div>
                                    )}

                                    {deal.company && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Building className="h-3 w-3" />
                                        {deal.company.name}
                                      </div>
                                    )}

                                    {deal.contact && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Mail className="h-3 w-3" />
                                        {deal.contact.firstName} {deal.contact.lastName}
                                      </div>
                                    )}

                                    {deal.expectedCloseDate && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        {formatDate(deal.expectedCloseDate)}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <User className="h-3 w-3" />
                                        {deal.owner?.name}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {deal.probability}%
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      </DragDropContext>

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