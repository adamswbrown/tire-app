import { render, screen, waitFor } from '@testing-library/react'
import { UserManager } from '@/components/UserManager'

const mockFetch = jest.fn()
global.fetch = mockFetch

const mockUsers = [
  { id: '1', name: 'Admin User', email: 'admin@test.com', role: 'Admin', createdAt: '2025-01-01T00:00:00Z' },
  { id: '2', name: 'Consultant', email: 'user@test.com', role: 'Consultant', createdAt: '2025-02-01T00:00:00Z' },
]

describe('UserManager', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {})) // never resolves
    render(<UserManager />)
    expect(screen.getByText('Loading users...')).toBeInTheDocument()
  })

  it('renders users after loading', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsers),
    })

    render(<UserManager />)
    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument()
    })
    expect(screen.getByText('admin@test.com')).toBeInTheDocument()
    expect(screen.getByText('user@test.com')).toBeInTheDocument()
  })

  it('shows empty state when no users', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<UserManager />)
    await waitFor(() => {
      expect(screen.getByText(/No users found/)).toBeInTheDocument()
    })
  })

  it('shows error message on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    render(<UserManager />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load users')).toBeInTheDocument()
    })
  })
})
