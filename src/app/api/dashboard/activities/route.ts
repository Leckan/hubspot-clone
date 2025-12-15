import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Activities analytics schema
const ActivitiesFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

// GET /api/dashboard/activities - Get activities analytics
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
    const filterParams = ActivitiesFiltersSchema.parse({
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

    // Get activities by type
    const activitiesByType = await prisma.activity.groupBy({
      by: ['type'],
      where: {
        organizationId,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      _count: {
        _all: true,
      },
    })

    // Get task completion statistics
    const taskStats = await Promise.all([
      // Completed tasks
      prisma.activity.count({
        where: {
          organizationId,
          type: 'task',
          completed: true,
          ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter }),
        },
      }),
      // Pending tasks
      prisma.activity.count({
        where: {
          organizationId,
          type: 'task',
          completed: false,
          dueDate: {
            gte: new Date(),
          },
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
    ])

    // Get recent activities
    const recentActivities = await prisma.activity.findMany({
      where: {
        organizationId,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      select: {
        id: true,
        type: true,
        subject: true,
        completed: true,
        dueDate: true,
        createdAt: true,
        contact: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        deal: {
          select: {
            title: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })

    // Get activity trends (last 7 days)
    const activityTrends = await prisma.$queryRaw<Array<{
      date: string
      count: number
    }>>`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM activities 
      WHERE organization_id = ${organizationId}
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `

    // Get user activity statistics
    const userActivityStats = await prisma.activity.groupBy({
      by: ['userId'],
      where: {
        organizationId,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      _count: {
        _all: true,
      },
    })

    // Sort by count in JavaScript since Prisma groupBy orderBy is limited
    const sortedUserStats = userActivityStats
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, 5)

    // Get user details for the top active users
    const topUserIds = sortedUserStats.map(stat => stat.userId)
    const userDetails = await prisma.user.findMany({
      where: {
        id: {
          in: topUserIds,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    // Combine user stats with user details
    const topActiveUsers = sortedUserStats.map(stat => {
      const user = userDetails.find(u => u.id === stat.userId)
      return {
        userId: stat.userId,
        userName: user?.name || 'Unknown User',
        userEmail: user?.email || '',
        activityCount: stat._count._all,
      }
    })

    const response = {
      activitiesByType: activitiesByType.map(item => ({
        type: item.type,
        count: item._count._all,
      })),
      taskStats: {
        completed: taskStats[0],
        pending: taskStats[1],
        overdue: taskStats[2],
        total: taskStats[0] + taskStats[1] + taskStats[2],
        completionRate: taskStats[0] + taskStats[1] + taskStats[2] > 0 ? 
          (taskStats[0] / (taskStats[0] + taskStats[1] + taskStats[2])) * 100 : 0,
      },
      recentActivities,
      activityTrends: activityTrends.map(item => ({
        date: item.date,
        count: Number(item.count),
      })),
      topActiveUsers,
      dateRange: {
        startDate: filterParams.startDate,
        endDate: filterParams.endDate,
      },
    }

    return NextResponse.json({
      data: response,
    })
  } catch (error) {
    console.error("Error fetching activities analytics:", error)
    
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