import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CreateCompanySchema, CompanyFiltersSchema, PaginationSchema } from "@/lib/validations"
import { sanitizeCompanyInput } from "@/lib/sanitization"
import { z } from "zod"

// GET /api/companies - List companies with search, filtering, and pagination
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

    const filterParams = CompanyFiltersSchema.parse({
      search: searchParams.get('search') || undefined,
      industry: searchParams.get('industry') || undefined,
      size: searchParams.get('size') || undefined,
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
          name: {
            contains: filterParams.search,
            mode: 'insensitive',
          },
        },
        {
          domain: {
            contains: filterParams.search,
            mode: 'insensitive',
          },
        },
        {
          industry: {
            contains: filterParams.search,
            mode: 'insensitive',
          },
        },
      ]
    }

    // Add industry filter
    if (filterParams.industry) {
      where.industry = {
        contains: filterParams.industry,
        mode: 'insensitive',
      }
    }

    // Add size filter
    if (filterParams.size) {
      where.size = filterParams.size
    }

    // Calculate pagination
    const skip = (paginationParams.page - 1) * paginationParams.limit
    const take = paginationParams.limit

    // Get total count for pagination
    const total = await prisma.company.count({ where })

    // Fetch companies with relations
    const companies = await prisma.company.findMany({
      where,
      skip,
      take,
      include: {
        _count: {
          select: {
            contacts: true,
            deals: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const totalPages = Math.ceil(total / paginationParams.limit)

    return NextResponse.json({
      data: companies,
      pagination: {
        page: paginationParams.page,
        limit: paginationParams.limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error("Error fetching companies:", error)
    
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

// POST /api/companies - Create a new company
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
    const sanitizedInput = sanitizeCompanyInput(body)
    
    // Validate input
    const validatedData = CreateCompanySchema.parse({
      ...sanitizedInput,
      organizationId: session.user.organizationId,
    })

    // Check if company with this name already exists in the organization
    const existingCompany = await prisma.company.findFirst({
      where: {
        name: validatedData.name,
        organizationId: session.user.organizationId,
      },
    })

    if (existingCompany) {
      return NextResponse.json(
        { error: "Company with this name already exists" },
        { status: 400 }
      )
    }

    // Check if domain is provided and already exists
    if (validatedData.domain) {
      const existingDomain = await prisma.company.findFirst({
        where: {
          domain: validatedData.domain,
          organizationId: session.user.organizationId,
        },
      })

      if (existingDomain) {
        return NextResponse.json(
          { error: "Company with this domain already exists" },
          { status: 400 }
        )
      }
    }

    // Create company
    const company = await prisma.company.create({
      data: validatedData,
      include: {
        _count: {
          select: {
            contacts: true,
            deals: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: "Company created successfully",
        data: company,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating company:", error)
    
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