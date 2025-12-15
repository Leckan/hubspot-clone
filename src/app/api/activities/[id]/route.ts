import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UpdateActivitySchema } from "@/lib/validations"
import { z } from "zod"

// GET /api/activities/[id] - Get activity by ID
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

    const activity = await prisma.activity.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
      },
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

    if (!activity) {
      return NextResponse.json(
        { error: "Activity not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: activity,
    })
  } catch (error) {
    console.error("Error fetching activity:", error)
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/activities/[id] - Update activity
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

    // Check if activity exists and belongs to user's organization
    const existingActivity = await prisma.activity.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
      },
    })

    if (!existingActivity) {
      return NextResponse.json(
        { error: "Activity not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    
    // Validate input
    const validatedData = UpdateActivitySchema.parse(body)

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

    // Update activity
    const activity = await prisma.activity.update({
      where: {
        id: params.id,
      },
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

    return NextResponse.json({
      message: "Activity updated successfully",
      data: activity,
    })
  } catch (error) {
    console.error("Error updating activity:", error)
    
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

// DELETE /api/activities/[id] - Delete activity
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

    // Check if activity exists and belongs to user's organization
    const existingActivity = await prisma.activity.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
      },
    })

    if (!existingActivity) {
      return NextResponse.json(
        { error: "Activity not found" },
        { status: 404 }
      )
    }

    // Delete activity
    await prisma.activity.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json({
      message: "Activity deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting activity:", error)
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}