import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getTasksDueToday, getTasksDueWithinDays } from "@/lib/task-utils"

// GET /api/activities/due-today - Get tasks due today or within specified days
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
    const days = searchParams.get('days')

    let tasks
    let timeframe

    if (days) {
      const daysNumber = parseInt(days)
      if (isNaN(daysNumber) || daysNumber < 0) {
        return NextResponse.json(
          { error: "Invalid days parameter" },
          { status: 400 }
        )
      }
      
      tasks = await getTasksDueWithinDays(
        session.user.organizationId,
        daysNumber,
        userId || undefined
      )
      timeframe = `next ${daysNumber} day(s)`
    } else {
      tasks = await getTasksDueToday(
        session.user.organizationId,
        userId || undefined
      )
      timeframe = 'today'
    }

    return NextResponse.json({
      data: tasks,
      meta: {
        count: tasks.length,
        timeframe,
        organizationId: session.user.organizationId,
        userId: userId || null,
      },
    })
  } catch (error) {
    console.error("Error fetching tasks due today:", error)
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}