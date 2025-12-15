"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Activity, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  User,
  TrendingUp
} from "lucide-react"

interface ActivityByType {
  type: string
  count: number
}

interface TaskStats {
  completed: number
  pending: number
  overdue: number
  total: number
  completionRate: number
}

interface RecentActivity {
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
}

interface ActivityTrend {
  date: string
  count: number
}

interface TopActiveUser {
  userId: string
  userName: string
  userEmail: string
  activityCount: number
}

interface ActivitiesAnalyticsProps {
  activitiesByType: ActivityByType[]
  taskStats: TaskStats
  recentActivities: RecentActivity[]
  activityTrends: ActivityTrend[]
  topActiveUsers: TopActiveUser[]
  isLoading?: boolean
}

export function ActivitiesAnalytics({
  activitiesByType,
  taskStats,
  recentActivities,
  activityTrends,
  topActiveUsers,
  isLoading = false
}: ActivitiesAnalyticsProps) {
  const formatActivityType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const getActivityIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      call: <Activity className="h-4 w-4" />,
      email: <Activity className="h-4 w-4" />,
      meeting: <Activity className="h-4 w-4" />,
      task: <CheckCircle className="h-4 w-4" />,
      note: <Activity className="h-4 w-4" />,
    }
    return icons[type] || <Activity className="h-4 w-4" />
  }

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      call: "bg-blue-500",
      email: "bg-green-500",
      meeting: "bg-purple-500",
      task: "bg-orange-500",
      note: "bg-gray-500",
    }
    return colors[type] || "bg-gray-500"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const totalActivities = activitiesByType.reduce((sum, activity) => sum + activity.count, 0)

  return (
    <div className="space-y-6">
      {/* Task Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.total}</div>
            <p className="text-xs text-muted-foreground">
              All tasks created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
            <p className="text-xs text-muted-foreground">
              {taskStats.completionRate.toFixed(1)}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{taskStats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Due in the future
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{taskStats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              {taskStats.overdue > 0 ? "Need attention" : "All up to date"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activities by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Activities by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activitiesByType.map((activity) => (
                <div key={activity.type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getActivityColor(activity.type)}`}></div>
                      <span className="font-medium">{formatActivityType(activity.type)}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{activity.count}</div>
                      <div className="text-sm text-muted-foreground">
                        {totalActivities > 0 ? ((activity.count / totalActivities) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                  <Progress 
                    value={totalActivities > 0 ? (activity.count / totalActivities) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Active Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Most Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topActiveUsers.map((user, index) => (
                <div key={user.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{user.userName}</div>
                      <div className="text-sm text-muted-foreground">{user.userEmail}</div>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {user.activityCount} activities
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Activity Trends (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activityTrends.map((trend) => (
                <div key={trend.date} className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {new Date(trend.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ 
                          width: `${Math.max(10, (trend.count / Math.max(...activityTrends.map(t => t.count))) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold w-8 text-right">{trend.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg border">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{activity.subject}</div>
                    <div className="text-sm text-muted-foreground">
                      {activity.contact && 
                        `${activity.contact.firstName} ${activity.contact.lastName}`
                      }
                      {activity.deal && ` • ${activity.deal.title}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {activity.user.name} • {formatDate(activity.createdAt)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-xs">
                      {formatActivityType(activity.type)}
                    </Badge>
                    {activity.type === 'task' && (
                      <Badge 
                        variant={activity.completed ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {activity.completed ? "Done" : "Pending"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}