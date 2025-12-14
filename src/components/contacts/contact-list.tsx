"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Search, Plus, Filter, MoreHorizontal, Mail, Phone, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { ContactForm } from "./contact-form"
import { ContactDetail } from "./contact-detail"
import { Contact, Company } from "@/types"

interface ContactWithCompany {
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
  }
  _count?: {
    deals: number
    activities: number
  }
}

interface ContactListProps {
  initialContacts?: ContactWithCompany[]
  initialPagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function ContactList({ initialContacts = [], initialPagination }: ContactListProps) {
  const { data: session } = useSession()
  const [contacts, setContacts] = useState<ContactWithCompany[]>(initialContacts)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCompany, setSelectedCompany] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(initialPagination?.page || 1)
  const [pagination, setPagination] = useState(initialPagination)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<ContactWithCompany | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  // Fetch contacts with filters
  const fetchContacts = async (page = 1, search = searchTerm, companyId = selectedCompany) => {
    if (!session) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      })

      if (search) params.append("search", search)
      if (companyId) params.append("companyId", companyId)

      const response = await fetch(`/api/contacts?${params}`)
      if (!response.ok) throw new Error("Failed to fetch contacts")

      const data = await response.json()
      setContacts(data.data)
      setPagination(data.pagination)
      setCurrentPage(page)
    } catch (error) {
      console.error("Error fetching contacts:", error)
    } finally {
      setLoading(false)
    }
  }

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== "" || selectedCompany !== "") {
        fetchContacts(1, searchTerm, selectedCompany)
      } else if (searchTerm === "" && selectedCompany === "") {
        fetchContacts(1)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, selectedCompany])

  // Handle contact creation success
  const handleContactCreated = (newContact: ContactWithCompany) => {
    setContacts(prev => [newContact, ...prev])
    setIsCreateDialogOpen(false)
    // Refresh the list to get updated pagination
    fetchContacts(currentPage)
  }

  // Handle contact update success
  const handleContactUpdated = (updatedContact: ContactWithCompany) => {
    setContacts(prev => 
      prev.map(contact => 
        contact.id === updatedContact.id ? updatedContact : contact
      )
    )
    setSelectedContact(updatedContact)
  }

  // Handle contact deletion
  const handleContactDeleted = (contactId: string) => {
    setContacts(prev => prev.filter(contact => contact.id !== contactId))
    setIsDetailDialogOpen(false)
    setSelectedContact(null)
    // Refresh the list to get updated pagination
    fetchContacts(currentPage)
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    fetchContacts(page, searchTerm, selectedCompany)
  }

  // Open contact detail
  const handleContactClick = (contact: ContactWithCompany) => {
    setSelectedContact(contact)
    setIsDetailDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your contacts and customer relationships
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Contact</DialogTitle>
            </DialogHeader>
            <ContactForm
              onSuccess={handleContactCreated}
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
                placeholder="Search contacts by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact List */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Contacts
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
              <div className="text-muted-foreground">Loading contacts...</div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-muted-foreground mb-2">No contacts found</div>
              <p className="text-sm text-muted-foreground">
                {searchTerm || selectedCompany
                  ? "Try adjusting your search criteria"
                  : "Get started by creating your first contact"}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Deals</TableHead>
                    <TableHead>Activities</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer"
                      onClick={() => handleContactClick(contact)}
                    >
                      <TableCell>
                        <div className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </div>
                        {contact.jobTitle && (
                          <div className="text-sm text-muted-foreground">
                            {contact.jobTitle}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {contact.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.company ? (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            {contact.company.name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
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
                      <TableCell>
                        <span className="text-sm">
                          {contact._count?.deals || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {contact._count?.activities || 0}
                        </span>
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
                    {pagination.total} contacts
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

      {/* Contact Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedContact && (
            <ContactDetail
              contact={selectedContact}
              onUpdate={handleContactUpdated}
              onDelete={handleContactDeleted}
              onClose={() => setIsDetailDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}