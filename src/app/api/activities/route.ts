import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CreateActivitySchema, ActivityFiltersSchema, PaginationSchema } from "@/lib/validations"
import { z } from "zod"

// GET /api/activities - List activities with filtering and pagination
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

    const filterParams = ActivityFiltersSchema.parse({
      type: searchParams.get('type') || undefined,
      completed: searchParams.get('completed') ? searchParams.get('completed') === 'true' : undefined,
      contactId: searchParams.get('contactId') || undefined,
      dealId: searchParams.get('dealId') || undefined,
      userId: searchParams.get('userId') || undefined,
      overdue: searchParams.get('overdue') ? searchParams.get('overdue') === 'true' : undefined,
      organizationId: session.user.organizationId,
    })

    // Build where clause for filtering
    const where: any = {
      organizationId: session.user.organizationId,
    }

    // Add type filter
    if (filterParams.type) {
      where.type = filterParams.type
    }

    // Add completed filter
    if (filterParams.completed !== undefined) {
      where.completed = filterParams.completed
    }

    // Add contact filter
    if (filterParams.contactId) {
      where.contactId = filterParams.contactId
    }

    // Add deal filter
    if (filterParams.dealId) {
      where.dealId = filterParams.dealId
    }

    // Add user filter
    if (filterParams.userId) {
      where.userId = filterParams.userId
    }

    // Add overdue filter
    if (filterParams.overdue) {
      where.dueDate = {
        lt: new Date(),
      }
      where.completed = false
    }

    // Calculate pagination
    const skip = (paginationParams.page - 1) * paginationParams.limit
    const take = paginationParams.limit

    // Get total count for pagination
    const total = await prisma.activity.count({ where })

    // Fetch activities with relations
    const activities = await prisma.activity.findMany({
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
        deal: {
          select: {
            id: true,
            title: true,
            stage: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        {
          dueDate: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ],
    })

    const totalPages = Math.ceil(total / paginationParams.limit)

    return NextResponse.json({
      data: activities,
      pagination: {
        page: paginationParams.page,
        limit: paginationParams.limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error("Error fetching activities:", error)
    
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

// POST /api/activities - Create a new activity
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
    
    // Validate input
    const validatedData = CreateActivitySchema.parse({
      ...body,
      userId: session.user.id,
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

    // Verify deal exists if dealId is provided
    if (validatedData.dealId) {
      const deal = await prisma.deal.findFirst({
        where: {
          id: validatedData.dealId,
          organizationId: session.user.organizationId,
        },
      })

      if (!deal) {
        return NextResponse.json(
          { error: "Deal not found" },
          { status: 400 }
        )
      }
    }

    // Create activity
    const activity = await prisma.activity.create({
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
        deal: {
          select: {
            id: true,
            title: true,
            stage: true,
          },
        },
        user: {
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
        message: "Activity created successfully",
        data: activity,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating activity:", error)
    
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