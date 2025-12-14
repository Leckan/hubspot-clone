"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  Building, 
  Briefcase, 
  Calendar,
  DollarSign,
  Activity,
  MoreHorizontal
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ContactForm } from "./contact-form"
import { toast } from "sonner"
import { Contact, Deal, Activity as ActivityType } from "@/types"

interface ContactWithDetails {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  jobTitle?: string
  companyId?: string
  organizationId: string
  createdAt: Date
  updatedAt: Date
  company?: {
    id: string
    name: string
    domain?: string
    industry?: string
  }
  deals?: Array<{
    id: string
    title: string
    amount?: number
    stage: string
    createdAt: Date
  }>
  activities?: Array<{
    id: string
    type: string
    subject: string
    dueDate?: Date
    completed: boolean
    createdAt: Date
  }>
  _count?: {
    deals: number
    activities: number
  }
}

interface ContactDetailProps {
  contact: ContactWithDetails
  onUpdate: (contact: ContactWithDetails) => void
  onDelete: (contactId: string) => void
  onClose: () => void
}

export function ContactDetail({ contact, onUpdate, onDelete, onClose }: ContactDetailProps) {
  const { data: session } = useSession()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [detailedContact, setDetailedContact] = useState<ContactWithDetails>(contact)

  // Fetch detailed contact information
  const fetchContactDetails = async () => {
    if (!session) return

    try {
      const response = await fetch(`/api/contacts/${contact.id}`)
      if (response.ok) {
        const data = await response.json()
        setDetailedContact(data.data)
      }
    } catch (error) {
      console.error("Error fetching contact details:", error)
    }
  }

  // Handle contact update
  const handleContactUpdated = (updatedContact: Contact) => {
    // Convert Contact to ContactWithDetails
    const contactWithDetails: ContactWithDetails = {
      ...updatedContact,
      company: detailedContact.company,
      deals: detailedContact.deals,
      activities: detailedContact.activities,
      _count: detailedContact._count,
    }
    setDetailedContact(contactWithDetails)
    onUpdate(contactWithDetails)
    setIsEditDialogOpen(false)
    // Refresh details to get updated relationships
    fetchContactDetails()
  }

  // Handle contact deletion
  const handleDeleteContact = async () => {
    if (!session) return

    setLoading(true)
    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete contact")
      }

      toast.success("Contact deleted successfully")
      onDelete(contact.id)
    } catch (error) {
      console.error("Error deleting contact:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to delete contact"
      )
    } finally {
      setLoading(false)
      setIsDeleteDialogOpen(false)
    }
  }

  // Format date for display
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Format currency
  const formatCurrency = (amount?: number) => {
    if (!amount) return "—"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            {detailedContact.firstName} {detailedContact.lastName}
          </h2>
          {detailedContact.jobTitle && (
            <p className="text-muted-foreground">{detailedContact.jobTitle}</p>
          )}
          {detailedContact.company && (
            <p className="text-sm text-muted-foreground">
              at {detailedContact.company.name}
            </p>
          )}
        </div>
        <div className="flex gap-2">
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
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{detailedContact.email}</p>
              </div>
            </div>
            {detailedContact.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{detailedContact.phone}</p>
                </div>
              </div>
            )}
          </div>
          
          {detailedContact.company && (
            <div className="flex items-center gap-3">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium">{detailedContact.company.name}</p>
                {detailedContact.company.industry && (
                  <p className="text-sm text-muted-foreground">
                    {detailedContact.company.industry}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{formatDate(detailedContact.createdAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Deals ({detailedContact._count?.deals || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detailedContact.deals && detailedContact.deals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedContact.deals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-medium">{deal.title}</TableCell>
                    <TableCell>{formatCurrency(deal.amount)}</TableCell>
                    <TableCell>
                      <span className="capitalize">{deal.stage}</span>
                    </TableCell>
                    <TableCell>{formatDate(deal.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No deals associated with this contact
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activities ({detailedContact._count?.activities || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detailedContact.activities && detailedContact.activities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedContact.activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <span className="capitalize">{activity.type}</span>
                    </TableCell>
                    <TableCell className="font-medium">{activity.subject}</TableCell>
                    <TableCell>
                      {activity.dueDate ? formatDate(activity.dueDate) : "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          activity.completed
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {activity.completed ? "Completed" : "Pending"}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(activity.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No activities recorded for this contact
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <ContactForm
            contact={detailedContact}
            onSuccess={handleContactUpdated}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {detailedContact.firstName}{" "}
              {detailedContact.lastName}? This action cannot be undone.
              {detailedContact._count && detailedContact._count.deals > 0 && (
                <span className="block mt-2 text-amber-600">
                  Warning: This contact has {detailedContact._count.deals} associated deal(s).
                  The deals will remain but will no longer be linked to this contact.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteContact}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}