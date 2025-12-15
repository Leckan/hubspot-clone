import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CreateDealSchema, DealFiltersSchema, PaginationSchema } from "@/lib/validations"
import { sanitizeDealInput } from "@/lib/sanitization"
import { z } from "zod"

// GET /api/deals - List deals with search, filtering, and pagination
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

    const filterParams = DealFiltersSchema.parse({
      search: searchParams.get('search') || undefined,
      stage: searchParams.get('stage') || undefined,
      ownerId: searchParams.get('ownerId') || undefined,
      companyId: searchParams.get('companyId') || undefined,
      contactId: searchParams.get('contactId') || undefined,
      minAmount: searchParams.get('minAmount') ? parseFloat(searchParams.get('minAmount')!) : undefined,
      maxAmount: searchParams.get('maxAmount') ? parseFloat(searchParams.get('maxAmount')!) : undefined,
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
          title: {
            contains: filterParams.search,
            mode: 'insensitive',
          },
        },
        {
          contact: {
            OR: [
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
            ],
          },
        },
        {
          company: {
            name: {
              contains: filterParams.search,
              mode: 'insensitive',
            },
          },
        },
      ]
    }

    // Add stage filter
    if (filterParams.stage) {
      where.stage = filterParams.stage
    }

    // Add owner filter
    if (filterParams.ownerId) {
      where.ownerId = filterParams.ownerId
    }

    // Add company filter
    if (filterParams.companyId) {
      where.companyId = filterParams.companyId
    }

    // Add contact filter
    if (filterParams.contactId) {
      where.contactId = filterParams.contactId
    }

    // Add amount range filters
    if (filterParams.minAmount !== undefined || filterParams.maxAmount !== undefined) {
      where.amount = {}
      if (filterParams.minAmount !== undefined) {
        where.amount.gte = filterParams.minAmount
      }
      if (filterParams.maxAmount !== undefined) {
        where.amount.lte = filterParams.maxAmount
      }
    }

    // Calculate pagination
    const skip = (paginationParams.page - 1) * paginationParams.limit
    const take = paginationParams.limit

    // Get total count for pagination
    const total = await prisma.deal.count({ where })

    // Fetch deals with relations
    const deals = await prisma.deal.findMany({
      where,
      skip,
      take,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            activities: true,
          },
        },
      },
      orderBy: [
        {
          stage: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ],
    })

    const totalPages = Math.ceil(total / paginationParams.limit)

    return NextResponse.json({
      data: deals,
      pagination: {
        page: paginationParams.page,
        limit: paginationParams.limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error("Error fetching deals:", error)
    
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

// POST /api/deals - Create a new deal
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.organizationId || !session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Sanitize input first
    const sanitizedInput = sanitizeDealInput(body)
    
    // Validate input
    const validatedData = CreateDealSchema.parse({
      ...sanitizedInput,
      ownerId: session.user.id,
      organizationId: session.user.organizationId,
    })

    // Verify contact exists if contactId is provided
    if (validatedData.contactId) {
      const contact = await prisma.contact.findFirst({
        where: {
          id: validatedData.contactId,
          organizationId: session.user.organizationId,
        },
      })

      if (!contact) {
        return NextResponse.json(
          { error: "Contact not found" },
          { status: 400 }
        )
      }
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

    // Create deal
    const deal = await prisma.deal.create({
      data: validatedData,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: "Deal created successfully",
        data: deal,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating deal:", error)
    
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