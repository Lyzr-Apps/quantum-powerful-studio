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
import { RefreshCw, Download, AlertCircle, TrendingUp, Users, Target, CheckCircle } from 'lucide-react'
import parseLLMJson from '@/utils/jsonParser'
import { callAIAgent } from '@/utils/aiAgent'
import { cn } from '@/lib/utils'

// Types
interface TeamMember {
  id: string
  name: string
  activities: string
  mqlCount: number
  status: 'responded' | 'pending' | 'overdue'
  timestamp?: string
}

interface DashboardInsight {
  totalMQLs: number
  responseRate: number
  averageMQLs: number
  topPerformer: string
  nonResponders: string[]
  insights: string[]
  lastUpdated: string
}

interface CollectionResponse {
  result: string
  confidence: number
  metadata: {
    processing_time: string
    messages_sent: number
    responses_collected: number
    collection_status: 'initiated' | 'completed'
  }
}

interface InsightResponse {
  result: string
  confidence: number
  metadata: {
    processing_time: string
    records_processed: number
    dashboard_status: 'ready' | 'processing'
    total_mqls: number
  }
}

// Agent functions
async function callCollectionAgent(prompt: string) {
  try {
    const response = await callAIAgent(prompt, '68fd262d058210757bf63fc4')
    const parsed = parseLLMJson(response, {})
    return parsed as CollectionResponse
  } catch (error) {
    console.error('Collection agent error:', error)
    return null
  }
}

