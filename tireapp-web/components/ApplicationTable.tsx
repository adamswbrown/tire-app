'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

interface AppData {
  id: string
  name: string
  assessmentScope: string
  status: string
  appQuestionsCompleted: boolean
  strategyCompleted: boolean
  initialTirePlacement: string | null
  confirmedTirePlacement: string | null
  questionnaires: { type: string; completedAt: string | null }[]
}

const TIRE_COLORS: Record<string, string> = {
  Tolerate: 'bg-blue-100 text-blue-800',
  Invest: 'bg-green-100 text-green-800',
  Replace: 'bg-yellow-100 text-yellow-800',
  Eliminate: 'bg-red-100 text-red-800',
}

type FilterType = 'all' | 'in_scope' | 'out_scope' | 'completed' | 'pending'

export function ApplicationTable({
  applications,
  customerId,
}: {
  applications: AppData[]
  customerId: string
}) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => applications.filter(app => {
    if (search && !app.name.toLowerCase().includes(search.toLowerCase())) return false
    switch (filter) {
      case 'in_scope': return app.assessmentScope === 'In Scope'
      case 'out_scope': return app.assessmentScope === 'Out of Scope'
      case 'completed': return app.status === 'completed'
      case 'pending': return app.status !== 'completed'
      default: return true
    }
  }), [applications, search, filter])

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Search applications..."
          aria-label="Search applications"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm flex-1 max-w-xs"
        />
        <div className="flex gap-1">
          {([
            ['all', 'All'],
            ['in_scope', 'In Scope'],
            ['out_scope', 'Out of Scope'],
            ['completed', 'Completed'],
            ['pending', 'Pending'],
          ] as [FilterType, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 rounded text-xs ${
                filter === key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b sticky top-0 z-[5]">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Application</th>
              <th className="text-left px-4 py-2 font-medium">Scope</th>
              <th className="text-center px-4 py-2 font-medium">App Q</th>
              <th className="text-center px-4 py-2 font-medium">Strategy</th>
              <th className="text-center px-4 py-2 font-medium">TIRE</th>
              <th className="text-center px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(app => (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">
                  <Link
                    href={`/app/customers/${customerId}/applications/${app.id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {app.name}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    app.assessmentScope === 'In Scope'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {app.assessmentScope}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  {app.appQuestionsCompleted ? (
                    <span className="text-green-500">&#10003;</span>
                  ) : (
                    <span className="text-gray-300">&mdash;</span>
                  )}
                </td>
                <td className="px-4 py-2 text-center">
                  {app.strategyCompleted ? (
                    <span className="text-green-500">&#10003;</span>
                  ) : (
                    <span className="text-gray-300">&mdash;</span>
                  )}
                </td>
                <td className="px-4 py-2 text-center">
                  {app.confirmedTirePlacement ? (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      TIRE_COLORS[app.confirmedTirePlacement] || 'bg-gray-100 text-gray-600'
                    }`}>
                      {app.confirmedTirePlacement}
                    </span>
                  ) : (
                    <span className="text-gray-300">&mdash;</span>
                  )}
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="flex gap-1 justify-center">
                    <Link
                      href={`/app/customers/${customerId}/applications/${app.id}/app-questions`}
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                    >
                      App Q
                    </Link>
                    <Link
                      href={`/app/customers/${customerId}/applications/${app.id}/strategy-questions`}
                      className="text-xs px-2 py-1 bg-orange-50 text-orange-600 rounded hover:bg-orange-100"
                    >
                      Strategy
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-6 text-gray-400 text-sm">
            No applications match your filter.
          </div>
        )}
      </div>
    </div>
  )
}
