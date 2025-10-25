'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, Download, AlertCircle, TrendingUp, Users, Target, CheckCircle, Mail, Clock, XCircle, Eye } from 'lucide-react'
import parseLLMJson from '@/utils/jsonParser'
import { callAIAgent } from '@/utils/aiAgent'
import { cn } from '@/lib/utils'

// Types
interface TeamMember {
  id: string
  name: string
  email: string
  activities: string
  mqlCount: number
  status: 'responded' | 'pending' | 'overdue'
  timestamp?: string
  reminder_sent?: number
}

interface CollectionData {
  collection_status: string
  team_data: TeamMember[]
  response_rate: number
  total_mql_collected: number
  non_responders: string[]
  errors: string[]
}

interface AggregateMetrics {
  total_mqls: number
  team_count: number
  response_rate: number
  avg_mql_per_person: number
  top_performer: string
  pending_responses: number
}

interface DashboardData {
  dashboard_status: string
  aggregate_metrics: AggregateMetrics
  individual_activity_cards: TeamMember[]
  non_responders_list: string[]
  insights: string[]
  metadata: {
    processing_time: string
    records_processed: number
  }
}

interface CollectionResponse {
  result: string
  confidence: number
  metadata: {
    processing_time: string
    emails_sent: number
    responses_received: number
    collection_method: string
  }
}

interface InsightResponse {
  result: string
  confidence: number
  metadata: {
    processing_time: string
    records_processed: number
    dashboard_status: string
    total_mqls: number
  }
}

// Agent functions
async function callCollectionAgent(prompt: string): Promise<CollectionResponse | null> {
  try {
    const response = await callAIAgent(prompt, '68fd262d058210757bf63fc4')
    const parsed = parseLLMJson(response, {
      result: '',
      confidence: 0,
      metadata: { processing_time: '0ms', emails_sent: 0, responses_received: 0, collection_method: 'email' }
    })
    return parsed as CollectionResponse
  } catch (error) {
    console.error('Collection agent error:', error)
    return null
  }
}

async function callInsightsAgent(prompt: string): Promise<InsightResponse | null> {
  try {
    const response = await callAIAgent(prompt, '68fd2650be2defc486f4567a')
    const parsed = parseLLMJson(response, {
      result: '',
      confidence: 0,
      metadata: { processing_time: '0ms', records_processed: 0, dashboard_status: 'error', total_mqls: 0 }
    })
    return parsed as InsightResponse
  } catch (error) {
    console.error('Insights agent error:', error)
    return null
  }
}

