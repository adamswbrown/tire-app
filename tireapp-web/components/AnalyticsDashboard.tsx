'use client'

import { useState, useEffect, useMemo } from 'react'
import { apiFetch } from '@/lib/api-client'

interface Application {
  id: string
  name: string
  status: string
  assessmentScope: string
  initialTirePlacement: string | null
  confirmedTirePlacement: string | null
  appQuestionsCompleted: boolean
  strategyCompleted: boolean
  createdAt: string
  updatedAt: string
}

interface Customer {
  id: string
  name: string
  _count: {
    applications: number
  }
}

interface AnalyticsData {
  totalApplications: number
  completedAssessments: number
  inProgressAssessments: number
  notStartedAssessments: number
  tirePlacements: {
    Tolerate: number
    Invest: number
    Replace: number
    Eliminate: number
    Unassigned: number
  }
  scopeBreakdown: {
    'In Scope': number
    'Out of Scope': number
    TBD: number
  }
  recentActivity: {
    date: string
    count: number
  }[]
}

export function AnalyticsDashboard() {
  const [applications, setApplications] = useState<Application[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [appsRes, customersRes] = await Promise.all([
        apiFetch<Application[]>('/api/applications'),
        apiFetch<Customer[]>('/api/customers'),
      ])

      setApplications(appsRes.data)
      setCustomers(customersRes.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const analytics: AnalyticsData = useMemo(() => {
    const totalApplications = applications.length

    // Calculate completion status
    const completedAssessments = applications.filter(
      app => app.appQuestionsCompleted && app.strategyCompleted
    ).length

    const inProgressAssessments = applications.filter(
      app => (app.appQuestionsCompleted || app.strategyCompleted) &&
        !(app.appQuestionsCompleted && app.strategyCompleted)
    ).length

    const notStartedAssessments = applications.filter(
      app => !app.appQuestionsCompleted && !app.strategyCompleted
    ).length

    // TIRE placements
    const tirePlacements = {
      Tolerate: 0,
      Invest: 0,
      Replace: 0,
      Eliminate: 0,
      Unassigned: 0,
    }

    applications.forEach(app => {
      const placement = app.confirmedTirePlacement || app.initialTirePlacement
      if (placement && placement in tirePlacements) {
        tirePlacements[placement as keyof typeof tirePlacements]++
      } else {
        tirePlacements.Unassigned++
      }
    })

    // Scope breakdown
    const scopeBreakdown = {
      'In Scope': 0,
      'Out of Scope': 0,
      'TBD': 0,
    }

    applications.forEach(app => {
      if (app.assessmentScope in scopeBreakdown) {
        scopeBreakdown[app.assessmentScope as keyof typeof scopeBreakdown]++
      }
    })

    // Recent activity (last 7 days)
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const recentActivity: { date: string; count: number }[] = []

    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]

      const count = applications.filter(app => {
        const appDate = new Date(app.updatedAt).toISOString().split('T')[0]
        return appDate === dateStr
      }).length

      recentActivity.push({ date: dateStr, count })
    }

    return {
      totalApplications,
      completedAssessments,
      inProgressAssessments,
      notStartedAssessments,
      tirePlacements,
      scopeBreakdown,
      recentActivity,
    }
  }, [applications])

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-bold mb-4">Analytics Dashboard</h2>
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-bold mb-4">Analytics Dashboard</h2>
        <div className="text-red-500">Error: {error}</div>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    )
  }

  const completionRate = analytics.totalApplications > 0
    ? (analytics.completedAssessments / analytics.totalApplications * 100).toFixed(1)
    : '0.0'

  const tireColors = {
    Tolerate: 'bg-blue-500',
    Invest: 'bg-green-500',
    Replace: 'bg-yellow-500',
    Eliminate: 'bg-red-500',
    Unassigned: 'bg-gray-300',
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">Analytics Dashboard</h2>
        <button
          onClick={loadData}
          className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="border rounded p-4">
          <div className="text-xs text-gray-500 mb-1">Total Applications</div>
          <div className="text-2xl font-bold">{analytics.totalApplications}</div>
        </div>

        <div className="border rounded p-4">
          <div className="text-xs text-gray-500 mb-1">Completed</div>
          <div className="text-2xl font-bold text-green-600">{analytics.completedAssessments}</div>
          <div className="text-xs text-gray-500 mt-1">{completionRate}% completion rate</div>
        </div>

        <div className="border rounded p-4">
          <div className="text-xs text-gray-500 mb-1">In Progress</div>
          <div className="text-2xl font-bold text-yellow-600">{analytics.inProgressAssessments}</div>
        </div>

        <div className="border rounded p-4">
          <div className="text-xs text-gray-500 mb-1">Not Started</div>
          <div className="text-2xl font-bold text-gray-600">{analytics.notStartedAssessments}</div>
        </div>
      </div>

      {/* TIRE Placements */}
      <div className="border rounded p-4 mb-6">
        <h3 className="font-medium mb-4">TIRE Placements</h3>
        <div className="space-y-3">
          {Object.entries(analytics.tirePlacements).map(([category, count]) => {
            const percent = analytics.totalApplications > 0
              ? (count / analytics.totalApplications * 100).toFixed(1)
              : '0'

            return (
              <div key={category}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{category}</span>
                  <span className="text-gray-500">{count} ({percent}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${tireColors[category as keyof typeof tireColors]}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Scope Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="border rounded p-4">
          <h3 className="font-medium mb-4">Assessment Scope</h3>
          <div className="space-y-2">
            {Object.entries(analytics.scopeBreakdown).map(([scope, count]) => {
              const percent = analytics.totalApplications > 0
                ? (count / analytics.totalApplications * 100).toFixed(1)
                : '0'

              return (
                <div key={scope} className="flex justify-between">
                  <span className="text-sm">{scope}</span>
                  <span className="text-sm font-medium">{count} ({percent}%)</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="border rounded p-4">
          <h3 className="font-medium mb-4">Customer Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Total Customers</span>
              <span className="text-sm font-medium">{customers.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Avg Apps per Customer</span>
              <span className="text-sm font-medium">
                {customers.length > 0
                  ? (analytics.totalApplications / customers.length).toFixed(1)
                  : '0'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="border rounded p-4">
        <h3 className="font-medium mb-4">Recent Activity (Last 7 Days)</h3>
        <div className="flex items-end justify-between gap-2 h-32">
          {analytics.recentActivity.map(({ date, count }) => {
            const maxCount = Math.max(...analytics.recentActivity.map(a => a.count), 1)
            const height = (count / maxCount * 100).toFixed(0)

            return (
              <div key={date} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-blue-500 rounded-t" style={{ height: `${height}%` }} />
                <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left">
                  {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="text-xs font-medium">{count}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
