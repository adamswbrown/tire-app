'use client'

import { useState, useEffect } from 'react'

interface Thresholds {
  distributionThreshold: number
  tiebreakThreshold: number
}

export function ThresholdManager() {
  const [thresholds, setThresholds] = useState<Thresholds | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/thresholds')
      .then(res => res.json())
      .then(data => {
        setThresholds(data)
        setLoading(false)
      })
      .catch(() => {
        setMessage('Failed to load thresholds')
        setLoading(false)
      })
  }, [])

  async function handleSave() {
    if (!thresholds) return
    setSaving(true)
    setMessage('')

    const res = await fetch('/api/thresholds', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(thresholds),
    })

    if (res.ok) {
      setMessage('Thresholds saved successfully.')
    } else {
      const data = await res.json()
      setMessage(`Error: ${data.error}`)
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="bg-white rounded-lg border p-6">Loading thresholds...</div>
  }

  if (!thresholds) {
    return <div className="bg-white rounded-lg border p-6 text-red-500">Failed to load thresholds</div>
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-lg font-bold mb-4">TIRE Scoring Thresholds</h2>
      <p className="text-sm text-gray-500 mb-6">
        These thresholds control how TIRE placement is calculated across all assessments.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Distribution Threshold (%)
          </label>
          <p className="text-xs text-gray-400 mb-1">
            Minimum percentage score difference to avoid a tiebreak scenario. Default: 78
          </p>
          <input
            type="number"
            min={0}
            max={100}
            value={thresholds.distributionThreshold}
            onChange={e => setThresholds({ ...thresholds, distributionThreshold: Number(e.target.value) })}
            className="border rounded px-3 py-2 w-32"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Tiebreak Threshold
          </label>
          <p className="text-xs text-gray-400 mb-1">
            Score difference required to break a tie between categories. Default: 6
          </p>
          <input
            type="number"
            min={0}
            max={50}
            value={thresholds.tiebreakThreshold}
            onChange={e => setThresholds({ ...thresholds, tiebreakThreshold: Number(e.target.value) })}
            className="border rounded px-3 py-2 w-32"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Thresholds'}
        </button>
        {message && (
          <span className={`text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
            {message}
          </span>
        )}
      </div>
    </div>
  )
}
