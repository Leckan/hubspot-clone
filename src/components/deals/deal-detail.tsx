"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { 
  Edit, 
  Trash2, 
  DollarSign, 
  Calendar, 
  User, 
  Building, 
  Mail, 
  Phone,
  Percent,
  Clock,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DealForm } from "./deal-form"
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
    phone?: string
    jobTitle?: string
  }
  company?: {
    id: string
    name: string
    domain?: string
    industry?: string
    size?: string
  }
  owner?: {
    id: string
    name: string
    email: string
  }
  activities?: Array<{
    id: string
    type: string
    subject: string
    description?: string
    dueDate?: Date
    completed: boolean
    createdAt: Date
    user: {
      id: string
      name: string
    }
  }>
}

interface DealDetailProps {
  deal: DealWithRelations
  onUpdate: (deal: DealWithRelations) => void
  onDelete: (dealId: string) => void
  onClose: () => void
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

export function DealDetail({ deal, onUpdate, onDelete, onClose }: DealDetailProps) {
  const { data: session } = useSession()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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
    if (!date) return "Not set"
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date))
  }

  // Format date and time
  const formatDateTime = (date?: Date) => {
    if (!date) return "Not set"
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))
  }

  // Handle deal update
  const handleDealUpdated = (updatedDeal: DealWithRelations) => {
    onUpdate(updatedDeal)
    setIsEditDialogOpen(false)
  }

  // Handle deal deletion
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this deal? This action cannot be undone.")) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/deals/${deal.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete deal")
      }

      onDelete(deal.id)
    } catch (error) {
      console.error("Error deleting deal:", error)
      alert("Failed to delete deal")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold">{deal.title}</h2>
            <Badge className={STAGE_COLORS[deal.stage]}>
              {STAGE_LABELS[deal.stage]}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Created {formatDateTime(deal.createdAt)}
            </div>
            <div className="flex items-center gap-1">
              <Edit className="h-4 w-4" />
              Updated {formatDateTime(deal.updatedAt)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deal Details */}
          <Card>
            <CardHeader>
              <CardTitle>Deal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Amount</div>
                    <div className="font-medium">{formatCurrency(deal.amount)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Percent className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Probability</div>
                    <div className="font-medium">{deal.probability}%</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Expected Close</div>
                    <div className="font-medium">{formatDate(deal.expectedCloseDate)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Owner</div>
                    <div className="font-medium">{deal.owner?.name || "Unknown"}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              {deal.activities && deal.activities.length > 0 ? (
                <div className="space-y-4">
                  {deal.activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 pb-4 border-b last:border-b-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{activity.subject}</span>
                          <Badge variant="outline" className="text-xs">
                            {activity.type}
                          </Badge>
                          {activity.completed && (
                            <Badge variant="secondary" className="text-xs">
                              Completed
                            </Badge>
                          )}
                        </div>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {activity.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{activity.user.name}</span>
                          <span>{formatDateTime(activity.createdAt)}</span>
                          {activity.dueDate && (
                            <span>Due: {formatDate(activity.dueDate)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No activities recorded yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Information */}
          {deal.contact && (
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="font-medium">
                    {deal.contact.firstName} {deal.contact.lastName}
                  </div>
                  {deal.contact.jobTitle && (
                    <div className="text-sm text-muted-foreground">
                      {deal.contact.jobTitle}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${deal.contact.email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {deal.contact.email}
                  </a>
                </div>
                {deal.contact.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${deal.contact.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {deal.contact.phone}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Company Information */}
          {deal.company && (
            <Card>
              <CardHeader>
                <CardTitle>Company</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <div className="font-medium">{deal.company.name}</div>
                </div>
                {deal.company.domain && (
                  <div className="text-sm text-muted-foreground">
                    {deal.company.domain}
                  </div>
                )}
                {deal.company.industry && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Industry: </span>
                    <span className="capitalize">{deal.company.industry}</span>
                  </div>
                )}
                {deal.company.size && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Size: </span>
                    <span className="capitalize">{deal.company.size}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Deal Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Deal</DialogTitle>
          </DialogHeader>
          <DealForm
            initialData={{
              title: deal.title,
              amount: deal.amount?.toString(),
              stage: deal.stage,
              probability: deal.probability.toString(),
              expectedCloseDate: deal.expectedCloseDate?.toISOString().split('T')[0],
              contactId: deal.contactId,
              companyId: deal.companyId,
            }}
            onSuccess={handleDealUpdated}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}