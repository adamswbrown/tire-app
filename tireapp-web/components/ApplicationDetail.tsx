'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ApplicationData {
  id: string
  name: string
  assessmentScope: string
  status: string
  dataCenter: string | null
  environment: string | null
  server: string | null
  os: string | null
  treatment: string | null
  solution: string | null
  powerStatus: string | null
  initialTirePlacement: string | null
  confirmedTirePlacement: string | null
  appQuestionsCompleted: boolean
  strategyCompleted: boolean
}

const SCOPES = ['In Scope', 'Out of Scope', 'TBD']
const TIRE_OPTIONS = ['', 'Tolerate', 'Invest', 'Replace', 'Eliminate']

export function ApplicationDetail({
  application,
  customerId,
}: {
  application: ApplicationData
  customerId: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [data, setData] = useState(application)

  async function handleSave() {
    setSaving(true)
    setMessage('')

    const res = await fetch(`/api/applications/${data.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        assessmentScope: data.assessmentScope,
        dataCenter: data.dataCenter || null,
        environment: data.environment || null,
        server: data.server || null,
        os: data.os || null,
        treatment: data.treatment || null,
        solution: data.solution || null,
        powerStatus: data.powerStatus || null,
        confirmedTirePlacement: data.confirmedTirePlacement || null,
      }),
    })

    if (res.ok) {
      setMessage('Saved.')
      router.refresh()
    } else {
      const err = await res.json()
      setMessage(`Error: ${err.error}`)
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${data.name}"? This cannot be undone.`)) return

    const res = await fetch(`/api/applications/${data.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push(`/app/customers/${customerId}/applications`)
      router.refresh()
    } else {
      const err = await res.json()
      setMessage(`Error: ${err.error}`)
    }
  }

  function field(label: string, key: keyof ApplicationData, type: 'text' | 'select' = 'text', options?: string[]) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {type === 'select' && options ? (
          <select
            value={(data[key] as string) || ''}
            onChange={e => setData({ ...data, [key]: e.target.value })}
            className="border rounded px-3 py-2 w-full text-sm"
          >
            {options.map(o => (
              <option key={o} value={o}>{o || '(Not Set)'}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={(data[key] as string) || ''}
            onChange={e => setData({ ...data, [key]: e.target.value })}
            className="border rounded px-3 py-2 w-full text-sm"
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status badges */}
      <div className="flex gap-2 flex-wrap">
        <span className={`px-2 py-1 text-xs rounded ${
          data.status === 'completed' ? 'bg-green-100 text-green-700' :
          data.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {data.status}
        </span>
        <span className={`px-2 py-1 text-xs rounded ${
          data.appQuestionsCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          App Questions: {data.appQuestionsCompleted ? 'Complete' : 'Incomplete'}
        </span>
        <span className={`px-2 py-1 text-xs rounded ${
          data.strategyCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          Strategy: {data.strategyCompleted ? 'Complete' : 'Incomplete'}
        </span>
        {data.confirmedTirePlacement && (
          <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
            TIRE: {data.confirmedTirePlacement}
          </span>
        )}
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg border p-6">
        <div className="grid grid-cols-2 gap-4">
          {field('Application Name', 'name')}
          {field('Assessment Scope', 'assessmentScope', 'select', SCOPES)}
          {field('Data Center', 'dataCenter')}
          {field('Environment', 'environment')}
          {field('Server', 'server')}
          {field('Operating System', 'os')}
          {field('Treatment', 'treatment')}
          {field('Solution', 'solution')}
          {field('Power Status', 'powerStatus')}
          {field('Confirmed TIRE Placement', 'confirmedTirePlacement', 'select', TIRE_OPTIONS)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleDelete}
          className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
        >
          Delete Application
        </button>
        <div className="flex items-center gap-3">
          {message && (
            <span className={`text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
              {message}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
