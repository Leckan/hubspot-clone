import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getTaskStatistics } from "@/lib/task-utils"

// GET /api/activities/statistics - Get task statistics
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

    // Get task statistics
    const statistics = await getTaskStatistics(
      session.user.organizationId,
      userId || undefined
    )

    return NextResponse.json({
      data: statistics,
      meta: {
        organizationId: session.user.organizationId,
        userId: userId || null,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error fetching task statistics:", error)
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}