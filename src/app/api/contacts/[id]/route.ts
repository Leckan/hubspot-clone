import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UpdateContactSchema } from "@/lib/validations"
import { sanitizeContactInput } from "@/lib/sanitization"
import { z } from "zod"

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/contacts/[id] - Get contact details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const contact = await prisma.contact.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
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

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: contact,
    })
  } catch (error) {
    console.error("Error fetching contact:", error)
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/contacts/[id] - Update contact
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
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
    const validatedData = UpdateContactSchema.parse(sanitizedInput)

    // Check if contact exists and belongs to user's organization
    const existingContact = await prisma.contact.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
      },
    })

    if (!existingContact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      )
    }

    // Check if email is being changed and if it conflicts with another contact
    if (validatedData.email && validatedData.email !== existingContact.email) {
      const emailConflict = await prisma.contact.findFirst({
        where: {
          email: validatedData.email,
          organizationId: session.user.organizationId,
          id: {
            not: params.id,
          },
        },
      })

      if (emailConflict) {
        return NextResponse.json(
          { error: "Contact with this email already exists" },
          { status: 400 }
        )
      }
    }

    // Verify company exists if companyId is being changed
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

    // Update contact
    const updatedContact = await prisma.contact.update({
      where: {
        id: params.id,
      },
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

    return NextResponse.json({
      message: "Contact updated successfully",
      data: updatedContact,
    })
  } catch (error) {
    console.error("Error updating contact:", error)
    
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

// DELETE /api/contacts/[id] - Delete contact
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if contact exists and belongs to user's organization
    const existingContact = await prisma.contact.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
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
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      )
    }

    // Use transaction to handle related data properly
    await prisma.$transaction(async (tx) => {
      // Update deals to remove contact association (don't delete deals)
      await tx.deal.updateMany({
        where: {
          contactId: params.id,
        },
        data: {
          contactId: null,
        },
      })

      // Delete activities associated with this contact
      await tx.activity.deleteMany({
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
    })

    return NextResponse.json({
      message: "Contact deleted successfully",
      data: {
        id: params.id,
        dealsUpdated: existingContact._count.deals,
        activitiesDeleted: existingContact._count.activities,
      },
    })
  } catch (error) {
    console.error("Error deleting contact:", error)
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}