import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { CreateContactSchema, ContactFiltersSchema, PaginationSchema } from "@/lib/validations"
import { sanitizeContactInput } from "@/lib/sanitization"
import { 
  withErrorHandler, 
  requireAuth, 
  validateRequest, 
  createSuccessResponse,
  rateLimit 
} from "@/lib/api-error-handler"
import { ConflictError, NotFoundError } from "@/lib/errors"

// GET /api/contacts - List contacts with search, filtering, and pagination
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { organizationId } = await requireAuth(request)
  
  // Apply rate limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  rateLimit(`contacts-get-${ip}`, 100, 60000) // 100 requests per minute
  
  const { searchParams } = new URL(request.url)
  
  // Parse and validate query parameters
  const paginationParams = validateRequest({
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10,
  }, PaginationSchema)

  const filterParams = validateRequest({
    search: searchParams.get('search') || undefined,
    companyId: searchParams.get('companyId') || undefined,
    organizationId,
  }, ContactFiltersSchema)

  // Build where clause for filtering
  const where: any = {
    organizationId,
  }

  // Add search functionality
  if (filterParams.search) {
    where.OR = [
      {
        firstName: {
          contains: filterParams.search,
          mode: 'insensitive',
        },
      },
      {
        lastName: {
          contains: filterParams.search,
          mode: 'insensitive',
        },
      },
      {
        email: {
          contains: filterParams.search,
          mode: 'insensitive',
        },
      },
    ]
  }

  // Add company filter
  if (filterParams.companyId) {
    where.companyId = filterParams.companyId
  }

  // Calculate pagination
  const skip = (paginationParams.page - 1) * paginationParams.limit
  const take = paginationParams.limit

  // Get total count for pagination
  const total = await prisma.contact.count({ where })

  // Fetch contacts with relations
  const contacts = await prisma.contact.findMany({
    where,
    skip,
    take,
    include: {
      company: {
        select: {
          id: true,
          name: true,
          domain: true,
        },
      },
      _count: {
        select: {
          deals: true,
          activities: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const totalPages = Math.ceil(total / paginationParams.limit)

  return createSuccessResponse({
    contacts,
    pagination: {
      page: paginationParams.page,
      limit: paginationParams.limit,
      total,
      totalPages,
    },
  })
})

// POST /api/contacts - Create a new contact
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { organizationId } = await requireAuth(request)
  
  // Apply rate limiting for contact creation
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  rateLimit(`contacts-post-${ip}`, 20, 60000) // 20 contact creations per minute

  const body = await request.json()
  
  // Sanitize input first
  const sanitizedInput = sanitizeContactInput(body)
  
  // Validate input
  const validatedData = validateRequest({
    ...sanitizedInput,
    organizationId,
  }, CreateContactSchema)

  // Check if contact with this email already exists in the organization
  const existingContact = await prisma.contact.findFirst({
    where: {
      email: validatedData.email,
      organizationId,
    },
  })

  if (existingContact) {
    throw new ConflictError("Contact with this email already exists")
  }

  // Verify company exists if companyId is provided
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

  // Create contact
  const contact = await prisma.contact.create({
    data: validatedData,
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

  return createSuccessResponse(contact, "Contact created successfully", 201)
})