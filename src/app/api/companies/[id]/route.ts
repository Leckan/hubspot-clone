import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UpdateCompanySchema } from "@/lib/validations"
import { sanitizeCompanyInput } from "@/lib/sanitization"
import { z } from "zod"

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/companies/[id] - Get company details
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

    const company = await prisma.company.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
      },
      include: {
        contacts: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            jobTitle: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        deals: {
          select: {
            id: true,
            title: true,
            amount: true,
            stage: true,
            probability: true,
            expectedCloseDate: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            contacts: true,
            deals: true,
          },
        },
      },
    })

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: company,
    })
  } catch (error) {
    console.error("Error fetching company:", error)
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/companies/[id] - Update company
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
    const sanitizedInput = sanitizeCompanyInput(body)
    
    // Validate input
    const validatedData = UpdateCompanySchema.parse(sanitizedInput)

    // Check if company exists and belongs to user's organization
    const existingCompany = await prisma.company.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
      },
    })

    if (!existingCompany) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      )
    }

    // Check if name is being changed and if it conflicts with another company
    if (validatedData.name && validatedData.name !== existingCompany.name) {
      const nameConflict = await prisma.company.findFirst({
        where: {
          name: validatedData.name,
          organizationId: session.user.organizationId,
          id: {
            not: params.id,
          },
        },
      })

      if (nameConflict) {
        return NextResponse.json(
          { error: "Company with this name already exists" },
          { status: 400 }
        )
      }
    }

    // Check if domain is being changed and if it conflicts with another company
    if (validatedData.domain && validatedData.domain !== existingCompany.domain) {
      const domainConflict = await prisma.company.findFirst({
        where: {
          domain: validatedData.domain,
          organizationId: session.user.organizationId,
          id: {
            not: params.id,
          },
        },
      })

      if (domainConflict) {
        return NextResponse.json(
          { error: "Company with this domain already exists" },
          { status: 400 }
        )
      }
    }

    // Update company
    const updatedCompany = await prisma.company.update({
      where: {
        id: params.id,
      },
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

    return NextResponse.json({
      message: "Company updated successfully",
      data: updatedCompany,
    })
  } catch (error) {
    console.error("Error updating company:", error)
    
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

// DELETE /api/companies/[id] - Delete company
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

    // Check if company exists and belongs to user's organization
    const existingCompany = await prisma.company.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId,
      },
      include: {
        _count: {
          select: {
            contacts: true,
            deals: true,
          },
        },
      },
    })

    if (!existingCompany) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      )
    }

    // Use transaction to handle related data properly
    await prisma.$transaction(async (tx: any) => {
      // Update contacts to remove company association (don't delete contacts)
      await tx.contact.updateMany({
        where: {
          companyId: params.id,
        },
        data: {
          companyId: null,
        },
      })

      // Update deals to remove company association (don't delete deals)
      await tx.deal.updateMany({
        where: {
          companyId: params.id,
        },
        data: {
          companyId: null,
        },
      })

      // Delete the company
      await tx.company.delete({
        where: {
          id: params.id,
        },
      })
    })

    return NextResponse.json({
      message: "Company deleted successfully",
      data: {
        id: params.id,
        contactsUpdated: existingCompany._count.contacts,
        dealsUpdated: existingCompany._count.deals,
      },
    })
  } catch (error) {
    console.error("Error deleting company:", error)
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}