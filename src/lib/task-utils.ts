import { prisma } from "@/lib/prisma"
import { Activity } from "@/types"

/**
 * Utility functions for task management and reminders
 */

export interface TaskWithOverdueFlag {
  id: string;
  type: string;
  subject: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  contactId?: string;
  dealId?: string;
  userId: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  contact?: any;
  deal?: any;
  user?: any;
  isOverdue: boolean;
}

/**
 * Check if a task is overdue
 */
export function isTaskOverdue(task: Activity): boolean {
  if (!task.dueDate || task.completed) {
    return false
  }
  
  return task.dueDate < new Date()
}

/**
 * Get overdue tasks for a specific user or organization
 */
export async function getOverdueTasks(
  organizationId: string,
  userId?: string
): Promise<TaskWithOverdueFlag[]> {
  const where: any = {
    organizationId,
    type: 'task',
    completed: false,
    dueDate: {
      lt: new Date(),
    },
  }

  if (userId) {
    where.userId = userId
  }

  const tasks = await prisma.activity.findMany({
    where,
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
    orderBy: {
      dueDate: 'asc',
    },
  })

  return tasks.map(task => ({
    ...task,
    isOverdue: true, // All tasks returned by this function are overdue
  })) as TaskWithOverdueFlag[]
}

/**
 * Get tasks due today for a specific user or organization
 */
export async function getTasksDueToday(
  organizationId: string,
  userId?: string
): Promise<TaskWithOverdueFlag[]> {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

  const where: any = {
    organizationId,
    type: 'task',
    completed: false,
    dueDate: {
      gte: startOfDay,
      lte: endOfDay,
    },
  }

  if (userId) {
    where.userId = userId
  }

  const tasks = await prisma.activity.findMany({
    where,
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
    orderBy: {
      dueDate: 'asc',
    },
  })

  return tasks.map(task => ({
    ...task,
    isOverdue: false,
  })) as TaskWithOverdueFlag[]
}

/**
 * Get tasks due within the next N days
 */
export async function getTasksDueWithinDays(
  organizationId: string,
  days: number,
  userId?: string
): Promise<TaskWithOverdueFlag[]> {
  const now = new Date()
  const futureDate = new Date()
  futureDate.setDate(now.getDate() + days)

  const where: any = {
    organizationId,
    type: 'task',
    completed: false,
    dueDate: {
      gte: now,
      lte: futureDate,
    },
  }

  if (userId) {
    where.userId = userId
  }

  const tasks = await prisma.activity.findMany({
    where,
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
    orderBy: {
      dueDate: 'asc',
    },
  })

  return tasks.map(task => ({
    ...task,
    isOverdue: false,
  })) as TaskWithOverdueFlag[]
}

/**
 * Mark a task as completed
 */
export async function markTaskCompleted(
  taskId: string,
  organizationId: string
): Promise<any | null> {
  try {
    const task = await prisma.activity.update({
      where: {
        id: taskId,
      },
      data: {
        completed: true,
        updatedAt: new Date(),
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

    return task
  } catch (error) {
    console.error("Error marking task as completed:", error)
    return null
  }
}

/**
 * Mark multiple tasks as completed
 */
export async function markTasksCompleted(
  taskIds: string[],
  organizationId: string
): Promise<number> {
  try {
    const result = await prisma.activity.updateMany({
      where: {
        id: { in: taskIds },
        organizationId,
        type: 'task',
      },
      data: {
        completed: true,
        updatedAt: new Date(),
      },
    })

    return result.count
  } catch (error) {
    console.error("Error marking tasks as completed:", error)
    return 0
  }
}

/**
 * Get task statistics for a user or organization
 */
export async function getTaskStatistics(
  organizationId: string,
  userId?: string
): Promise<{
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  dueToday: number;
}> {
  const baseWhere: any = {
    organizationId,
    type: 'task',
  }

  if (userId) {
    baseWhere.userId = userId
  }

  const [total, completed, overdue, dueToday] = await Promise.all([
    // Total tasks
    prisma.activity.count({
      where: baseWhere,
    }),
    
    // Completed tasks
    prisma.activity.count({
      where: {
        ...baseWhere,
        completed: true,
      },
    }),
    
    // Overdue tasks
    prisma.activity.count({
      where: {
        ...baseWhere,
        completed: false,
        dueDate: {
          lt: new Date(),
        },
      },
    }),
    
    // Tasks due today
    prisma.activity.count({
      where: {
        ...baseWhere,
        completed: false,
        dueDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    }),
  ])

  const pending = total - completed

  return {
    total,
    completed,
    pending,
    overdue,
    dueToday,
  }
}

/**
 * Snooze a task by updating its due date
 */
export async function snoozeTask(
  taskId: string,
  organizationId: string,
  newDueDate: Date
): Promise<any | null> {
  try {
    const task = await prisma.activity.update({
      where: {
        id: taskId,
      },
      data: {
        dueDate: newDueDate,
        updatedAt: new Date(),
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

    return task
  } catch (error) {
    console.error("Error snoozing task:", error)
    return null
  }
}