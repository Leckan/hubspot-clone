import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PaginationSchema } from "@/lib/validations"
import { z } from "zod"

// GET /api/activities/history - Get activity history for contact or deal
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
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    })

    const contactId = searchParams.get('contactId')
    const dealId = searchParams.get('dealId')

    // Must provide either contactId or dealId
    if (!contactId && !dealId) {
      return NextResponse.json(
        { error: "Either contactId or dealId must be provided" },
        { status: 400 }
      )
    }

    // Build where clause
    const where: any = {
      organizationId: session.user.organizationId,
    }

    if (contactId) {
      // Verify contact exists and belongs to organization
      const contact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          organizationId: session.user.organizationId,
        },
      })

      if (!contact) {
        return NextResponse.json(
          { error: "Contact not found" },
          { status: 404 }
        )
      }

      where.contactId = contactId
    }

    if (dealId) {
      // Verify deal exists and belongs to organization
      const deal = await prisma.deal.findFirst({
        where: {
          id: dealId,
          organizationId: session.user.organizationId,
        },
      })

      if (!deal) {
        return NextResponse.json(
          { error: "Deal not found" },
          { status: 404 }
        )
      }

      where.dealId = dealId
    }

    // Calculate pagination
    const skip = (paginationParams.page - 1) * paginationParams.limit
    const take = paginationParams.limit

    // Get total count for pagination
    const total = await prisma.activity.count({ where })

    // Fetch activities in chronological order (most recent first)
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
      orderBy: {
        createdAt: 'desc',
      },
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
    console.error("Error fetching activity history:", error)
    
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