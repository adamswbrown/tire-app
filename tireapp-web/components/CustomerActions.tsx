'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api-client'

export function CustomerActions() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const { status } = await apiFetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (status >= 200 && status < 300) {
        setName('')
        setShowForm(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {showForm ? (
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Customer name"
            className="border rounded px-3 py-1.5 text-sm"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="bg-blue-500 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="text-gray-500 px-3 py-1.5 text-sm hover:text-gray-700"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
        >
          + New Customer
        </button>
      )}
    </div>
  )
}
