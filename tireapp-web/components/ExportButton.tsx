'use client'

import { useState } from 'react'

export function ExportButton({ customerId }: { customerId: string }) {
  const [exporting, setExporting] = useState(false)

  async function handleExport(format: 'xlsx' | 'csv') {
    setExporting(true)
    try {
      const res = await fetch(`/api/export?customerId=${customerId}&format=${format}`)
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
    <div className="flex gap-1">
      <button
        onClick={() => handleExport('xlsx')}
        disabled={exporting}
        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        {exporting ? 'Exporting...' : 'Export Excel'}
      </button>
      <button
        onClick={() => handleExport('csv')}
        disabled={exporting}
        className="px-3 py-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
      >
        CSV
      </button>
    </div>
  )
}
