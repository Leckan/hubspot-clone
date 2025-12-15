import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { UpdateContactSchema } from "@/lib/validations"
import { sanitizeContactInput } from "@/lib/sanitization"
import { 
  withErrorHandler, 
  requireAuth, 
  validateRequest, 
  createSuccessResponse 
} from "@/lib/api-error-handler"
import { 
  safeUpdate, 
  ConflictResolutionStrategy 
} from "@/lib/concurrency"
import { 
  getWithAccuracyCheck,
  CacheManager 
} from "@/lib/data-integrity"
import { NotFoundError, ConflictError } from "@/lib/errors"

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/contacts/[id] - Get contact details with accuracy validation
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params?: any }
) => {
  const params = context?.params as { id: string }
  const { organizationId } = await requireAuth(request)

  // Use cached data retrieval with accuracy checks
  const contact = await getWithAccuracyCheck(
    'contact',
    params.id,
    async () => {
      const result = await prisma.contact.findFirst({
        where: {
          id: params.id,
          organizationId,
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              domain: true,
              industry: true,
            },
          },
          deals: {
            select: {
              id: true,
              title: true,
              amount: true,
              stage: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          activities: {
            select: {
              id: true,
              type: true,
              subject: true,
              dueDate: true,
              completed: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 10, // Limit to recent activities
          },
          _count: {
            select: {
              deals: true,
              activities: true,
            },
          },
        },
      })
      
      if (!result) {
        throw new NotFoundError("Contact")
      }
      
      return result
    },
    // Validation function to ensure data integrity
    (data) => {
      if (!data) return false
      
      // Basic validation checks
      if (!data.email || !data.firstName || !data.lastName) return false
      
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) return false
      
      // Organization consistency
      if (data.organizationId !== organizationId) return false
      
      // Company relationship consistency
      if (data.companyId && data.company && data.company.id !== data.companyId) return false
      
      return true
    }
  )

  return createSuccessResponse(contact)
})

// PUT /api/contacts/[id] - Update contact with concurrent modification handling
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context?: { params?: any }
) => {
  const params = context?.params as { id: string }
  const { organizationId } = await requireAuth(request)

  const body = await request.json()
  
  // Sanitize input first
  const sanitizedInput = sanitizeContactInput(body)
  
  // Validate input (including expected version for optimistic locking)
  const validatedData = validateRequest(sanitizedInput, UpdateContactSchema)
  const expectedVersion = body.version || 1 // Client should send current version

  // Check if contact exists and belongs to user's organization
  const existingContact = await prisma.contact.findFirst({
    where: {
      id: params.id,
      organizationId,
    },
  })

  if (!existingContact) {
    throw new NotFoundError("Contact")
  }

  // Check if email is being changed and if it conflicts with another contact
  if (validatedData.email && validatedData.email !== existingContact.email) {
    const emailConflict = await prisma.contact.findFirst({
      where: {
        email: validatedData.email,
        organizationId,
        id: {
          not: params.id,
        },
      },
    })

    if (emailConflict) {
      throw new ConflictError("Contact with this email already exists")
    }
  }

  // Verify company exists if companyId is being changed
  if (validatedData.companyId) {
    const company = await prisma.company.findFirst({
      where: {
        id: validatedData.companyId,
        organizationId,
      },
    })

    if (!company) {
      throw new NotFoundError("Company")
    }
  }

  // Perform safe update with optimistic locking
  const updatedContact = await safeUpdate(
    'contact',
    params.id,
    expectedVersion,
    validatedData,
    ConflictResolutionStrategy.RETRY // Retry on conflicts
  )

  // Invalidate cache for updated contact and related entities
  CacheManager.invalidateEntityCache('contact', params.id)
  
  // Fetch updated contact with relations
  const contactWithRelations = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          domain: true,
        },
      },
    },
  })

  return createSuccessResponse(contactWithRelations, "Contact updated successfully")
})

// DELETE /api/contacts/[id] - Delete contact
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params?: any }
) => {
  const params = context?.params as { id: string }
  const { organizationId } = await requireAuth(request)

  // Check if contact exists and belongs to user's organization
  const existingContact = await prisma.contact.findFirst({
    where: {
      id: params.id,
      organizationId,
    },
    include: {
      _count: {
        select: {
          deals: true,
          activities: true,
        },
      },
    },
  })

  if (!existingContact) {
    throw new NotFoundError("Contact")
  }

  // Use transaction to handle related data properly with concurrent safety
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Update deals to remove contact association (don't delete deals)
    const dealsUpdated = await tx.deal.updateMany({
      where: {
        contactId: params.id,
      },
      data: {
        contactId: null,
      },
    })

    // Delete activities associated with this contact
    const activitiesDeleted = await tx.activity.deleteMany({
      where: {
        contactId: params.id,
      },
    })

    // Delete the contact
    await tx.contact.delete({
      where: {
        id: params.id,
      },
    })

    return {
      id: params.id,
      dealsUpdated: dealsUpdated.count,
      activitiesDeleted: activitiesDeleted.count,
    }
  })

  // Invalidate cache for deleted contact and related entities
  CacheManager.invalidateEntityCache('contact', params.id)

  return createSuccessResponse(result, "Contact deleted successfully")
})