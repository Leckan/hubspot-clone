import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UpdateDealSchema } from "@/lib/validations"
import { sanitizeDealInput } from "@/lib/sanitization"
import { z } from "zod"

// GET /api/deals/[id] - Get deal details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: "Deal ID is required" },
        { status: 400 }
      )
    }

    // Fetch deal with relations
    const deal = await prisma.deal.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            jobTitle: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            domain: true,
            industry: true,
            size: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        activities: {
          select: {
            id: true,
            type: true,
            subject: true,
            description: true,
            dueDate: true,
            completed: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10, // Limit to recent activities
        },
      },
    })

    if (!deal) {
      return NextResponse.json(
        { error: "Deal not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: deal,
    })
  } catch (error) {
    console.error("Error fetching deal:", error)
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/deals/[id] - Update deal
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: "Deal ID is required" },
        { status: 400 }
      )
    }

    // Check if deal exists and belongs to the organization
    const existingDeal = await prisma.deal.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    })

    if (!existingDeal) {
      return NextResponse.json(
        { error: "Deal not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    
    // Sanitize input first
    const sanitizedInput = sanitizeDealInput(body)
    
    // Validate input
    const validatedData = UpdateDealSchema.parse(sanitizedInput)

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

    // Update deal
    const updatedDeal = await prisma.deal.update({
      where: { id },
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

    return NextResponse.json({
      message: "Deal updated successfully",
      data: updatedDeal,
    })
  } catch (error) {
    console.error("Error updating deal:", error)
    
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

// DELETE /api/deals/[id] - Delete deal
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: "Deal ID is required" },
        { status: 400 }
      )
    }

    // Check if deal exists and belongs to the organization
    const existingDeal = await prisma.deal.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    })

    if (!existingDeal) {
      return NextResponse.json(
        { error: "Deal not found" },
        { status: 404 }
      )
    }

    // Delete deal (activities will be handled by cascade or set to null)
    await prisma.deal.delete({
      where: { id },
    })

    return NextResponse.json({
      message: "Deal deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting deal:", error)
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}