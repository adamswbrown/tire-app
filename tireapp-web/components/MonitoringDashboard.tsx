'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api-client'

interface HealthStatus {
  status: string
  timestamp: string
  database: {
    connected: boolean
    latency?: number
  }
  uptime: number
  memory: {
    used: number
    total: number
    percent: number
  }
}

export function MonitoringDashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshInterval, setRefreshInterval] = useState<number>(5000)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchHealth = useCallback(async () => {
    try {
      const { data } = await apiFetch<HealthStatus>('/api/health')
      setHealth(data)
      setError(null)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health status')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()

    if (!autoRefresh) return

    const interval = setInterval(fetchHealth, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval, autoRefresh, fetchHealth])

  function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  function formatBytes(bytes: number): string {
    const mb = bytes / (1024 * 1024)
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`
    }
    return `${mb.toFixed(2)} MB`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-bold mb-4">System Monitoring</h2>
        <div className="text-gray-500">Loading health status...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-bold mb-4">System Monitoring</h2>
        <div className="text-red-500">Error: {error}</div>
        <button
          onClick={fetchHealth}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!health) {
    return null
  }

  const statusColor = health.status === 'healthy' ? 'text-green-600' : 'text-red-600'
  const statusBg = health.status === 'healthy' ? 'bg-green-100' : 'bg-red-100'
  const dbColor = health.database.connected ? 'text-green-600' : 'text-red-600'

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">System Monitoring</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={!autoRefresh}
            className="text-sm border rounded px-2 py-1"
          >
            <option value={1000}>1s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>
          <button
            onClick={fetchHealth}
            className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
          >
            Refresh Now
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Overall Status */}
        <div className="border rounded p-4">
          <div className="text-xs text-gray-500 mb-1">Overall Status</div>
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusBg} ${statusColor}`}>
            {health.status.toUpperCase()}
          </div>
        </div>

        {/* Database */}
        <div className="border rounded p-4">
          <div className="text-xs text-gray-500 mb-1">Database</div>
          <div className={`text-lg font-bold ${dbColor}`}>
            {health.database.connected ? 'Connected' : 'Disconnected'}
          </div>
          {health.database.latency && (
            <div className="text-xs text-gray-500 mt-1">
              Latency: {health.database.latency}ms
            </div>
          )}
        </div>

        {/* Uptime */}
        <div className="border rounded p-4">
          <div className="text-xs text-gray-500 mb-1">Uptime</div>
          <div className="text-lg font-bold">{formatUptime(health.uptime)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {health.uptime.toLocaleString()}s
          </div>
        </div>

        {/* Memory */}
        <div className="border rounded p-4">
          <div className="text-xs text-gray-500 mb-1">Memory Usage</div>
          <div className="text-lg font-bold">{health.memory.percent.toFixed(1)}%</div>
          <div className="text-xs text-gray-500 mt-1">
            {formatBytes(health.memory.used)} / {formatBytes(health.memory.total)}
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                health.memory.percent > 80
                  ? 'bg-red-500'
                  : health.memory.percent > 60
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${health.memory.percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-xs text-gray-500 text-center">
        Last updated: {new Date(health.timestamp).toLocaleString()}
      </div>
    </div>
  )
}
