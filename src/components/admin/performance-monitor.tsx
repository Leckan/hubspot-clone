"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface PerformanceMetric {
  count: number
  totalTime: number
  avgTime: number
}

interface PerformanceData {
  metrics: Record<string, PerformanceMetric>
  timestamp: string
  summary: {
    totalOperations: number
    averageResponseTime: number
    slowOperations: Array<{
      name: string
      avgTime: number
      count: number
    }>
  }
}

export function PerformanceMonitor() {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/performance')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
    } finally {
      setLoading(false)
    }
  }

  const resetMetrics = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/performance', {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      // Refresh metrics after reset
      await fetchMetrics()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Monitor</CardTitle>
          <CardDescription>Error loading performance data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchMetrics} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Performance Monitor</CardTitle>
            <CardDescription>
              Real-time application performance metrics
              {data?.timestamp && (
                <span className="block text-xs mt-1">
                  Last updated: {new Date(data.timestamp).toLocaleString()}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="space-x-2">
            <Button onClick={fetchMetrics} disabled={loading} variant="outline">
              {loading ? "Loading..." : "Refresh"}
            </Button>
            <Button onClick={resetMetrics} disabled={loading} variant="destructive">
              Reset
            </Button>
          </div>
        </CardHeader>
        
        {data && (
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {data.summary.totalOperations}
                </div>
                <div className="text-sm text-blue-800">Total Operations</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(data.summary.averageResponseTime)}ms
                </div>
                <div className="text-sm text-green-800">Avg Response Time</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {data.summary.slowOperations.length}
                </div>
                <div className="text-sm text-red-800">Slow Operations</div>
              </div>
            </div>

            {/* Slow Operations Alert */}
            {data.summary.slowOperations.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">
                  ⚠️ Slow Operations Detected
                </h4>
                <div className="space-y-2">
                  {data.summary.slowOperations.map((op) => (
                    <div key={op.name} className="flex justify-between items-center">
                      <span className="text-sm text-yellow-700">{op.name}</span>
                      <div className="space-x-2">
                        <Badge variant="outline">{op.count} calls</Badge>
                        <Badge variant="destructive">{Math.round(op.avgTime)}ms avg</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Metrics */}
            <div>
              <h4 className="font-semibold mb-3">Operation Details</h4>
              <div className="space-y-2">
                {Object.entries(data.metrics).map(([operation, metric]) => (
                  <div key={operation} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">{operation}</span>
                    <div className="flex space-x-4 text-sm">
                      <span>Calls: {metric.count}</span>
                      <span>Avg: {Math.round(metric.avgTime)}ms</span>
                      <span>Total: {Math.round(metric.totalTime)}ms</span>
                      {metric.avgTime > 1000 && (
                        <Badge variant="destructive">Slow</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}