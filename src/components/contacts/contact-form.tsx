"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Contact, Company } from "@/types"

// Form validation schema
const contactFormSchema = z.object({
  firstName: z.string()
    .min(1, "First name is required")
    .max(255, "First name too long"),
  lastName: z.string()
    .min(1, "Last name is required")
    .max(255, "Last name too long"),
  email: z.string()
    .min(1, "Email is required")
    .email("Invalid email format"),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  companyId: z.string().optional(),
})

type ContactFormData = z.infer<typeof contactFormSchema>

interface ContactFormProps {
  contact?: {
    id?: string
    firstName: string
    lastName: string
    email: string
    phone?: string
    jobTitle?: string
    companyId?: string
  }
  onSuccess: (contact: Contact) => void
  onCancel: () => void
}

export function ContactForm({ contact, onSuccess, onCancel }: ContactFormProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: contact?.firstName || "",
      lastName: contact?.lastName || "",
      email: contact?.email || "",
      phone: contact?.phone || "",
      jobTitle: contact?.jobTitle || "",
      companyId: contact?.companyId || "",
    },
  })

  // Fetch companies for the dropdown
  useEffect(() => {
    const fetchCompanies = async () => {
      if (!session) return

      setLoadingCompanies(true)
      try {
        const response = await fetch("/api/companies?limit=100")
        if (response.ok) {
          const data = await response.json()
          setCompanies(data.data || [])
        }
      } catch (error) {
        console.error("Error fetching companies:", error)
      } finally {
        setLoadingCompanies(false)
      }
    }

    fetchCompanies()
  }, [session])

  const onSubmit = async (data: ContactFormData) => {
    if (!session) return

    setLoading(true)
    try {
      const url = contact ? `/api/contacts/${contact.id}` : "/api/contacts"
      const method = contact ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          // Convert empty strings to undefined for optional fields
          phone: data.phone || undefined,
          jobTitle: data.jobTitle || undefined,
          companyId: data.companyId === 'no-company' ? undefined : data.companyId || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save contact")
      }

      const result = await response.json()
      toast.success(
        contact ? "Contact updated successfully" : "Contact created successfully"
      )
      onSuccess(result.data)
    } catch (error) {
      console.error("Error saving contact:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to save contact"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} className="touch-manipulation" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} className="touch-manipulation" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="john.doe@example.com"
                  {...field}
                  className="touch-manipulation"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    {...field}
                    className="touch-manipulation"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="jobTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Title</FormLabel>
                <FormControl>
                  <Input placeholder="Software Engineer" {...field} className="touch-manipulation" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="companyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={loadingCompanies}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="no-company">No company</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="touch-manipulation"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="touch-manipulation">
            {loading
              ? contact
                ? "Updating..."
                : "Creating..."
              : contact
              ? "Update Contact"
              : "Create Contact"}
          </Button>
        </div>
      </form>
    </Form>
  )
}