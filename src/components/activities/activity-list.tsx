"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Activity, ActivityType } from "@/types"
import { CheckCircle, Clock, Phone, Mail, Calendar, FileText, AlertTriangle } from "lucide-react"

interface ActivityListProps {
  activities: Activity[]
  onActivityClick?: (activity: Activity) => void
  onMarkCompleted?: (activityId: string) => void
  showFilters?: boolean
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
  call: 'bg-blue-100 text-blue-800',
  email: 'bg-green-100 text-green-800',
  meeting: 'bg-purple-100 text-purple-800',
  task: 'bg-orange-100 text-orange-800',
  note: 'bg-gray-100 text-gray-800',
}

export function ActivityList({
  activities,
  onActivityClick,
  onMarkCompleted,
  showFilters = true,
  isLoading = false,
}: ActivityListProps) {
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all')
  const [completedFilter, setCompletedFilter] = useState<'all' | 'completed' | 'pending'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter activities based on current filters
  const filteredActivities = activities.filter((activity) => {
    // Type filter
    if (typeFilter !== 'all' && activity.type !== typeFilter) {
      return false
    }

    // Completed filter
    if (completedFilter === 'completed' && !activity.completed) {
      return false
    }
    if (completedFilter === 'pending' && activity.completed) {
      return false
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        activity.subject.toLowerCase().includes(query) ||
        activity.description?.toLowerCase().includes(query) ||
        activity.contact?.firstName.toLowerCase().includes(query) ||
        activity.contact?.lastName.toLowerCase().includes(query) ||
        activity.deal?.title.toLowerCase().includes(query)
      )
    }

    return true
  })

  const isOverdue = (activity: Activity) => {
    return activity.dueDate && 
           !activity.completed && 
           new Date(activity.dueDate) < new Date()
  }

  const formatDate = (date: Date | string) => {
    return format(new Date(date), 'MMM d, yyyy h:mm a')
  }

  const handleMarkCompleted = (e: React.MouseEvent, activityId: string) => {
    e.stopPropagation()
    onMarkCompleted?.(activityId)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Type Filter */}
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as ActivityType | 'all')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={completedFilter} onValueChange={(value) => setCompletedFilter(value as 'all' | 'completed' | 'pending')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activities List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Activities ({filteredActivities.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {activities.length === 0 ? 'No activities found' : 'No activities match your filters'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((activity) => {
                const IconComponent = activityTypeIcons[activity.type]
                const isTaskOverdue = isOverdue(activity)
                
                return (
                  <div
                    key={activity.id}
                    className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                      isTaskOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'
                    }`}
                    onClick={() => onActivityClick?.(activity)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {/* Activity Icon */}
                        <div className={`p-2 rounded-full ${activityTypeColors[activity.type]}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>

                        {/* Activity Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900 truncate">
                              {activity.subject}
                            </h4>
                            {isTaskOverdue && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>

                          {activity.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {activity.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                            {/* Type Badge */}
                            <Badge variant="secondary" className={activityTypeColors[activity.type]}>
                              {activity.type}
                            </Badge>

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

                            {/* Due Date */}
                            {activity.dueDate && (
                              <span className={isTaskOverdue ? 'text-red-600 font-medium' : ''}>
                                <Clock className="inline h-3 w-3 mr-1" />
                                Due: {formatDate(activity.dueDate)}
                              </span>
                            )}

                            {/* Created Date */}
                            <span>
                              Created: {formatDate(activity.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        {/* Completion Status */}
                        {activity.type === 'task' && (
                          <div className="flex items-center space-x-2">
                            {activity.completed ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Completed
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => handleMarkCompleted(e, activity.id)}
                              >
                                Mark Complete
                              </Button>
                            )}
                          </div>
                        )}

                        {activity.completed && activity.type !== 'task' && (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Completed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}