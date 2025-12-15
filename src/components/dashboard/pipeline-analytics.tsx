"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp, 
  Clock, 
  DollarSign,
  Target,
  ArrowRight
} from "lucide-react"

interface PipelineStage {
  stage: string
  count: number
  totalValue: number
  averageValue: number
}

interface DealVelocity {
  stage: string
  averageDays: number
}

interface StageConversion {
  fromStage: string
  toStage: string
  conversionRate: number
}

interface RecentMovement {
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
}

interface PipelineAnalyticsProps {
  pipelineByStage: PipelineStage[]
  dealVelocity: DealVelocity[]
  stageConversions: StageConversion[]
  recentMovements: RecentMovement[]
  summary: {
    totalDeals: number
    totalPipelineValue: number
    averageDealSize: number
  }
  isLoading?: boolean
}

export function PipelineAnalytics({
  pipelineByStage,
  dealVelocity,
  stageConversions,
  recentMovements,
  summary,
  isLoading = false
}: PipelineAnalyticsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatStage = (stage: string) => {
    return stage.charAt(0).toUpperCase() + stage.slice(1)
  }

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      lead: "bg-gray-500",
      qualified: "bg-blue-500",
      proposal: "bg-yellow-500",
      negotiation: "bg-orange-500",
      won: "bg-green-500",
      lost: "bg-red-500",
    }
    return colors[stage] || "bg-gray-500"
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

  return (
    <div className="space-y-6">
      {/* Pipeline Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalPipelineValue)}</div>
            <p className="text-xs text-muted-foreground">
              Across {summary.totalDeals} deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Deal Size</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.averageDealSize)}</div>
            <p className="text-xs text-muted-foreground">
              Per deal in pipeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalDeals}</div>
            <p className="text-xs text-muted-foreground">
              In active pipeline
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline by Stage */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pipelineByStage.map((stage) => (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getStageColor(stage.stage)}`}></div>
                      <span className="font-medium">{formatStage(stage.stage)}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{stage.count} deals</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(stage.totalValue)}
                      </div>
                    </div>
                  </div>
                  <Progress 
                    value={(stage.count / summary.totalDeals) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Deal Velocity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Deal Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dealVelocity.map((velocity) => (
                <div key={velocity.stage} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStageColor(velocity.stage)}`}></div>
                    <span className="text-sm">{formatStage(velocity.stage)}</span>
                  </div>
                  <Badge variant="outline">
                    {velocity.averageDays.toFixed(1)} days
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stage Conversions */}
        <Card>
          <CardHeader>
            <CardTitle>Stage Conversion Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stageConversions.map((conversion) => (
                <div key={`${conversion.fromStage}-${conversion.toStage}`} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span>{formatStage(conversion.fromStage)}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span>{formatStage(conversion.toStage)}</span>
                    </div>
                    <Badge 
                      variant={conversion.conversionRate > 50 ? "default" : "secondary"}
                    >
                      {conversion.conversionRate.toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress 
                    value={conversion.conversionRate} 
                    className="h-1"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Movements */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Deal Movements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMovements.slice(0, 5).map((movement) => (
                <div key={movement.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{movement.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {movement.contact && 
                        `${movement.contact.firstName} ${movement.contact.lastName}`
                      }
                      {movement.company && ` • ${movement.company.name}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {movement.amount && (
                      <span className="text-sm font-medium">
                        {formatCurrency(movement.amount)}
                      </span>
                    )}
                    <Badge 
                      variant="outline" 
                      className={`${getStageColor(movement.stage)} text-white border-0`}
                    >
                      {formatStage(movement.stage)}
                    </Badge>
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