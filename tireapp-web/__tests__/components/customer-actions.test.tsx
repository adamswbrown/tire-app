import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CustomerActions } from '@/components/CustomerActions'

// Mock next/navigation
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

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
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: '1', name: 'Acme' }) })

    render(<CustomerActions />)
    fireEvent.click(screen.getByText('+ New Customer'))
    fireEvent.change(screen.getByPlaceholderText('Customer name'), { target: { value: 'Acme Corp' } })
    fireEvent.submit(screen.getByText('Create').closest('form')!)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/customers', {
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
