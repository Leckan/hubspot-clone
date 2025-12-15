import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PerformanceMonitor } from "@/lib/cache"

// GET /api/admin/performance - Get performance metrics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      )
    }

    const metrics = PerformanceMonitor.getMetrics()

    return NextResponse.json({
      data: {
        metrics,
        timestamp: new Date().toISOString(),
        summary: {
          totalOperations: Object.values(metrics).reduce((sum, m) => sum + m.count, 0),
          averageResponseTime: Object.values(metrics).reduce((sum, m) => sum + m.avgTime, 0) / Object.keys(metrics).length || 0,
          slowOperations: Object.entries(metrics)
            .filter(([_, m]) => m.avgTime > 1000)
            .map(([name, m]) => ({ name, avgTime: m.avgTime, count: m.count }))
        }
      }
    })
  } catch (error) {
    console.error("Error fetching performance metrics:", error)
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/performance - Reset performance metrics
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      )
    }

    PerformanceMonitor.resetMetrics()

    return NextResponse.json({
      message: "Performance metrics reset successfully"
    })
  } catch (error) {
    console.error("Error resetting performance metrics:", error)
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}