'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api-client'

export function DeleteCustomerButton({
  customerId,
  customerName,
  applicationCount,
}: {
  customerId: string
  customerName: string
  applicationCount: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    const msg =
      applicationCount > 0
        ? `Delete "${customerName}" and all ${applicationCount} application(s)? This cannot be undone.`
        : `Delete "${customerName}"? This cannot be undone.`

    if (!confirm(msg)) return

    setLoading(true)
    try {
      const { status } = await apiFetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      })
      if (status >= 200 && status < 300) {
        router.refresh()
      } else {
        alert('Failed to delete customer.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 px-2 py-1"
      aria-label={`Delete ${customerName}`}
    >
      {loading ? 'Deleting…' : 'Delete'}
    </button>
  )
}
