'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api-client'

interface User {
  id: string
  name: string | null
  email: string | null
  role: string
  createdAt: string
}

interface Customer {
  id: string
  name: string
}

interface Assignment {
  id: string
  customerId: string
  customerName: string
}

const ROLES = ['Admin', 'Consultant', 'Viewer']

export function UserManager() {
  const [users, setUsers] = useState<User[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  // Add user form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('Consultant')
  const [newPassword, setNewPassword] = useState('')
  const [adding, setAdding] = useState(false)

  // Assignment modal state
  const [assigningUser, setAssigningUser] = useState<User | null>(null)
  const [userAssignments, setUserAssignments] = useState<Assignment[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)

  // Load users and customers
  useEffect(() => {
    Promise.all([
      apiFetch<User[]>('/api/users'),
      apiFetch<Customer[]>('/api/customers'),
    ])
      .then(([usersRes, customersRes]) => {
        if (Array.isArray(usersRes.data)) setUsers(usersRes.data)
        if (Array.isArray(customersRes.data)) setCustomers(customersRes.data)
        setLoading(false)
      })
      .catch(() => {
        setMessage('Failed to load data')
        setLoading(false)
      })
  }, [])

  // Load assignments for a user
  const loadAssignments = useCallback(async (userId: string) => {
    setLoadingAssignments(true)
    try {
      const { data } = await apiFetch<Assignment[]>(`/api/users/${userId}/customers`)
      if (Array.isArray(data)) setUserAssignments(data)
    } catch {
      setUserAssignments([])
    }
    setLoadingAssignments(false)
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

  async function addUser(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setMessage('')

    try {
      const { status, data } = await apiFetch<User | { error: string }>('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          name: newName || undefined,
          role: newRole,
          password: newPassword || undefined,
        }),
      })

      if (status >= 200 && status < 300) {
        const created = data as User
        setUsers(prev => [...prev, created])
        setMessage(`Created user ${created.email}`)
        setShowAddForm(false)
        setNewEmail('')
        setNewName('')
        setNewRole('Consultant')
        setNewPassword('')
      } else {
        setMessage(`Error: ${(data as { error: string }).error}`)
      }
    } catch {
      setMessage('Error: Failed to create user')
    }
    setAdding(false)
  }

  async function assignCustomer(customerId: string) {
    if (!assigningUser) return
    try {
      const { status, data } = await apiFetch<Assignment | { error: string }>(
        `/api/users/${assigningUser.id}/customers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId }),
        }
      )

      if (status >= 200 && status < 300) {
        setUserAssignments(prev => [...prev, data as Assignment])
      }
    } catch {
      // ignore
    }
  }

  async function removeAssignment(customerId: string) {
    if (!assigningUser) return
    try {
      await apiFetch(`/api/users/${assigningUser.id}/customers?customerId=${customerId}`, {
        method: 'DELETE',
      })
      setUserAssignments(prev => prev.filter(a => a.customerId !== customerId))
    } catch {
      // ignore
    }
  }

  if (loading) {
    return <div className="bg-white rounded-lg border p-6">Loading users...</div>
  }

  const assignedCustomerIds = new Set(userAssignments.map(a => a.customerId))
  const unassignedCustomers = customers.filter(c => !assignedCustomerIds.has(c.id))

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">User Management</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showAddForm ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {message && (
        <p className={`text-sm mb-4 ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
          {message}
        </p>
      )}

      {/* Add User Form */}
      {showAddForm && (
        <form onSubmit={addUser} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="email"
              placeholder="Email (required)"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              required
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Name (optional)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <input
              type="password"
              placeholder="Password (optional)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
          <p className="text-xs text-gray-500">
            Password is optional. If not set, user can only sign in via Microsoft.
          </p>
          <button
            type="submit"
            disabled={adding || !newEmail}
            className="px-4 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {adding ? 'Creating...' : 'Create User'}
          </button>
        </form>
      )}

      {/* User List */}
      {users.length === 0 ? (
        <p className="text-gray-400 text-sm">No users found. Add a user to get started.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              <th className="text-left py-2 font-medium">Name</th>
              <th className="text-left py-2 font-medium">Email</th>
              <th className="text-left py-2 font-medium">Role</th>
              <th className="text-left py-2 font-medium">Joined</th>
              <th className="text-left py-2 font-medium">Customers</th>
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
                <td className="py-2">
                  {user.role === 'Admin' ? (
                    <span className="text-xs text-gray-400">All</span>
                  ) : (
                    <button
                      onClick={() => {
                        setAssigningUser(user)
                        loadAssignments(user.id)
                      }}
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      Manage
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Assignment Modal */}
      {assigningUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">
                Assign Customers to {assigningUser.name || assigningUser.email}
              </h3>
              <button
                onClick={() => setAssigningUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            {loadingAssignments ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : (
              <>
                {/* Assigned Customers */}
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Assigned ({userAssignments.length})</p>
                  {userAssignments.length === 0 ? (
                    <p className="text-xs text-gray-400">No customers assigned</p>
                  ) : (
                    <div className="space-y-1">
                      {userAssignments.map(a => (
                        <div
                          key={a.customerId}
                          className="flex items-center justify-between bg-green-50 px-3 py-2 rounded text-sm"
                        >
                          <span>{a.customerName}</span>
                          <button
                            onClick={() => removeAssignment(a.customerId)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Available Customers */}
                <div>
                  <p className="text-sm font-medium mb-2">Available ({unassignedCustomers.length})</p>
                  {unassignedCustomers.length === 0 ? (
                    <p className="text-xs text-gray-400">All customers assigned</p>
                  ) : (
                    <div className="space-y-1">
                      {unassignedCustomers.map(c => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm"
                        >
                          <span>{c.name}</span>
                          <button
                            onClick={() => assignCustomer(c.id)}
                            className="text-blue-500 hover:text-blue-700 text-xs"
                          >
                            Assign
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <button
              onClick={() => setAssigningUser(null)}
              className="mt-4 w-full px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
