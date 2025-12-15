import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { markTaskCompleted, markTasksCompleted } from "@/lib/task-utils"
import { z } from "zod"

// POST /api/activities/complete - Mark task(s) as completed
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
    
    // Validate input - support both single task and multiple tasks
    const schema = z.union([
      z.object({
        taskId: z.string().min(1, "Task ID is required"),
      }),
      z.object({
        taskIds: z.array(z.string()).min(1, "At least one task ID is required"),
      }),
    ])

    const validatedData = schema.parse(body)

    if ('taskId' in validatedData) {
      // Single task completion
      const task = await markTaskCompleted(
        validatedData.taskId,
        session.user.organizationId
      )

      if (!task) {
        return NextResponse.json(
          { error: "Task not found or could not be updated" },
          { status: 404 }
        )
      }

      return NextResponse.json({
        message: "Task marked as completed successfully",
        data: task,
      })
    } else {
      // Multiple tasks completion
      const updatedCount = await markTasksCompleted(
        validatedData.taskIds,
        session.user.organizationId
      )

      if (updatedCount === 0) {
        return NextResponse.json(
          { error: "No tasks were updated" },
          { status: 404 }
        )
      }

      return NextResponse.json({
        message: `${updatedCount} task(s) marked as completed successfully`,
        data: {
          updatedCount,
          requestedCount: validatedData.taskIds.length,
        },
      })
    }
  } catch (error) {
    console.error("Error completing task(s):", error)
    
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