import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CreateContactSchema, ContactFiltersSchema, PaginationSchema } from "@/lib/validations"
import { sanitizeContactInput } from "@/lib/sanitization"
import { z } from "zod"

// GET /api/contacts - List contacts with search, filtering, and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Parse and validate query parameters
    const paginationParams = PaginationSchema.parse({
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10,
    })

    const filterParams = ContactFiltersSchema.parse({
      search: searchParams.get('search') || undefined,
      companyId: searchParams.get('companyId') || undefined,
      organizationId: session.user.organizationId,
    })

    // Build where clause for filtering
    const where: any = {
      organizationId: session.user.organizationId,
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

    return NextResponse.json({
      data: contacts,
      pagination: {
        page: paginationParams.page,
        limit: paginationParams.limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error("Error fetching contacts:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/contacts - Create a new contact
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Sanitize input first
    const sanitizedInput = sanitizeContactInput(body)
    
    // Validate input
    const validatedData = CreateContactSchema.parse({
      ...sanitizedInput,
      organizationId: session.user.organizationId,
    })

    // Check if contact with this email already exists in the organization
    const existingContact = await prisma.contact.findFirst({
      where: {
        email: validatedData.email,
        organizationId: session.user.organizationId,
      },
    })

    if (existingContact) {
      return NextResponse.json(
        { error: "Contact with this email already exists" },
        { status: 400 }
      )
    }

    // Verify company exists if companyId is provided
    if (validatedData.companyId) {
      const company = await prisma.company.findFirst({
        where: {
          id: validatedData.companyId,
          organizationId: session.user.organizationId,
        },
      })

      if (!company) {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 400 }
        )
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

    return NextResponse.json(
      {
        message: "Contact created successfully",
        data: contact,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating contact:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}