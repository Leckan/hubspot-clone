import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { snoozeTask } from "@/lib/task-utils"
import { z } from "zod"

// POST /api/activities/snooze - Snooze a task by updating its due date
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate input
    const schema = z.object({
      taskId: z.string().min(1, "Task ID is required"),
      newDueDate: z.string().datetime("Invalid date format"),
    })

    const { taskId, newDueDate } = schema.parse(body)

    const parsedDate = new Date(newDueDate)
    
    // Ensure the new due date is in the future
    if (parsedDate <= new Date()) {
      return NextResponse.json(
        { error: "New due date must be in the future" },
        { status: 400 }
      )
    }

    const task = await snoozeTask(
      taskId,
      session.user.organizationId,
      parsedDate
    )

    if (!task) {
      return NextResponse.json(
        { error: "Task not found or could not be updated" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: "Task snoozed successfully",
      data: task,
    })
  } catch (error) {
    console.error("Error snoozing task:", error)
    
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