import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DealStage } from "@/types"

// GET /api/deals/pipeline - Get pipeline analytics and stage summaries
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
    const ownerId = searchParams.get('ownerId') || undefined

    // Build where clause
    const where: any = {
      organizationId: session.user.organizationId,
    }

    if (ownerId) {
      where.ownerId = ownerId
    }

    // Get deals grouped by stage
    const dealsByStage = await prisma.deal.groupBy({
      by: ['stage'],
      where,
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    })

    // Define all possible stages to ensure consistent response
    const allStages: DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
    
    // Create pipeline analytics with all stages
    const pipelineAnalytics = allStages.map(stage => {
      const stageData = dealsByStage.find((item: any) => item.stage === stage)
      
      return {
        stage,
        dealCount: stageData?._count.id || 0,
        totalValue: Number(stageData?._sum.amount || 0),
        averageValue: stageData?._count.id 
          ? Number(stageData._sum.amount || 0) / stageData._count.id 
          : 0,
      }
    })

    // Get recent deals for each stage (for Kanban view)
    const recentDealsByStage = await Promise.all(
      allStages.map(async (stage) => {
        const deals = await prisma.deal.findMany({
          where: {
            ...where,
            stage,
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
            company: {
              select: {
                id: true,
                name: true,
              },
            },
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
          take: 50, // Limit deals per stage for performance
        })

        return {
          stage,
          deals,
        }
      })
    )

    // Calculate overall pipeline metrics
    const totalDeals = dealsByStage.reduce((sum: number, stage: any) => sum + stage._count.id, 0)
    const totalValue = dealsByStage.reduce((sum: number, stage: any) => sum + Number(stage._sum.amount || 0), 0)
    
    const wonDeals = dealsByStage.find((stage: any) => stage.stage === 'won')?._count.id || 0
    const lostDeals = dealsByStage.find((stage: any) => stage.stage === 'lost')?._count.id || 0
    const activeDeals = totalDeals - wonDeals - lostDeals
    
    const conversionRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0

    return NextResponse.json({
      data: {
        analytics: pipelineAnalytics,
        dealsByStage: recentDealsByStage,
        summary: {
          totalDeals,
          activeDeals,
          wonDeals,
          lostDeals,
          totalValue,
          averageDealSize: totalDeals > 0 ? totalValue / totalDeals : 0,
          conversionRate,
        },
      },
    })
  } catch (error) {
    console.error("Error fetching pipeline data:", error)
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}