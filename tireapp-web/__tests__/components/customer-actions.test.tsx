import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CustomerActions } from '@/components/CustomerActions'
import { apiFetch } from '@/lib/api-client'

// Mock next/navigation
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

// Mock apiFetch
jest.mock('@/lib/api-client')
const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>

describe('CustomerActions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders New Customer button initially', () => {
    render(<CustomerActions />)
    expect(screen.getByText('+ New Customer')).toBeInTheDocument()
  })

  it('shows form when New Customer button clicked', () => {
    render(<CustomerActions />)
    fireEvent.click(screen.getByText('+ New Customer'))
    expect(screen.getByPlaceholderText('Customer name')).toBeInTheDocument()
    expect(screen.getByText('Create')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('hides form when Cancel clicked', () => {
    render(<CustomerActions />)
    fireEvent.click(screen.getByText('+ New Customer'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.getByText('+ New Customer')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Customer name')).not.toBeInTheDocument()
  })

  it('disables Create button when name is empty', () => {
    render(<CustomerActions />)
    fireEvent.click(screen.getByText('+ New Customer'))
    expect(screen.getByText('Create')).toBeDisabled()
  })

  it('calls API and refreshes on successful create', async () => {
    mockApiFetch.mockResolvedValue({
      data: { id: '1', name: 'Acme' },
      status: 201,
      fromCache: false,
    })

    render(<CustomerActions />)
    fireEvent.click(screen.getByText('+ New Customer'))
    fireEvent.change(screen.getByPlaceholderText('Customer name'), { target: { value: 'Acme Corp' } })
    fireEvent.submit(screen.getByText('Create').closest('form')!)

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Acme Corp' }),
      })
    })
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })
})
