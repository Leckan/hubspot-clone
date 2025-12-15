"use client"

import { useState, useEffect } from "react"
import { type DateRange } from "react-day-picker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { KPICards } from "./kpi-cards"
import { DateRangePicker } from "./date-range-picker"
import { PipelineAnalytics } from "./pipeline-analytics"
import { ActivitiesAnalytics } from "./activities-analytics"

interface DashboardData {
  kpis: {
    totalContacts: number
    totalCompanies: number
    totalDeals: number
    totalRevenue: number
    wonDeals: number
    lostDeals: number
    activitiesCount: number
    overdueTasks: number
    dealsThisMonth: number
    revenueThisMonth: number
    conversionRate: number
    averageDealSize: number
  }
  dateRange: {
    startDate?: string
    endDate?: string
  }
}

interface PipelineData {
  pipelineByStage: Array<{
    stage: string
    count: number
    totalValue: number
    averageValue: number
  }>
  dealVelocity: Array<{
    stage: string
    averageDays: number
  }>
  stageConversions: Array<{
    fromStage: string
    toStage: string
    conversionRate: number
  }>
  recentMovements: Array<{
    id: string
    title: string
    stage: string
    amount: number | null
    updatedAt: string
    contact?: {
      firstName: string
      lastName: string
    }
    company?: {
      name: string
    }
  }>
  summary: {
    totalDeals: number
    totalPipelineValue: number
    averageDealSize: number
  }
  dateRange: {
    startDate?: string
    endDate?: string
  }
}

interface ActivitiesData {
  activitiesByType: Array<{
    type: string
    count: number
  }>
  taskStats: {
    completed: number
    pending: number
    overdue: number
    total: number
    completionRate: number
  }
  recentActivities: Array<{
    id: string
    type: string
    subject: string
    completed: boolean
    dueDate: string | null
    createdAt: string
    contact?: {
      firstName: string
      lastName: string
    }
    deal?: {
      title: string
    }
    user: {
      name: string
    }
  }>
  activityTrends: Array<{
    date: string
    count: number
  }>
  topActiveUsers: Array<{
    userId: string
    userName: string
    userEmail: string
    activityCount: number
  }>
  dateRange: {
    startDate?: string
    endDate?: string
  }
}

export function DashboardMain() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null)
  const [activitiesData, setActivitiesData] = useState<ActivitiesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchDashboardData = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      const params = new URLSearchParams()
      if (dateRange?.from) {
        params.append('startDate', dateRange.from.toISOString().split('T')[0])
      }
      if (dateRange?.to) {
        params.append('endDate', dateRange.to.toISOString().split('T')[0])
      }

      const [dashboardResponse, pipelineResponse, activitiesResponse] = await Promise.all([
        fetch(`/api/dashboard?${params.toString()}`),
        fetch(`/api/dashboard/pipeline?${params.toString()}`),
        fetch(`/api/dashboard/activities?${params.toString()}`),
      ])

      if (!dashboardResponse.ok || !pipelineResponse.ok || !activitiesResponse.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const [dashboardResult, pipelineResult, activitiesResult] = await Promise.all([
        dashboardResponse.json(),
        pipelineResponse.json(),
        activitiesResponse.json(),
      ])

      setDashboardData(dashboardResult.data)
      setPipelineData(pipelineResult.data)
      setActivitiesData(activitiesResult.data)

      if (refresh) {
        toast.success('Dashboard data refreshed')
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [dateRange])

  const handleRefresh = () => {
    fetchDashboardData(true)
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range Picker */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your CRM performance and metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {dashboardData && (
        <KPICards data={dashboardData.kpis} isLoading={isLoading} />
      )}

      {/* Analytics Tabs */}
      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline Analytics</TabsTrigger>
          <TabsTrigger value="activities">Activities Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          {pipelineData ? (
            <PipelineAnalytics
              pipelineByStage={pipelineData.pipelineByStage}
              dealVelocity={pipelineData.dealVelocity}
              stageConversions={pipelineData.stageConversions}
              recentMovements={pipelineData.recentMovements}
              summary={pipelineData.summary}
              isLoading={isLoading}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading pipeline data...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          {activitiesData ? (
            <ActivitiesAnalytics
              activitiesByType={activitiesData.activitiesByType}
              taskStats={activitiesData.taskStats}
              recentActivities={activitiesData.recentActivities}
              activityTrends={activitiesData.activityTrends}
              topActiveUsers={activitiesData.topActiveUsers}
              isLoading={isLoading}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Activities Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading activities data...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}