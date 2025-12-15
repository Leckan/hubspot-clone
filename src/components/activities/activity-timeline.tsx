"use client"

import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "@/types"
import { CheckCircle, Clock, Phone, Mail, Calendar, FileText, User } from "lucide-react"

interface ActivityTimelineProps {
  activities: Activity[]
  title?: string
  showUser?: boolean
  isLoading?: boolean
}

const activityTypeIcons = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  task: CheckCircle,
  note: FileText,
}

const activityTypeColors = {
  call: 'bg-blue-500',
  email: 'bg-green-500',
  meeting: 'bg-purple-500',
  task: 'bg-orange-500',
  note: 'bg-gray-500',
}

export function ActivityTimeline({
  activities,
  title = "Activity Timeline",
  showUser = false,
  isLoading = false,
}: ActivityTimelineProps) {
  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.createdAt)
    let dateKey: string

    if (isToday(date)) {
      dateKey = 'Today'
    } else if (isYesterday(date)) {
      dateKey = 'Yesterday'
    } else if (isThisWeek(date)) {
      dateKey = format(date, 'EEEE') // Day name
    } else if (isThisMonth(date)) {
      dateKey = format(date, 'MMMM d') // Month and day
    } else {
      dateKey = format(date, 'MMMM d, yyyy') // Full date
    }

    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(activity)
    return groups
  }, {} as Record<string, Activity[]>)

  const formatTime = (date: Date | string) => {
    return format(new Date(date), 'h:mm a')
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No activities to display
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([dateGroup, dayActivities]) => (
            <div key={dateGroup}>
              {/* Date Header */}
              <div className="flex items-center mb-4">
                <h3 className="text-sm font-medium text-gray-900 bg-gray-100 px-3 py-1 rounded-full">
                  {dateGroup}
                </h3>
                <div className="flex-1 h-px bg-gray-200 ml-4"></div>
              </div>

              {/* Activities for this date */}
              <div className="space-y-4 ml-4">
                {dayActivities.map((activity, index) => {
                  const IconComponent = activityTypeIcons[activity.type]
                  const isLast = index === dayActivities.length - 1

                  return (
                    <div key={activity.id} className="relative">
                      {/* Timeline line */}
                      {!isLast && (
                        <div className="absolute left-4 top-8 w-px h-full bg-gray-200"></div>
                      )}

                      <div className="flex space-x-3">
                        {/* Activity Icon */}
                        <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${activityTypeColors[activity.type]}`}>
                          <IconComponent className="h-4 w-4 text-white" />
                        </div>

                        {/* Activity Content */}
                        <div className="flex-1 min-w-0 pb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {/* Activity Header */}
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="text-sm font-medium text-gray-900">
                                  {activity.subject}
                                </h4>
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs"
                                >
                                  {activity.type}
                                </Badge>
                                {activity.completed && (
                                  <Badge 
                                    variant="default" 
                                    className="text-xs bg-green-100 text-green-800"
                                  >
                                    Completed
                                  </Badge>
                                )}
                              </div>

                              {/* Activity Description */}
                              {activity.description && (
                                <p className="text-sm text-gray-600 mb-2">
                                  {activity.description}
                                </p>
                              )}

                              {/* Activity Metadata */}
                              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                {/* Time */}
                                <span className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatTime(activity.createdAt)}
                                </span>

                                {/* User */}
                                {showUser && activity.user && (
                                  <span className="flex items-center">
                                    <User className="h-3 w-3 mr-1" />
                                    {activity.user.name}
                                  </span>
                                )}

                                {/* Associated Contact */}
                                {activity.contact && (
                                  <span>
                                    Contact: {activity.contact.firstName} {activity.contact.lastName}
                                  </span>
                                )}

                                {/* Associated Deal */}
                                {activity.deal && (
                                  <span>
                                    Deal: {activity.deal.title}
                                  </span>
                                )}

                                {/* Due Date for tasks */}
                                {activity.type === 'task' && activity.dueDate && (
                                  <span className={
                                    new Date(activity.dueDate) < new Date() && !activity.completed
                                      ? 'text-red-600 font-medium'
                                      : ''
                                  }>
                                    Due: {format(new Date(activity.dueDate), 'MMM d, h:mm a')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}