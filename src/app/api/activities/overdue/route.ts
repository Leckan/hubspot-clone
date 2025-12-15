import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getOverdueTasks, getTaskStatistics } from "@/lib/task-utils"

// GET /api/activities/overdue - Get overdue tasks
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
    const userId = searchParams.get('userId')

    // Get overdue tasks
    const overdueTasks = await getOverdueTasks(
      session.user.organizationId,
      userId || undefined
    )

    // Get task statistics for context
    const statistics = await getTaskStatistics(
      session.user.organizationId,
      userId || undefined
    )

    return NextResponse.json({
      data: overdueTasks,
      statistics,
      meta: {
        count: overdueTasks.length,
        organizationId: session.user.organizationId,
        userId: userId || null,
      },
    })
  } catch (error) {
    console.error("Error fetching overdue tasks:", error)
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}