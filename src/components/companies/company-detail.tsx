"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { 
  Edit, 
  Trash2, 
  Globe, 
  Phone, 
  MapPin, 
  Building, 
  Calendar,
  Users,
  DollarSign,
  Mail,
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
import { CompanyForm } from "./company-form"
import { toast } from "sonner"
import { Company, Contact, Deal } from "@/types"

interface CompanyWithDetails {
  id: string
  name: string
  domain?: string
  industry?: string
  size?: string
  phone?: string
  address?: string
  organizationId: string
  createdAt: Date
  updatedAt: Date
  contacts?: Array<{
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
    jobTitle?: string
    createdAt: Date
  }>
  deals?: Array<{
    id: string
    title: string
    amount?: number
    stage: string
    probability: number
    expectedCloseDate?: Date
    createdAt: Date
  }>
  _count?: {
    contacts: number
    deals: number
  }
}

interface CompanyDetailProps {
  company: CompanyWithDetails
  onUpdate: (company: CompanyWithDetails) => void
  onDelete: (companyId: string) => void
  onClose: () => void
}

export function CompanyDetail({ company, onUpdate, onDelete, onClose }: CompanyDetailProps) {
  const { data: session } = useSession()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [detailedCompany, setDetailedCompany] = useState<CompanyWithDetails>(company)

  // Fetch detailed company information
  const fetchCompanyDetails = async () => {
    if (!session) return

    try {
      const response = await fetch(`/api/companies/${company.id}`)
      if (response.ok) {
        const data = await response.json()
        setDetailedCompany(data.data)
      }
    } catch (error) {
      console.error("Error fetching company details:", error)
    }
  }

  // Handle company update
  const handleCompanyUpdated = (updatedCompany: Company) => {
    // Convert Company to CompanyWithDetails
    const companyWithDetails: CompanyWithDetails = {
      ...updatedCompany,
      contacts: detailedCompany.contacts,
      deals: detailedCompany.deals,
      _count: detailedCompany._count,
    }
    setDetailedCompany(companyWithDetails)
    onUpdate(companyWithDetails)
    setIsEditDialogOpen(false)
    // Refresh details to get updated relationships
    fetchCompanyDetails()
  }

  // Handle company deletion
  const handleDeleteCompany = async () => {
    if (!session) return

    setLoading(true)
    try {
      const response = await fetch(`/api/companies/${company.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete company")
      }

      toast.success("Company deleted successfully")
      onDelete(company.id)
    } catch (error) {
      console.error("Error deleting company:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to delete company"
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

  // Format company size for display
  const formatCompanySize = (size?: string) => {
    if (!size) return "—"
    const sizeMap: { [key: string]: string } = {
      startup: "Startup (1-10 employees)",
      small: "Small (11-50 employees)",
      medium: "Medium (51-200 employees)",
      large: "Large (201-1000 employees)",
      enterprise: "Enterprise (1000+ employees)",
    }
    return sizeMap[size] || size.charAt(0).toUpperCase() + size.slice(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{detailedCompany.name}</h2>
          {detailedCompany.industry && (
            <p className="text-muted-foreground capitalize">{detailedCompany.industry}</p>
          )}
          {detailedCompany.size && (
            <p className="text-sm text-muted-foreground">
              {formatCompanySize(detailedCompany.size)}
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

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {detailedCompany.domain && (
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Website</p>
                  <a 
                    href={detailedCompany.domain}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {detailedCompany.domain}
                  </a>
                </div>
              </div>
            )}
            {detailedCompany.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{detailedCompany.phone}</p>
                </div>
              </div>
            )}
          </div>
          
          {detailedCompany.address && (
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{detailedCompany.address}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{formatDate(detailedCompany.createdAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contacts ({detailedCompany._count?.contacts || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detailedCompany.contacts && detailedCompany.contacts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedCompany.contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      {contact.firstName} {contact.lastName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {contact.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.jobTitle || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {contact.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {contact.phone}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(contact.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No contacts associated with this company
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Deals ({detailedCompany._count?.deals || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detailedCompany.deals && detailedCompany.deals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Expected Close</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedCompany.deals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-medium">{deal.title}</TableCell>
                    <TableCell>{formatCurrency(deal.amount)}</TableCell>
                    <TableCell>
                      <span className="capitalize">{deal.stage}</span>
                    </TableCell>
                    <TableCell>{deal.probability}%</TableCell>
                    <TableCell>
                      {deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : "—"}
                    </TableCell>
                    <TableCell>{formatDate(deal.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No deals associated with this company
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
          </DialogHeader>
          <CompanyForm
            company={detailedCompany}
            onSuccess={handleCompanyUpdated}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {detailedCompany.name}? This action cannot be undone.
              {detailedCompany._count && (detailedCompany._count.contacts > 0 || detailedCompany._count.deals > 0) && (
                <span className="block mt-2 text-amber-600">
                  Warning: This company has {detailedCompany._count.contacts} associated contact(s) and {detailedCompany._count.deals} deal(s).
                  The contacts and deals will remain but will no longer be linked to this company.
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
              onClick={handleDeleteCompany}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}