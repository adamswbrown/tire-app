import { render, screen, waitFor } from '@testing-library/react'
import { UserManager } from '@/components/UserManager'
import { apiFetch } from '@/lib/api-client'

jest.mock('@/lib/api-client')
const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>

const mockUsers = [
  { id: '1', name: 'Admin User', email: 'admin@test.com', role: 'Admin', createdAt: '2025-01-01T00:00:00Z' },
  { id: '2', name: 'Consultant', email: 'user@test.com', role: 'Consultant', createdAt: '2025-02-01T00:00:00Z' },
]

describe('UserManager', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows loading state initially', () => {
    mockApiFetch.mockReturnValue(new Promise(() => {})) // never resolves
    render(<UserManager />)
    expect(screen.getByText('Loading users...')).toBeInTheDocument()
  })

  it('renders users after loading', async () => {
    mockApiFetch.mockResolvedValue({
      data: mockUsers,
      status: 200,
      fromCache: false,
    })

    render(<UserManager />)
    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument()
    })
    expect(screen.getByText('admin@test.com')).toBeInTheDocument()
    expect(screen.getByText('user@test.com')).toBeInTheDocument()
  })

  it('shows empty state when no users', async () => {
    mockApiFetch.mockResolvedValue({
      data: [],
      status: 200,
      fromCache: false,
    })

    render(<UserManager />)
    await waitFor(() => {
      expect(screen.getByText(/No users found/)).toBeInTheDocument()
    })
  })

  it('shows error message on fetch failure', async () => {
    mockApiFetch.mockRejectedValue(new Error('Network error'))

    render(<UserManager />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load users')).toBeInTheDocument()
    })
  })
})
