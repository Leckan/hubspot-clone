"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Building2, 
  DollarSign, 
  TrendingUp, 
  Target, 
  Clock,
  CheckCircle,
  AlertTriangle
} from "lucide-react"

interface KPIData {
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

interface KPICardsProps {
  data: KPIData
  isLoading?: boolean
}

export function KPICards({ data, isLoading = false }: KPICardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Contacts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalContacts.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Active contacts in your CRM
          </p>
        </CardContent>
      </Card>

      {/* Total Companies */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalCompanies.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Companies in your database
          </p>
        </CardContent>
      </Card>

      {/* Total Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(Number(data.totalRevenue))}</div>
          <p className="text-xs text-muted-foreground">
            From {data.wonDeals} won deals
          </p>
        </CardContent>
      </Card>

      {/* Conversion Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercentage(data.conversionRate)}</div>
          <p className="text-xs text-muted-foreground">
            {data.wonDeals} won / {data.wonDeals + data.lostDeals} closed
          </p>
        </CardContent>
      </Card>

      {/* Total Deals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalDeals.toLocaleString()}</div>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              Won: {data.wonDeals}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Lost: {data.lostDeals}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Average Deal Size */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(Number(data.averageDealSize))}</div>
          <p className="text-xs text-muted-foreground">
            Average across all deals
          </p>
        </CardContent>
      </Card>

      {/* Activities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Activities</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.activitiesCount.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Total logged activities
          </p>
        </CardContent>
      </Card>

      {/* Overdue Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{data.overdueTasks.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {data.overdueTasks > 0 ? "Require attention" : "All tasks up to date"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}