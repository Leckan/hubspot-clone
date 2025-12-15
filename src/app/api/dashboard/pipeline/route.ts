import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Pipeline analytics schema
const PipelineFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

// GET /api/dashboard/pipeline - Get pipeline analytics
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
    const filterParams = PipelineFiltersSchema.parse({
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

    // Get pipeline data by stage
    const pipelineData = await prisma.deal.groupBy({
      by: ['stage'],
      where: {
        organizationId,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
      },
      _avg: {
        amount: true,
      },
    })

    // Get deal velocity (average time in each stage)
    const dealVelocity = await prisma.$queryRaw<Array<{
      stage: string
      avg_days: number
    }>>`
      SELECT 
        stage,
        AVG(EXTRACT(DAY FROM (updated_at - created_at))) as avg_days
      FROM deals 
      WHERE organization_id = ${organizationId}
        ${Object.keys(dateFilter).length > 0 ? 
          `AND created_at >= ${filterParams.startDate ? `'${filterParams.startDate}'` : 'created_at'}
           AND created_at <= ${filterParams.endDate ? `'${filterParams.endDate}'` : 'created_at'}` : ''
        }
      GROUP BY stage
      ORDER BY 
        CASE stage
          WHEN 'lead' THEN 1
          WHEN 'qualified' THEN 2
          WHEN 'proposal' THEN 3
          WHEN 'negotiation' THEN 4
          WHEN 'won' THEN 5
          WHEN 'lost' THEN 6
          ELSE 7
        END
    `

    // Get recent deal movements (last 30 days)
    const recentMovements = await prisma.deal.findMany({
      where: {
        organizationId,
        updatedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      select: {
        id: true,
        title: true,
        stage: true,
        amount: true,
        updatedAt: true,
        contact: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 20,
    })

    // Calculate stage conversion rates
    const stageOrder = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
    const stageConversions = []

    for (let i = 0; i < stageOrder.length - 2; i++) {
      const currentStage = stageOrder[i]
      const nextStage = stageOrder[i + 1]

      const [currentCount, nextCount] = await Promise.all([
        prisma.deal.count({
          where: {
            organizationId,
            stage: currentStage,
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          },
        }),
        prisma.deal.count({
          where: {
            organizationId,
            stage: nextStage,
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          },
        }),
      ])

      const conversionRate = currentCount > 0 ? (nextCount / currentCount) * 100 : 0

      stageConversions.push({
        fromStage: currentStage,
        toStage: nextStage,
        conversionRate: Math.round(conversionRate * 100) / 100,
      })
    }

    // Format pipeline data with proper stage ordering
    const formattedPipelineData = stageOrder.map(stage => {
      const stageData = pipelineData.find(item => item.stage === stage)
      return {
        stage,
        count: stageData?._count._all || 0,
        totalValue: Number(stageData?._sum.amount || 0),
        averageValue: Number(stageData?._avg.amount || 0),
      }
    })

    // Calculate total pipeline value
    const totalPipelineValue = pipelineData.reduce((sum, stage) => {
      return sum + Number(stage._sum.amount || 0)
    }, 0)

    const response = {
      pipelineByStage: formattedPipelineData,
      dealVelocity: dealVelocity.map(item => ({
        stage: item.stage,
        averageDays: Math.round(Number(item.avg_days) * 100) / 100,
      })),
      stageConversions,
      recentMovements,
      summary: {
        totalDeals: pipelineData.reduce((sum, stage) => sum + stage._count._all, 0),
        totalPipelineValue,
        averageDealSize: totalPipelineValue > 0 ? 
          totalPipelineValue / pipelineData.reduce((sum, stage) => sum + stage._count._all, 0) : 0,
      },
      dateRange: {
        startDate: filterParams.startDate,
        endDate: filterParams.endDate,
      },
    }

    return NextResponse.json({
      data: response,
    })
  } catch (error) {
    console.error("Error fetching pipeline analytics:", error)
    
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