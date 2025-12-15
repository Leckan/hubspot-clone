import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PaginationSchema } from "@/lib/validations"
import { z } from "zod"

// GET /api/activities/tasks - Get tasks with filtering (overdue, completed, etc.)
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
    const paginationParams = PaginationSchema.parse({
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10,
    })

    const overdue = searchParams.get('overdue') === 'true'
    const completed = searchParams.get('completed') === 'true'
    const userId = searchParams.get('userId')

    // Build where clause for tasks only
    const where: any = {
      organizationId: session.user.organizationId,
      type: 'task', // Only fetch task-type activities
    }

    // Add overdue filter
    if (overdue) {
      where.dueDate = {
        lt: new Date(),
      }
      where.completed = false
    } else if (completed !== undefined) {
      where.completed = completed
    }

    // Add user filter
    if (userId) {
      where.userId = userId
    }

    // Calculate pagination
    const skip = (paginationParams.page - 1) * paginationParams.limit
    const take = paginationParams.limit

    // Get total count for pagination
    const total = await prisma.activity.count({ where })

    // Fetch tasks with relations
    const tasks = await prisma.activity.findMany({
      where,
      skip,
      take,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
            stage: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        {
          dueDate: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ],
    })

    // Add overdue flag to each task
    const tasksWithOverdueFlag = tasks.map(task => ({
      ...task,
      isOverdue: task.dueDate ? task.dueDate < new Date() && !task.completed : false,
    }))

    const totalPages = Math.ceil(total / paginationParams.limit)

    return NextResponse.json({
      data: tasksWithOverdueFlag,
      pagination: {
        page: paginationParams.page,
        limit: paginationParams.limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error("Error fetching tasks:", error)
    
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

// PATCH /api/activities/tasks - Bulk update task completion status
export async function PATCH(request: NextRequest) {
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
      taskIds: z.array(z.string()).min(1, "At least one task ID is required"),
      completed: z.boolean(),
    })

    const { taskIds, completed } = schema.parse(body)

    // Verify all tasks exist and belong to user's organization
    const existingTasks = await prisma.activity.findMany({
      where: {
        id: { in: taskIds },
        organizationId: session.user.organizationId,
        type: 'task',
      },
    })

    if (existingTasks.length !== taskIds.length) {
      return NextResponse.json(
        { error: "One or more tasks not found" },
        { status: 404 }
      )
    }

    // Update tasks
    const updateData: any = {
      completed,
      updatedAt: new Date(),
    }

    // If marking as completed, set completion timestamp
    if (completed) {
      updateData.updatedAt = new Date()
    }

    await prisma.activity.updateMany({
      where: {
        id: { in: taskIds },
        organizationId: session.user.organizationId,
        type: 'task',
      },
      data: updateData,
    })

    // Fetch updated tasks
    const updatedTasks = await prisma.activity.findMany({
      where: {
        id: { in: taskIds },
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
        deal: {
          select: {
            id: true,
            title: true,
            stage: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      message: `${taskIds.length} task(s) updated successfully`,
      data: updatedTasks,
    })
  } catch (error) {
    console.error("Error updating tasks:", error)
    
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