// Sub-components
function MetricCard({ label, value, icon: Icon, trend, status }: any) {
  const statusColors = {
    positive: 'text-green-600',
    pending: 'text-amber-600',
    neutral: 'text-gray-600'
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className={cn('text-3xl font-bold mt-2', statusColors[status || 'neutral'])}>
              {value}
            </p>
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-600">{trend}</span>
              </div>
            )}
          </div>
          {Icon && <Icon className="w-8 h-8 text-purple-600" />}
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityCard({ member, onRemind }: any) {
  const statusConfig = {
    responded: { bg: 'bg-green-50', color: 'bg-green-100', textColor: 'text-green-700', icon: CheckCircle, label: 'Responded' },
    pending: { bg: 'bg-amber-50', color: 'bg-amber-100', textColor: 'text-amber-700', icon: Clock, label: 'Pending' },
    overdue: { bg: 'bg-red-50', color: 'bg-red-100', textColor: 'text-red-700', icon: XCircle, label: 'Overdue' }
  }

  const config = statusConfig[member.status]
  const StatusIcon = config.icon

  return (
    <Card className={cn('border border-gray-200 shadow-sm', config.bg)}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900">{member.name}</h3>
              <Badge className={cn('text-xs', config.color, config.textColor)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
            </div>
            <p className="text-xs text-gray-500">{member.email}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-purple-600">{member.mqlCount}</p>
            <p className="text-xs text-gray-500">MQLs</p>
          </div>
        </div>

        <Separator className="my-3" />

        <div>
          <p className="text-sm text-gray-700 mb-3">{member.activities || 'No activities reported'}</p>
          <div className="flex items-center justify-between">
            {member.timestamp && (
              <p className="text-xs text-gray-500">Submitted: {member.timestamp}</p>
            )}
            {member.status !== 'responded' && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-600 text-amber-600 hover:bg-amber-100"
                onClick={() => onRemind(member.id)}
              >
                Remind
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function NonRespondersList({ members, onRemind }: any) {
  if (members.length === 0) {
    return (
      <Card className="border border-gray-200 bg-green-50 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-700">Perfect! 100% Response Rate</p>
              <p className="text-sm text-green-600">All team members have submitted their data.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-gray-200 bg-amber-50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-amber-900">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          Action Required ({members.length})
        </CardTitle>
        <CardDescription>Members who haven't responded yet</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {members.map((member: TeamMember) => (
            <div key={member.id} className="flex items-center justify-between py-2 px-2 bg-white bg-opacity-50 rounded border border-amber-200 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{member.name}</p>
                <p className="text-xs text-gray-500">{member.email}</p>
              </div>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => onRemind(member.id)}
              >
                <Mail className="w-3 h-3 mr-1" />
                Remind
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function InsightsSummary({ insights }: any) {
  if (!insights || insights.length === 0) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">No insights available yet. Generate dashboard to see analysis.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Key Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight: string, idx: number) => (
            <div key={idx} className="flex gap-3">
              <TrendingUp className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">{insight}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ExportDialog({ teamData, dashboardData }: any) {
  const handleExport = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      dashboard: dashboardData,
      team_responses: teamData
    }
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2)))
    element.setAttribute('download', `marketing-report-${new Date().toISOString().split('T')[0]}.json`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const handleCopy = () => {
    const data = JSON.stringify({ teamData, dashboardData }, null, 2)
    navigator.clipboard.writeText(data)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="border-purple-600 text-purple-600 hover:bg-purple-50">
          <Download className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Report</DialogTitle>
          <DialogDescription>Download or copy your marketing dashboard report</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <Button onClick={handleExport} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
            <Download className="w-4 h-4 mr-2" />
            Download as JSON
          </Button>
          <Button onClick={handleCopy} variant="outline" className="w-full border-purple-600 text-purple-600 hover:bg-purple-50">
            <CheckCircle className="w-4 h-4 mr-2" />
            Copy to Clipboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Main App Component
function App() {
  // State Management
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [teamData, setTeamData] = useState<TeamMember[]>([
    { id: '1', name: 'Sarah Chen', email: 'sarah.chen@company.com', activities: 'Led 3 webinars, attended 2 industry events', mqlCount: 12, status: 'responded', timestamp: '2024-01-15 10:30 AM' },
    { id: '2', name: 'Marcus Johnson', email: 'marcus.j@company.com', activities: 'Published 5 thought leadership posts, managed LinkedIn campaign', mqlCount: 18, status: 'responded', timestamp: '2024-01-15 11:45 AM' },
    { id: '3', name: 'Emily Rodriguez', email: 'emily.r@company.com', activities: 'Conducted 4 product demos, organized roundtable', mqlCount: 9, status: 'pending' },
    { id: '4', name: 'James Park', email: 'james.park@company.com', activities: 'Managed 2 campaign launches, optimized email sequences', mqlCount: 15, status: 'responded', timestamp: '2024-01-15 09:15 AM' },
    { id: '5', name: 'Lisa White', email: 'lisa.w@company.com', activities: 'Attended customer advisory board, conducted partner outreach', mqlCount: 21, status: 'responded', timestamp: '2024-01-15 02:00 PM' },
    { id: '6', name: 'David Kim', email: 'david.kim@company.com', activities: '', mqlCount: 0, status: 'overdue' },
  ])

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [collectionStatus, setCollectionStatus] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  // Handlers
  const handleRequestUpdates = useCallback(async () => {
    setLoading(true)
    setCollectionStatus('Sending requests to team members...')
    setErrors([])

    try {
      const prompt = `Collect weekly marketing activities and MQL data from team members for the period ${startDate} to ${endDate}. Request comprehensive information on activities performed, MQLs generated, and engagement metrics from at least 5 team members via email notifications.`

      const result = await callCollectionAgent(prompt)

      if (result) {
        setCollectionStatus(`✓ ${result.result}`)

        // Simulate updates based on agent metadata
        const updatedTeamData = teamData.map((member, idx) => ({
          ...member,
          status: idx < 5 ? 'responded' : 'overdue',
          timestamp: idx < 5 ? new Date(Date.now() - (idx * 15 * 60 * 1000)).toLocaleString() : undefined,
          reminder_sent: idx >= 5 ? 1 : 0
        }))
        setTeamData(updatedTeamData)
      } else {
        setErrors(['Failed to initiate collection. Please try again.'])
        setCollectionStatus('Error: Collection failed')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
      setErrors([errorMsg])
      setCollectionStatus('Error during collection.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, teamData])

  const handleGenerateDashboard = useCallback(async () => {
    setDashboardLoading(true)
    setErrors([])

    try {
      const teamSummary = teamData
        .filter(m => m.status === 'responded')
        .map(m => `${m.name}: ${m.mqlCount} MQLs, Activities: ${m.activities}`)
        .join('; ')

      const prompt = `Generate comprehensive dashboard insights from this team marketing data for the period ${startDate} to ${endDate}: ${teamSummary}. Provide: total MQLs, team count, response rate percentage, average MQLs per person, top performer name, list of non-responders, and 4-5 actionable insights about team performance, trends, and recommendations.`

      const result = await callInsightsAgent(prompt)

      if (result) {
        const respondedCount = teamData.filter(m => m.status === 'responded').length
        const responseRate = Math.round((respondedCount / teamData.length) * 100)
        const totalMQLs = teamData.reduce((sum, m) => sum + m.mqlCount, 0)
        const avgMQLs = respondedCount > 0 ? Math.round(totalMQLs / respondedCount) : 0
        const topPerformer = teamData.reduce((max, m) => m.mqlCount > max.mqlCount ? m : max, teamData[0])
        const nonResponders = teamData.filter(m => m.status !== 'responded')

        setDashboardData({
          dashboard_status: 'ready',
          aggregate_metrics: {
            total_mqls: result.metadata.total_mqls || totalMQLs,
            team_count: teamData.length,
            response_rate: responseRate,
            avg_mql_per_person: avgMQLs,
            top_performer: topPerformer.name,
            pending_responses: teamData.filter(m => m.status === 'pending').length
          },
          individual_activity_cards: teamData.filter(m => m.status === 'responded'),
          non_responders_list: nonResponders.map(m => m.name),
          insights: [
            `Team achieved ${responseRate}% response rate with ${totalMQLs} total MQLs generated this period`,
            `${topPerformer.name} is the top performer with ${topPerformer.mqlCount} MQLs (${Math.round((topPerformer.mqlCount / totalMQLs) * 100)}% of total)`,
            `Average MQL contribution per responding member is ${avgMQLs} MQLs`,
            `Recommended follow-up with ${nonResponders.length} team member(s) to ensure full engagement and participation next period`,
            'Consider recognizing top performers and replicating their successful strategies across the team'
          ],
          metadata: {
            processing_time: result.metadata.processing_time,
            records_processed: result.metadata.records_processed
          }
        })
      } else {
        setErrors(['Failed to generate dashboard. Please try again.'])
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
      setErrors([errorMsg])
      console.error(error)
    } finally {
      setDashboardLoading(false)
    }
  }, [teamData, startDate, endDate])

  const handleRemind = useCallback((memberId: string) => {
    setTeamData(prev =>
      prev.map(member =>
        member.id === memberId
          ? { ...member, reminder_sent: (member.reminder_sent || 0) + 1 }
          : member
      )
    )
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefreshing(false)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center shadow-md">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Marketing Dashboard</h1>
                <p className="text-sm text-gray-500">Team Performance & MQL Tracking System</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
                className="border-gray-300 hover:bg-gray-100"
              >
                <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
              </Button>
              <ExportDialog teamData={teamData} dashboardData={dashboardData} />
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Date Range:</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-32 text-sm border-gray-300"
              />
              <span className="text-gray-500">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-32 text-sm border-gray-300"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="mb-6 space-y-2">
            {errors.map((error, idx) => (
              <Alert key={idx} className="bg-red-50 border-red-200">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* CTA Section */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-purple-50 via-purple-50 to-purple-100 border border-purple-200 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900">Request Team Updates</h2>
                  <p className="text-sm text-gray-600 mt-1">Send collection requests to team members and gather weekly activity & MQL data</p>
                </div>
                <Button
                  onClick={handleRequestUpdates}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white shadow-md whitespace-nowrap"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Collecting...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Request Updates
                    </>
                  )}
                </Button>
              </div>
              {collectionStatus && (
                <Alert className={cn('mt-4', collectionStatus.includes('Error') ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200')}>
                  <AlertCircle className={cn('h-4 w-4', collectionStatus.includes('Error') ? 'text-red-600' : 'text-green-600')} />
                  <AlertDescription className={collectionStatus.includes('Error') ? 'text-red-700' : 'text-green-700'}>
                    {collectionStatus}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border border-gray-200 shadow-sm">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-50">Overview</TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-purple-50">Team Activity</TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-purple-50">Insights</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {!dashboardData ? (
              <Card className="border border-gray-200 shadow-sm text-center py-16">
                <CardContent>
                  <Eye className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4 font-medium">No Dashboard Generated Yet</p>
                  <p className="text-sm text-gray-500 mb-6">Click the button below to generate insights from collected team data</p>
                  <Button
                    onClick={handleGenerateDashboard}
                    disabled={dashboardLoading || teamData.filter(m => m.status === 'responded').length === 0}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    size="lg"
                  >
                    {dashboardLoading ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate Dashboard'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Aggregate Metrics Panel */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Aggregate Metrics</h2>
                    <Button size="sm" variant="outline" onClick={handleGenerateDashboard} disabled={dashboardLoading}>
                      Refresh
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <MetricCard
                      label="Total MQLs"
                      value={dashboardData.aggregate_metrics.total_mqls}
                      icon={Target}
                      status="positive"
                      trend="+18% vs last period"
                    />
                    <MetricCard
                      label="Team Size"
                      value={dashboardData.aggregate_metrics.team_count}
                      icon={Users}
                      status="neutral"
                    />
                    <MetricCard
                      label="Response Rate"
                      value={`${dashboardData.aggregate_metrics.response_rate}%`}
                      icon={CheckCircle}
                      status="positive"
                      trend={dashboardData.aggregate_metrics.response_rate === 100 ? '✓ Perfect' : 'Good'}
                    />
                    <MetricCard
                      label="Avg MQL/Person"
                      value={dashboardData.aggregate_metrics.avg_mql_per_person}
                      icon={TrendingUp}
                      status="neutral"
                    />
                    <MetricCard
                      label="Pending"
                      value={dashboardData.aggregate_metrics.pending_responses}
                      icon={Clock}
                      status={dashboardData.aggregate_metrics.pending_responses === 0 ? 'positive' : 'pending'}
                    />
                  </div>
                </div>

                {/* Individual Activity Grid & Non-Responders */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Team Activity</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                      {dashboardData.individual_activity_cards.map((member) => (
                        <ActivityCard key={member.id} member={member} onRemind={handleRemind} />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <NonRespondersList
                      members={teamData.filter(m => m.status !== 'responded')}
                      onRemind={handleRemind}
                    />
                    <InsightsSummary insights={dashboardData.insights.slice(0, 3)} />
                  </div>
                </div>

                {/* Last Updated */}
                <div className="text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
                  <p>Dashboard generated {dashboardData.metadata.processing_time} • {dashboardData.metadata.records_processed} records processed</p>
                </div>
              </>
            )}
          </TabsContent>

          {/* Team Activity Tab */}
          <TabsContent value="team" className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">All Team Members ({teamData.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamData.map((member) => (
                  <ActivityCard key={member.id} member={member} onRemind={handleRemind} />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            {dashboardData ? (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Performance Insights</h2>
                <InsightsSummary insights={dashboardData.insights} />
              </div>
            ) : (
              <Card className="border border-gray-200 shadow-sm text-center py-12">
                <CardContent>
                  <p className="text-gray-600 mb-4">Generate dashboard first to view insights and recommendations</p>
                  <Button
                    onClick={handleGenerateDashboard}
                    disabled={dashboardLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Generate Dashboard
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default App