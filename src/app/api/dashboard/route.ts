import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Dashboard KPI calculation schema
const DashboardFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

// GET /api/dashboard - Get dashboard KPIs and metrics
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
    const filterParams = DashboardFiltersSchema.parse({
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    })

    // Build date filter for queries
    const dateFilter: any = {}
    if (filterParams.startDate || filterParams.endDate) {
      if (filterParams.startDate) {
        dateFilter.gte = new Date(filterParams.startDate)
      }
      if (filterParams.endDate) {
        dateFilter.lte = new Date(filterParams.endDate)
      }
    }

    const organizationId = session.user.organizationId

    // Calculate KPIs in parallel for better performance
    const [
      totalContacts,
      totalCompanies,
      totalDeals,
      totalRevenue,
      wonDeals,
      lostDeals,
      activitiesCount,
      overdueTasks,
      dealsThisMonth,
      revenueThisMonth,
      conversionRate,
      averageDealSize,
    ] = await Promise.all([
      // Total contacts
      prisma.contact.count({
        where: {
          organizationId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      }),

      // Total companies
      prisma.company.count({
        where: {
          organizationId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      }),

      // Total deals
      prisma.deal.count({
        where: {
          organizationId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      }),

      // Total revenue (won deals)
      prisma.deal.aggregate({
        where: {
          organizationId,
          stage: 'won',
          ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter }),
        },
        _sum: {
          amount: true,
        },
      }),

      // Won deals count
      prisma.deal.count({
        where: {
          organizationId,
          stage: 'won',
          ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter }),
        },
      }),

      // Lost deals count
      prisma.deal.count({
        where: {
          organizationId,
          stage: 'lost',
          ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter }),
        },
      }),

      // Total activities
      prisma.activity.count({
        where: {
          organizationId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      }),

      // Overdue tasks
      prisma.activity.count({
        where: {
          organizationId,
          type: 'task',
          completed: false,
          dueDate: {
            lt: new Date(),
          },
        },
      }),

      // Deals created this month
      prisma.deal.count({
        where: {
          organizationId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),

      // Revenue this month
      prisma.deal.aggregate({
        where: {
          organizationId,
          stage: 'won',
          updatedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: {
          amount: true,
        },
      }),

      // Conversion rate calculation - need total closed deals
      prisma.deal.count({
        where: {
          organizationId,
          stage: {
            in: ['won', 'lost'],
          },
          ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter }),
        },
      }),

      // Average deal size
      prisma.deal.aggregate({
        where: {
          organizationId,
          amount: {
            not: null,
          },
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
        _avg: {
          amount: true,
        },
      }),
    ])

    // Calculate conversion rate
    const totalClosedDeals = wonDeals + lostDeals
    const calculatedConversionRate = totalClosedDeals > 0 ? (wonDeals / totalClosedDeals) * 100 : 0

    // Format response
    const dashboardData = {
      kpis: {
        totalContacts,
        totalCompanies,
        totalDeals,
        totalRevenue: Number(totalRevenue._sum.amount || 0),
        wonDeals,
        lostDeals,
        activitiesCount,
        overdueTasks,
        dealsThisMonth,
        revenueThisMonth: Number(revenueThisMonth._sum.amount || 0),
        conversionRate: Math.round(calculatedConversionRate * 100) / 100,
        averageDealSize: Number(averageDealSize._avg.amount || 0),
      },
      dateRange: {
        startDate: filterParams.startDate,
        endDate: filterParams.endDate,
      },
    }

    return NextResponse.json({
      data: dashboardData,
    })
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    
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