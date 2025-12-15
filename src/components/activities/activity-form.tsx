"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Activity, ActivityType, Contact, Deal } from "@/types"

const activityFormSchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'task', 'note'] as const),
  subject: z.string().min(1, "Subject is required").max(255, "Subject too long"),
  description: z.string().max(1000, "Description too long").optional(),
  dueDate: z.string().optional(),
  completed: z.boolean().default(false),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
})

type ActivityFormData = z.infer<typeof activityFormSchema>

interface ActivityFormProps {
  activity?: Activity
  contacts?: Contact[]
  deals?: Deal[]
  onSubmit: (data: ActivityFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

const activityTypes: { value: ActivityType; label: string }[] = [
  { value: 'call', label: 'Phone Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'task', label: 'Task' },
  { value: 'note', label: 'Note' },
]

export function ActivityForm({
  activity,
  contacts = [],
  deals = [],
  onSubmit,
  onCancel,
  isLoading = false,
}: ActivityFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      type: activity?.type || 'note',
      subject: activity?.subject || '',
      description: activity?.description || '',
      dueDate: activity?.dueDate ? new Date(activity.dueDate).toISOString().slice(0, 16) : '',
      completed: activity?.completed || false,
      contactId: activity?.contactId || '',
      dealId: activity?.dealId || '',
    },
  })

  const selectedType = watch('type')

  useEffect(() => {
    if (activity) {
      reset({
        type: activity.type,
        subject: activity.subject,
        description: activity.description || '',
        dueDate: activity.dueDate ? new Date(activity.dueDate).toISOString().slice(0, 16) : '',
        completed: activity.completed || false,
        contactId: activity.contactId || '',
        dealId: activity.dealId || '',
      })
    }
  }, [activity, reset])

  const handleFormSubmit = async (data: ActivityFormData) => {
    try {
      setIsSubmitting(true)
      await onSubmit(data)
      
      if (!activity) {
        // Reset form for new activities
        reset()
        toast.success("Activity created successfully")
      } else {
        toast.success("Activity updated successfully")
      }
    } catch (error) {
      console.error("Error submitting activity:", error)
      toast.error("Failed to save activity")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {activity ? 'Edit Activity' : 'Create New Activity'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Activity Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              value={selectedType}
              onValueChange={(value) => setValue('type', value as ActivityType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select activity type" />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-600">{errors.type.message}</p>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              {...register('subject')}
              placeholder="Enter activity subject"
            />
            {errors.subject && (
              <p className="text-sm text-red-600">{errors.subject.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter activity description"
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* Due Date (for tasks) */}
          {selectedType === 'task' && (
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                {...register('dueDate')}
              />
              {errors.dueDate && (
                <p className="text-sm text-red-600">{errors.dueDate.message}</p>
              )}
            </div>
          )}

          {/* Contact Association */}
          <div className="space-y-2">
            <Label htmlFor="contactId">Associated Contact</Label>
            <Select
              value={watch('contactId') || ''}
              onValueChange={(value) => setValue('contactId', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a contact (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No contact</SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName} ({contact.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Deal Association */}
          <div className="space-y-2">
            <Label htmlFor="dealId">Associated Deal</Label>
            <Select
              value={watch('dealId') || ''}
              onValueChange={(value) => setValue('dealId', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a deal (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No deal</SelectItem>
                {deals.map((deal) => (
                  <SelectItem key={deal.id} value={deal.id}>
                    {deal.title} ({deal.stage})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Completed (for existing activities) */}
          {activity && (
            <div className="flex items-center space-x-2">
              <input
                id="completed"
                type="checkbox"
                {...register('completed')}
                className="rounded border-gray-300"
              />
              <Label htmlFor="completed">Mark as completed</Label>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting || isLoading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? 'Saving...' : activity ? 'Update Activity' : 'Create Activity'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}