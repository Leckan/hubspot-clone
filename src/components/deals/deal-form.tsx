"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { DealStage } from "@/types"

const dealFormSchema = z.object({
  title: z.string().min(1, "Deal title is required").max(255, "Deal title too long"),
  amount: z.string().optional(),
  stage: z.enum(["lead", "qualified", "proposal", "negotiation", "won", "lost"]),
  probability: z.string(),
  expectedCloseDate: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
})

type DealFormData = z.infer<typeof dealFormSchema>

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  company?: {
    id: string
    name: string
  }
}

interface Company {
  id: string
  name: string
  domain?: string
}

interface DealFormProps {
  onSuccess: (deal: any) => void
  onCancel: () => void
  initialData?: Partial<DealFormData>
}

const STAGE_OPTIONS: { value: DealStage; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
]

export function DealForm({ onSuccess, onCancel, initialData }: DealFormProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  

  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DealFormData>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      amount: initialData?.amount?.toString() || "",
      stage: initialData?.stage || "lead",
      probability: initialData?.probability?.toString() || "0",
      expectedCloseDate: initialData?.expectedCloseDate 
        ? new Date(initialData.expectedCloseDate).toISOString().split('T')[0]
        : "",
      contactId: initialData?.contactId || "",
      companyId: initialData?.companyId || "",
    },
  })

  const selectedContactId = watch("contactId")
  const selectedCompanyId = watch("companyId")

  // Fetch contacts and companies for dropdowns
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
          setContacts(contactsData.data?.contacts || [])
        }

        if (companiesRes.ok) {
          const companiesData = await companiesRes.json()
          setCompanies(companiesData.data || [])
        }
      } catch (error) {
        console.error("Error fetching options:", error)
      } finally {
        setLoadingOptions(false)
      }
    }

    fetchOptions()
  }, [session])

  // Auto-select company when contact is selected
  useEffect(() => {
    if (selectedContactId) {
      const selectedContact = contacts.find(c => c.id === selectedContactId)
      if (selectedContact?.company && !selectedCompanyId) {
        setValue("companyId", selectedContact.company.id)
      }
    }
  }, [selectedContactId, contacts, selectedCompanyId, setValue])

  const onSubmit = async (data: DealFormData) => {
    if (!session?.user?.id) return

    setLoading(true)
    try {
      // Transform form data to API format
      const submitData = {
        title: data.title,
        amount: data.amount && data.amount !== "" ? parseFloat(data.amount) : undefined,
        stage: data.stage,
        probability: parseInt(data.probability) || 0,
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : undefined,
        contactId: data.contactId && data.contactId !== "none" ? data.contactId : undefined,
        companyId: data.companyId && data.companyId !== "none" ? data.companyId : undefined,
        ownerId: session.user.id,
      }

      const response = await fetch("/api/deals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create deal")
      }

      const result = await response.json()
      onSuccess(result.data)
    } catch (error) {
      console.error("Error creating deal:", error)
      alert(error instanceof Error ? error.message : "Failed to create deal")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Deal Title */}
        <div className="md:col-span-2">
          <Label htmlFor="title">Deal Title *</Label>
          <Input
            id="title"
            {...register("title")}
            placeholder="Enter deal title"
            className="mt-1"
          />
          {errors.title && (
            <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Amount */}
        <div>
          <Label htmlFor="amount">Deal Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            {...register("amount")}
            placeholder="0.00"
            className="mt-1"
          />
          {errors.amount && (
            <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>
          )}
        </div>

        {/* Probability */}
        <div>
          <Label htmlFor="probability">Probability (%)</Label>
          <Input
            id="probability"
            type="number"
            min="0"
            max="100"
            {...register("probability")}
            placeholder="0"
            className="mt-1"
          />
          {errors.probability && (
            <p className="text-sm text-red-600 mt-1">{errors.probability.message}</p>
          )}
        </div>

        {/* Stage */}
        <div>
          <Label htmlFor="stage">Stage</Label>
          <Select
            value={watch("stage")}
            onValueChange={(value) => setValue("stage", value as DealStage)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              {STAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.stage && (
            <p className="text-sm text-red-600 mt-1">{errors.stage.message}</p>
          )}
        </div>

        {/* Expected Close Date */}
        <div>
          <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
          <Input
            id="expectedCloseDate"
            type="date"
            {...register("expectedCloseDate")}
            className="mt-1"
          />
          {errors.expectedCloseDate && (
            <p className="text-sm text-red-600 mt-1">{errors.expectedCloseDate.message}</p>
          )}
        </div>

        {/* Contact */}
        <div>
          <Label htmlFor="contactId">Contact</Label>
          <Select
            value={selectedContactId}
            onValueChange={(value) => setValue("contactId", value)}
            disabled={loadingOptions}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={loadingOptions ? "Loading..." : "Select contact"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No contact</SelectItem>
              {contacts.map((contact) => (
                <SelectItem key={contact.id} value={contact.id}>
                  {contact.firstName} {contact.lastName}
                  {contact.company && ` (${contact.company.name})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.contactId && (
            <p className="text-sm text-red-600 mt-1">{errors.contactId.message}</p>
          )}
        </div>

        {/* Company */}
        <div>
          <Label htmlFor="companyId">Company</Label>
          <Select
            value={selectedCompanyId}
            onValueChange={(value) => setValue("companyId", value)}
            disabled={loadingOptions}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={loadingOptions ? "Loading..." : "Select company"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No company</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                  {company.domain && ` (${company.domain})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.companyId && (
            <p className="text-sm text-red-600 mt-1">{errors.companyId.message}</p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Deal"}
        </Button>
      </div>
    </form>
  )
}