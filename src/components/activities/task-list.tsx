"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Activity } from "@/types"
import { CheckCircle, Clock, AlertTriangle, Calendar, User } from "lucide-react"
import { toast } from "sonner"

interface TaskListProps {
  tasks: Activity[]
  onTaskClick?: (task: Activity) => void
  onMarkCompleted?: (taskIds: string[]) => void
  onSnoozeTask?: (taskId: string, newDueDate: Date) => void
  showFilters?: boolean
  showBulkActions?: boolean
  isLoading?: boolean
}

type TaskFilter = 'all' | 'pending' | 'completed' | 'overdue' | 'due-today'

export function TaskList({
  tasks,
  onTaskClick,
  onMarkCompleted,
  onSnoozeTask,
  showFilters = true,
  showBulkActions = true,
  isLoading = false,
}: TaskListProps) {
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])

  // Filter tasks based on current filters
  const filteredTasks = tasks.filter((task) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = 
        task.subject.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.contact?.firstName.toLowerCase().includes(query) ||
        task.contact?.lastName.toLowerCase().includes(query) ||
        task.deal?.title.toLowerCase().includes(query)
      
      if (!matchesSearch) return false
    }

    // Status filter
    const now = new Date()
    const isOverdue = task.dueDate && new Date(task.dueDate) < now && !task.completed
    const isDueToday = task.dueDate && 
      new Date(task.dueDate).toDateString() === now.toDateString() && 
      !task.completed

    switch (filter) {
      case 'pending':
        return !task.completed
      case 'completed':
        return task.completed
      case 'overdue':
        return isOverdue
      case 'due-today':
        return isDueToday
      default:
        return true
    }
  })

  const isOverdue = (task: Activity) => {
    return task.dueDate && 
           !task.completed && 
           new Date(task.dueDate) < new Date()
  }

  const isDueToday = (task: Activity) => {
    if (!task.dueDate || task.completed) return false
    const today = new Date().toDateString()
    return new Date(task.dueDate).toDateString() === today
  }

  const formatDueDate = (date: Date | string) => {
    const dueDate = new Date(date)
    const now = new Date()
    
    if (dueDate.toDateString() === now.toDateString()) {
      return `Today at ${format(dueDate, 'h:mm a')}`
    }
    
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    if (dueDate.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${format(dueDate, 'h:mm a')}`
    }
    
    return format(dueDate, 'MMM d, yyyy h:mm a')
  }

  const handleTaskSelection = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedTasks([...selectedTasks, taskId])
    } else {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendingTaskIds = filteredTasks
        .filter(task => !task.completed)
        .map(task => task.id)
      setSelectedTasks(pendingTaskIds)
    } else {
      setSelectedTasks([])
    }
  }

  const handleBulkComplete = () => {
    if (selectedTasks.length === 0) {
      toast.error("Please select tasks to complete")
      return
    }
    
    onMarkCompleted?.(selectedTasks)
    setSelectedTasks([])
  }

  const handleSnooze = (taskId: string, hours: number) => {
    const newDueDate = new Date()
    newDueDate.setHours(newDueDate.getHours() + hours)
    onSnoozeTask?.(taskId, newDueDate)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const pendingTasks = filteredTasks.filter(task => !task.completed)
  const overdueTasks = filteredTasks.filter(task => isOverdue(task))
  const dueTodayTasks = filteredTasks.filter(task => isDueToday(task))

  return (
    <div className="space-y-4">
      {/* Filters and Stats */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Task Filters</span>
              <div className="flex space-x-2 text-sm">
                <Badge variant="secondary">
                  {pendingTasks.length} pending
                </Badge>
                {overdueTasks.length > 0 && (
                  <Badge variant="destructive">
                    {overdueTasks.length} overdue
                  </Badge>
                )}
                {dueTodayTasks.length > 0 && (
                  <Badge variant="default" className="bg-orange-100 text-orange-800">
                    {dueTodayTasks.length} due today
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search Tasks</Label>
                <Input
                  id="search"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filter} onValueChange={(value) => setFilter(value as TaskFilter)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="due-today">Due Today</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {showBulkActions && pendingTasks.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={selectedTasks.length === pendingTasks.length && pendingTasks.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600">
                  {selectedTasks.length > 0 
                    ? `${selectedTasks.length} task(s) selected`
                    : 'Select all pending tasks'
                  }
                </span>
              </div>
              
              {selectedTasks.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleBulkComplete}
                >
                  Mark {selectedTasks.length} as Complete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Tasks ({filteredTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {tasks.length === 0 ? 'No tasks found' : 'No tasks match your filters'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const taskOverdue = isOverdue(task)
                const taskDueToday = isDueToday(task)
                
                return (
                  <div
                    key={task.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      taskOverdue 
                        ? 'border-red-200 bg-red-50' 
                        : taskDueToday 
                        ? 'border-orange-200 bg-orange-50'
                        : task.completed
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Checkbox */}
                      {!task.completed && (
                        <Checkbox
                          checked={selectedTasks.includes(task.id)}
                          onCheckedChange={(checked) => 
                            handleTaskSelection(task.id, checked as boolean)
                          }
                        />
                      )}

                      {/* Task Content */}
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => onTaskClick?.(task)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Task Title */}
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className={`font-medium ${
                                task.completed ? 'line-through text-gray-500' : 'text-gray-900'
                              }`}>
                                {task.subject}
                              </h4>
                              
                              {taskOverdue && (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                              
                              {task.completed && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>

                            {/* Task Description */}
                            {task.description && (
                              <p className="text-sm text-gray-600 mb-2">
                                {task.description}
                              </p>
                            )}

                            {/* Task Metadata */}
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                              {/* Due Date */}
                              {task.dueDate && (
                                <span className={`flex items-center ${
                                  taskOverdue ? 'text-red-600 font-medium' : 
                                  taskDueToday ? 'text-orange-600 font-medium' : ''
                                }`}>
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatDueDate(task.dueDate)}
                                </span>
                              )}

                              {/* Associated Contact */}
                              {task.contact && (
                                <span className="flex items-center">
                                  <User className="h-3 w-3 mr-1" />
                                  {task.contact.firstName} {task.contact.lastName}
                                </span>
                              )}

                              {/* Associated Deal */}
                              {task.deal && (
                                <span>
                                  Deal: {task.deal.title}
                                </span>
                              )}

                              {/* Created Date */}
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                Created {format(new Date(task.createdAt), 'MMM d')}
                              </span>
                            </div>
                          </div>

                          {/* Task Actions */}
                          <div className="flex items-center space-x-2 ml-4">
                            {!task.completed && taskOverdue && (
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSnooze(task.id, 1)
                                  }}
                                >
                                  +1h
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSnooze(task.id, 24)
                                  }}
                                >
                                  +1d
                                </Button>
                              </div>
                            )}
                            
                            {!task.completed && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onMarkCompleted?.([task.id])
                                }}
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>
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