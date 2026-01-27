'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api-client'

interface User {
  id: string
  name: string | null
  email: string | null
  role: string
  createdAt: string
}

const ROLES = ['Admin', 'Consultant', 'Viewer']

export function UserManager() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    apiFetch<User[]>('/api/users')
      .then(({ data }) => {
        if (Array.isArray(data)) setUsers(data)
        setLoading(false)
      })
      .catch(() => {
        setMessage('Failed to load users')
        setLoading(false)
      })
  }, [])

  async function updateRole(userId: string, role: string) {
    setMessage('')
    try {
      const { status, data } = await apiFetch<User | { error: string }>('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })

      if (status >= 200 && status < 300) {
        const updated = data as User
        setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, role: updated.role } : u))
        setMessage(`Updated ${updated.name || updated.email} to ${updated.role}`)
      } else {
        setMessage(`Error: ${(data as { error: string }).error}`)
      }
    } catch {
      setMessage('Error: Failed to update role')
    }
  }

  if (loading) {
    return <div className="bg-white rounded-lg border p-6">Loading users...</div>
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-lg font-bold mb-4">User Management</h2>
      {message && (
        <p className={`text-sm mb-4 ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
          {message}
        </p>
      )}

      {users.length === 0 ? (
        <p className="text-gray-400 text-sm">No users found. Users are created when they sign in for the first time.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              <th className="text-left py-2 font-medium">Name</th>
              <th className="text-left py-2 font-medium">Email</th>
              <th className="text-left py-2 font-medium">Role</th>
              <th className="text-left py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map(user => (
              <tr key={user.id}>
                <td className="py-2">{user.name || '(no name)'}</td>
                <td className="py-2 text-gray-500">{user.email}</td>
                <td className="py-2">
                  <select
                    value={user.role}
                    onChange={e => updateRole(user.id, e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 text-gray-400 text-xs">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
