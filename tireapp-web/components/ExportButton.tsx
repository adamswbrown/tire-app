'use client'

import { useState } from 'react'

export function ExportButton({ customerId }: { customerId: string }) {
  const [exporting, setExporting] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  async function handleExport(format: 'xlsx' | 'csv', type: 'full' | 'app_strategies' = 'full') {
    setExporting(true)
    setShowDropdown(false)
    try {
      const res = await fetch(`/api/export?customerId=${customerId}&format=${format}&type=${type}`)
      if (!res.ok) {
        const data = await res.json()
        alert(`Export failed: ${data.error}`)
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')
        ?.match(/filename="(.+)"/)?.[1]
        || `export.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex gap-1 relative">
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={exporting}
          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
        >
          {exporting ? 'Exporting...' : 'Export Excel'}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showDropdown && !exporting && (
          <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-10 min-w-[180px]">
            <button
              onClick={() => handleExport('xlsx', 'full')}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
            >
              Full Export
            </button>
            <button
              onClick={() => handleExport('xlsx', 'app_strategies')}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
            >
              App Strategies Only
            </button>
          </div>
        )}
      </div>
      <button
        onClick={() => handleExport('csv', 'full')}
        disabled={exporting}
        className="px-3 py-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
      >
        CSV
      </button>
    </div>
  )
}
