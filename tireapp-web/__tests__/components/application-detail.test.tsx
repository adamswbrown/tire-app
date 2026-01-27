import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ApplicationDetail } from '@/components/ApplicationDetail'

// Mock useRouter
const mockPush = jest.fn()
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

// Mock window.confirm
const mockConfirm = jest.fn()
global.confirm = mockConfirm

const mockApp = {
  id: 'app-1',
  name: 'Web Portal',
  assessmentScope: 'In Scope',
  status: 'in_progress',
  dataCenter: 'DC-East',
  environment: 'Production',
  server: 'web-01',
  os: 'Linux',
  treatment: null,
  solution: null,
  powerStatus: null,
  initialTirePlacement: null,
  confirmedTirePlacement: 'Invest',
  appQuestionsCompleted: true,
  strategyCompleted: false,
}

describe('ApplicationDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('renders application details', () => {
    render(<ApplicationDetail application={mockApp} customerId="cust-1" />)
    expect(screen.getByDisplayValue('Web Portal')).toBeInTheDocument()
    expect(screen.getByDisplayValue('DC-East')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Production')).toBeInTheDocument()
  })

  it('renders status badges', () => {
    render(<ApplicationDetail application={mockApp} customerId="cust-1" />)
    expect(screen.getByText('in_progress')).toBeInTheDocument()
    expect(screen.getByText('App Questions: Complete')).toBeInTheDocument()
    expect(screen.getByText('Strategy: Incomplete')).toBeInTheDocument()
    expect(screen.getByText('TIRE: Invest')).toBeInTheDocument()
  })

  it('saves changes on button click', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    render(<ApplicationDetail application={mockApp} customerId="cust-1" />)
    fireEvent.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/applications/app-1',
        expect.objectContaining({ method: 'PATCH' })
      )
    })
  })

  it('shows error message on save failure', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Name too long' }),
    })

    render(<ApplicationDetail application={mockApp} customerId="cust-1" />)
    fireEvent.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(screen.getByText('Error: Name too long')).toBeInTheDocument()
    })
  })

  it('deletes application with confirmation', async () => {
    mockConfirm.mockReturnValueOnce(true)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    render(<ApplicationDetail application={mockApp} customerId="cust-1" />)
    fireEvent.click(screen.getByText('Delete Application'))

    expect(mockConfirm).toHaveBeenCalledWith(
      'Delete "Web Portal"? This cannot be undone.'
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/applications/app-1',
        expect.objectContaining({ method: 'DELETE' })
      )
      expect(mockPush).toHaveBeenCalledWith('/app/customers/cust-1/applications')
    })
  })

  it('cancels delete when user declines confirmation', () => {
    mockConfirm.mockReturnValueOnce(false)

    render(<ApplicationDetail application={mockApp} customerId="cust-1" />)
    fireEvent.click(screen.getByText('Delete Application'))

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('updates field values on input change', () => {
    render(<ApplicationDetail application={mockApp} customerId="cust-1" />)

    const nameInput = screen.getByDisplayValue('Web Portal')
    fireEvent.change(nameInput, { target: { value: 'New Portal Name' } })
    expect(screen.getByDisplayValue('New Portal Name')).toBeInTheDocument()
  })
})
