"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ActivityForm, ActivityList, ActivityTimeline, TaskList } from "@/components/activities"
import { Activity, Contact, Deal } from "@/types"
import { Plus, Calendar, CheckSquare, Clock } from "lucide-react"
import { toast } from "sonner"

export default function ActivitiesPage() {
  const { data: session } = useSession()
  const [activities, setActivities] = useState<Activity[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<Activity | undefined>()

  // Fetch data on component mount
  useEffect(() => {
    if (session) {
      fetchActivities()
      fetchContacts()
      fetchDeals()
    }
  }, [session])

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/activities')
      if (response.ok) {
        const data = await response.json()
        setActivities(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
      toast.error('Failed to load activities')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts')
      if (response.ok) {
        const data = await response.json()
        setContacts(data.data?.contacts || [])
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
  }

  const fetchDeals = async () => {
    try {
      const response = await fetch('/api/deals')
      if (response.ok) {
        const data = await response.json()
        setDeals(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching deals:', error)
    }
  }

  const handleCreateActivity = async (data: any) => {
    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setActivities([result.data, ...activities])
        setIsFormOpen(false)
        setSelectedActivity(undefined)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create activity')
      }
    } catch (error) {
      console.error('Error creating activity:', error)
      toast.error('Failed to create activity')
    }
  }

  const handleUpdateActivity = async (data: any) => {
    if (!selectedActivity) return

    try {
      const response = await fetch(`/api/activities/${selectedActivity.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setActivities(activities.map(activity => 
          activity.id === selectedActivity.id ? result.data : activity
        ))
        setIsFormOpen(false)
        setSelectedActivity(undefined)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update activity')
      }
    } catch (error) {
      console.error('Error updating activity:', error)
      toast.error('Failed to update activity')
    }
  }

  const handleMarkCompleted = async (taskIds: string[]) => {
    try {
      const response = await fetch('/api/activities/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskIds,
        }),
      })

      if (response.ok) {
        // Refresh activities
        fetchActivities()
        toast.success(`${taskIds.length} task(s) marked as completed`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to complete tasks')
      }
    } catch (error) {
      console.error('Error completing tasks:', error)
      toast.error('Failed to complete tasks')
    }
  }

  const handleSnoozeTask = async (taskId: string, newDueDate: Date) => {
    try {
      const response = await fetch('/api/activities/snooze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          newDueDate: newDueDate.toISOString(),
        }),
      })

      if (response.ok) {
        // Refresh activities
        fetchActivities()
        toast.success('Task snoozed successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to snooze task')
      }
    } catch (error) {
      console.error('Error snoozing task:', error)
      toast.error('Failed to snooze task')
    }
  }

  const handleActivityClick = (activity: Activity) => {
    setSelectedActivity(activity)
    setIsFormOpen(true)
  }

  const handleNewActivity = () => {
    setSelectedActivity(undefined)
    setIsFormOpen(true)
  }

  // Filter activities by type
  const tasks = activities.filter(activity => activity.type === 'task')
  const nonTaskActivities = activities.filter(activity => activity.type !== 'task')

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to view activities</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activities & Tasks</h1>
          <p className="text-gray-600 mt-2">
            Manage your activities, tasks, and track interactions
          </p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewActivity}>
              <Plus className="h-4 w-4 mr-2" />
              New Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedActivity ? 'Edit Activity' : 'Create New Activity'}
              </DialogTitle>
            </DialogHeader>
            <ActivityForm
              activity={selectedActivity}
              contacts={contacts}
              deals={deals}
              onSubmit={selectedActivity ? handleUpdateActivity : handleCreateActivity}
              onCancel={() => {
                setIsFormOpen(false)
                setSelectedActivity(undefined)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Activities</p>
                <p className="text-2xl font-bold text-gray-900">{activities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckSquare className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tasks.filter(task => !task.completed).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckSquare className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue Tasks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tasks.filter(task => 
                    task.dueDate && 
                    !task.completed && 
                    new Date(task.dueDate) < new Date()
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="tasks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="activities">All Activities</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <TaskList
            tasks={tasks}
            onTaskClick={handleActivityClick}
            onMarkCompleted={handleMarkCompleted}
            onSnoozeTask={handleSnoozeTask}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="activities">
          <ActivityList
            activities={activities}
            onActivityClick={handleActivityClick}
            onMarkCompleted={(activityId) => handleMarkCompleted([activityId])}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="timeline">
          <ActivityTimeline
            activities={activities}
            showUser={true}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}