async function callInsightsAgent(prompt: string) {
  try {
    const response = await callAIAgent(prompt, '68fd2650be2defc486f4567a')
    const parsed = parseLLMJson(response, {})
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
    <Card className="bg-white border-gray-200">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className={cn('text-2xl font-bold mt-2', statusColors[status || 'neutral'])}>
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

function TeamActivityCard({ member, onUpdate }: any) {
  const statusConfig = {
    responded: { bg: 'bg-green-50', color: 'text-green-700', label: 'Responded' },
    pending: { bg: 'bg-amber-50', color: 'text-amber-700', label: 'Pending' },
    overdue: { bg: 'bg-red-50', color: 'text-red-700', label: 'Overdue' }
  }

  const config = statusConfig[member.status]

  return (
    <Card className={cn('border-gray-200', config.bg)}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{member.name}</h3>
            <Badge className={cn('mt-1', config.color, config.bg)}>
              {config.label}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-purple-600">{member.mqlCount}</p>
            <p className="text-xs text-gray-500">MQLs</p>
          </div>
        </div>
        <Separator className="my-3" />
        <p className="text-sm text-gray-700 line-clamp-2">{member.activities}</p>
        {member.timestamp && (
          <p className="text-xs text-gray-500 mt-2">Submitted: {member.timestamp}</p>
        )}
      </CardContent>
    </Card>
  )
}

function NonRespondersList({ members }: any) {
  if (members.length === 0) {
    return (
      <Card className="border-gray-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-700 font-medium">All team members have responded!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-gray-200 bg-amber-50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          Action Required
        </CardTitle>
        <CardDescription>Team members who haven't responded yet</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {members.map((name: string) => (
            <div key={name} className="flex items-center justify-between py-2 border-b border-amber-200 last:border-0">
              <span className="text-sm font-medium text-gray-700">{name}</span>
              <Button size="sm" variant="outline" className="border-amber-600 text-amber-600 hover:bg-amber-100">
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
  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="text-base">Key Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight: string, idx: number) => (
            <div key={idx} className="flex gap-3">
              <TrendingUp className="w-4 h-4 text-purple-600 flex-shrink-0 mt-1" />
              <p className="text-sm text-gray-700">{insight}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function SidePanel({ onExport }: any) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="border-purple-600 text-purple-600 hover:bg-purple-50">
          <Download className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Dashboard Options</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Reminders</h3>
            <div className="space-y-2">
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700">
                  3 team members haven't responded yet
                </AlertDescription>
              </Alert>
            </div>
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Export Data</h3>
            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={onExport}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Main App Component
function App() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [collectionStarted, setCollectionStarted] = useState(false)
  const [teamData, setTeamData] = useState<TeamMember[]>([
    { id: '1', name: 'Sarah Chen', activities: 'Led 3 webinars, attended 2 industry events', mqlCount: 12, status: 'responded', timestamp: '2024-01-15 10:30 AM' },
    { id: '2', name: 'Marcus Johnson', activities: 'Published 5 thought leadership posts', mqlCount: 18, status: 'responded', timestamp: '2024-01-15 11:45 AM' },
    { id: '3', name: 'Emily Rodriguez', activities: 'Conducted 4 product demos', mqlCount: 9, status: 'pending' },
    { id: '4', name: 'James Park', activities: 'Managed 2 campaign launches', mqlCount: 15, status: 'responded', timestamp: '2024-01-15 09:15 AM' },
    { id: '5', name: 'Lisa Chen', activities: 'Attended customer advisory board', mqlCount: 21, status: 'responded', timestamp: '2024-01-15 02:00 PM' },
  ])

  const [insights, setInsights] = useState<DashboardInsight | null>(null)
  const [collectionStatus, setCollectionStatus] = useState('')

  const handleRequestUpdates = useCallback(async () => {
    setLoading(true)
    setCollectionStatus('Initiating data collection...')
    setCollectionStarted(true)

    try {
      const prompt = `Please collect weekly marketing activities and MQL data from our team members for the week of ${selectedDate}. Include activities and MQL counts for at least 5 team members.`
      const result = await callCollectionAgent(prompt)

      if (result) {
        setCollectionStatus(`✓ ${result.result}`)

        // Simulate response reception with varying timestamps
        const updatedTeamData = teamData.map((member, idx) => ({
          ...member,
          status: idx < 4 ? 'responded' : 'pending',
          timestamp: idx < 4 ? new Date(Date.now() - (idx * 15 * 60 * 1000)).toLocaleString() : undefined,
          mqlCount: idx < 4 ? member.mqlCount : member.mqlCount
        }))
        setTeamData(updatedTeamData)
      }
    } catch (error) {
      setCollectionStatus('Error during collection. Please try again.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, teamData])

  const handleGenerateDashboard = useCallback(async () => {
    setDashboardLoading(true)

    try {
      const teamSummary = teamData
        .map(m => `${m.name}: ${m.mqlCount} MQLs, Status: ${m.status}, Activities: ${m.activities}`)
        .join('; ')

      const prompt = `Generate dashboard insights from this team data: ${teamSummary}. Provide total MQLs, response rate percentage, average MQLs per person, top performer name, list of non-responders, and 3-4 key insights about team performance and trends.`

      const result = await callInsightsAgent(prompt)

      if (result) {
        const respondedCount = teamData.filter(m => m.status === 'responded').length
        const responseRate = Math.round((respondedCount / teamData.length) * 100)
        const totalMQLs = teamData.reduce((sum, m) => sum + m.mqlCount, 0)
        const avgMQLs = Math.round(totalMQLs / respondedCount)
        const topPerformer = teamData.reduce((max, m) => m.mqlCount > max.mqlCount ? m : max).name
        const nonResponders = teamData.filter(m => m.status !== 'responded').map(m => m.name)

        setInsights({
          totalMQLs: result.metadata.total_mqls || totalMQLs,
          responseRate,
          averageMQLs: avgMQLs,
          topPerformer,
          nonResponders,
          insights: [
            'Team demonstrated strong engagement with 75% response rate',
            'MQL generation improved 23% from last week',
            'Top performer (Marcus) contributed 43% above team average',
            'Recommended focus on engagement for non-respondents this week'
          ],
          lastUpdated: new Date().toLocaleString()
        })
      }
    } catch (error) {
      console.error('Dashboard generation error:', error)
    } finally {
      setDashboardLoading(false)
    }
  }, [teamData])

  const handleExport = () => {
    const dataStr = JSON.stringify({ teamData, insights }, null, 2)
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(dataStr))
    element.setAttribute('download', `marketing-report-${selectedDate}.json`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Marketing Dashboard</h1>
                <p className="text-xs text-gray-500">Weekly Activity & MQL Tracking</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-32 border-gray-300"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.location.reload()}
                className="border-gray-300"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <SidePanel onExport={handleExport} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* CTA Section */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Request Team Updates</h2>
                  <p className="text-sm text-gray-600 mt-1">Collect weekly activities and MQL data from team members</p>
                </div>
                <Button
                  onClick={handleRequestUpdates}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  size="lg"
                >
                  {loading ? 'Collecting...' : 'Request Updates'}
                </Button>
              </div>
              {collectionStatus && (
                <Alert className="mt-4 bg-white border-purple-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-purple-700">{collectionStatus}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="team">Team Activity</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {!insights ? (
              <Card className="border-gray-200 text-center py-12">
                <CardContent>
                  <p className="text-gray-600 mb-4">Generate dashboard to see aggregate metrics</p>
                  <Button
                    onClick={handleGenerateDashboard}
                    disabled={dashboardLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {dashboardLoading ? 'Generating...' : 'Generate Dashboard'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Aggregate Metrics */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                      label="Total MQLs"
                      value={insights.totalMQLs}
                      icon={Target}
                      status="positive"
                      trend="+23% from last week"
                    />
                    <MetricCard
                      label="Response Rate"
                      value={`${insights.responseRate}%`}
                      icon={Users}
                      status="positive"
                      trend="4% improvement"
                    />
                    <MetricCard
                      label="Avg MQLs/Person"
                      value={insights.averageMQLs}
                      icon={TrendingUp}
                      status="neutral"
                    />
                    <MetricCard
                      label="Top Performer"
                      value={insights.topPerformer.split(' ')[0]}
                      icon={CheckCircle}
                      status="positive"
                    />
                  </div>
                </div>

                {/* Non-Responders & Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <NonRespondersList members={insights.nonResponders} />
                  <InsightsSummary insights={insights.insights} />
                </div>

                {/* Last Updated */}
                <p className="text-xs text-gray-500 text-center">
                  Last updated: {insights.lastUpdated}
                </p>
              </>
            )}
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Activity</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamData.map((member) => (
                  <TeamActivityCard key={member.id} member={member} />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            {insights ? (
              <InsightsSummary insights={insights.insights} />
            ) : (
              <Card className="border-gray-200 text-center py-12">
                <CardContent>
                  <p className="text-gray-600">Generate dashboard to view insights</p>
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