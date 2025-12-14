"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Search, Plus, Filter, MoreHorizontal, Globe, Building, Users, DollarSign } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CompanyForm } from "./company-form"
import { CompanyDetail } from "./company-detail"
import { Company } from "@/types"

interface CompanyWithCounts {
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
  _count?: {
    contacts: number
    deals: number
  }
}

interface CompanyListProps {
  initialCompanies?: CompanyWithCounts[]
  initialPagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function CompanyList({ initialCompanies = [], initialPagination }: CompanyListProps) {
  const { data: session } = useSession()
  const [companies, setCompanies] = useState<CompanyWithCounts[]>(initialCompanies)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIndustry, setSelectedIndustry] = useState<string>("")
  const [selectedSize, setSelectedSize] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(initialPagination?.page || 1)
  const [pagination, setPagination] = useState(initialPagination)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithCounts | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  // Fetch companies with filters
  const fetchCompanies = async (
    page = 1, 
    search = searchTerm, 
    industry = selectedIndustry,
    size = selectedSize
  ) => {
    if (!session) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      })

      if (search) params.append("search", search)
      if (industry) params.append("industry", industry)
      if (size) params.append("size", size)

      const response = await fetch(`/api/companies?${params}`)
      if (!response.ok) throw new Error("Failed to fetch companies")

      const data = await response.json()
      setCompanies(data.data)
      setPagination(data.pagination)
      setCurrentPage(page)
    } catch (error) {
      console.error("Error fetching companies:", error)
    } finally {
      setLoading(false)
    }
  }

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== "" || selectedIndustry !== "" || selectedSize !== "") {
        fetchCompanies(1, searchTerm, selectedIndustry, selectedSize)
      } else if (searchTerm === "" && selectedIndustry === "" && selectedSize === "") {
        fetchCompanies(1)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, selectedIndustry, selectedSize])

  // Handle company creation success
  const handleCompanyCreated = (newCompany: CompanyWithCounts) => {
    setCompanies(prev => [newCompany, ...prev])
    setIsCreateDialogOpen(false)
    // Refresh the list to get updated pagination
    fetchCompanies(currentPage)
  }

  // Handle company update success
  const handleCompanyUpdated = (updatedCompany: CompanyWithCounts) => {
    setCompanies(prev => 
      prev.map(company => 
        company.id === updatedCompany.id ? updatedCompany : company
      )
    )
    setSelectedCompany(updatedCompany)
  }

  // Handle company deletion
  const handleCompanyDeleted = (companyId: string) => {
    setCompanies(prev => prev.filter(company => company.id !== companyId))
    setIsDetailDialogOpen(false)
    setSelectedCompany(null)
    // Refresh the list to get updated pagination
    fetchCompanies(currentPage)
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    fetchCompanies(page, searchTerm, selectedIndustry, selectedSize)
  }

  // Open company detail
  const handleCompanyClick = (company: CompanyWithCounts) => {
    setSelectedCompany(company)
    setIsDetailDialogOpen(true)
  }

  // Format company size for display
  const formatCompanySize = (size?: string) => {
    if (!size) return "—"
    return size.charAt(0).toUpperCase() + size.slice(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Companies</h1>
          <p className="text-muted-foreground">
            Manage your company records and business relationships
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Company</DialogTitle>
            </DialogHeader>
            <CompanyForm
              onSuccess={handleCompanyCreated}
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
                placeholder="Search companies by name, domain, or industry..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Industries</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="healthcare">Healthcare</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="manufacturing">Manufacturing</SelectItem>
                <SelectItem value="education">Education</SelectItem>
                <SelectItem value="consulting">Consulting</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Sizes</SelectItem>
                <SelectItem value="startup">Startup</SelectItem>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Company List */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Companies
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
              <div className="text-muted-foreground">Loading companies...</div>
            </div>
          ) : companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-muted-foreground mb-2">No companies found</div>
              <p className="text-sm text-muted-foreground">
                {searchTerm || selectedIndustry || selectedSize
                  ? "Try adjusting your search criteria"
                  : "Get started by creating your first company"}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Contacts</TableHead>
                    <TableHead>Deals</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow
                      key={company.id}
                      className="cursor-pointer"
                      onClick={() => handleCompanyClick(company)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{company.name}</div>
                            {company.address && (
                              <div className="text-sm text-muted-foreground">
                                {company.address}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {company.industry ? (
                          <span className="capitalize">{company.industry}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">
                          {formatCompanySize(company.size)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {company.domain ? (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            {company.domain}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {company._count?.contacts || 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {company._count?.deals || 0}
                          </span>
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
                    {pagination.total} companies
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

      {/* Company Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedCompany && (
            <CompanyDetail
              company={selectedCompany}
              onUpdate={handleCompanyUpdated}
              onDelete={handleCompanyDeleted}
              onClose={() => setIsDetailDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}