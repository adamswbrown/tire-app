import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard'
import { apiFetch } from '@/lib/api-client'

jest.mock('@/lib/api-client')
const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>

const mockApplications = [
  {
    id: '1',
    name: 'App 1',
    status: 'completed',
    assessmentScope: 'In Scope',
    initialTirePlacement: 'Tolerate',
    confirmedTirePlacement: 'Invest',
    appQuestionsCompleted: true,
    strategyCompleted: true,
    createdAt: '2026-01-20T12:00:00Z',
    updatedAt: '2026-01-25T12:00:00Z',
  },
  {
    id: '2',
    name: 'App 2',
    status: 'in_progress',
    assessmentScope: 'In Scope',
    initialTirePlacement: 'Replace',
    confirmedTirePlacement: null,
    appQuestionsCompleted: true,
    strategyCompleted: false,
    createdAt: '2026-01-18T12:00:00Z',
    updatedAt: '2026-01-24T12:00:00Z',
  },
  {
    id: '3',
    name: 'App 3',
    status: 'pending',
    assessmentScope: 'Out of Scope',
    initialTirePlacement: null,
    confirmedTirePlacement: null,
    appQuestionsCompleted: false,
    strategyCompleted: false,
    createdAt: '2026-01-15T12:00:00Z',
    updatedAt: '2026-01-22T12:00:00Z',
  },
]

const mockCustomers = [
  { id: 'c1', name: 'Customer 1', _count: { applications: 2 } },
  { id: 'c2', name: 'Customer 2', _count: { applications: 1 } },
]

function setupMocks() {
  mockApiFetch
    .mockResolvedValueOnce({
      data: { data: mockApplications, pagination: { total: 3, page: 1, limit: 100, totalPages: 1 } },
      status: 200,
      fromCache: false,
    })
    .mockResolvedValueOnce({
      data: mockCustomers,
      status: 200,
      fromCache: false,
    })
}

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows loading state initially', () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}))
    render(<AnalyticsDashboard />)
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument()
  })

  it('displays analytics data after loading', async () => {
    setupMocks()
    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Total Applications')).toBeInTheDocument()
    })
  })

  it('shows completion statistics', async () => {
    setupMocks()
    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText('33.3% completion rate')).toBeInTheDocument()
    })
  })

  it('displays TIRE placement breakdown', async () => {
    setupMocks()
    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText('TIRE Placements')).toBeInTheDocument()
      expect(screen.getByText('Tolerate')).toBeInTheDocument()
      expect(screen.getByText('Invest')).toBeInTheDocument()
      expect(screen.getByText('Replace')).toBeInTheDocument()
      expect(screen.getByText('Eliminate')).toBeInTheDocument()
    })
  })

  it('displays scope breakdown', async () => {
    setupMocks()
    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Assessment Scope')).toBeInTheDocument()
      expect(screen.getByText('In Scope')).toBeInTheDocument()
      expect(screen.getByText('Out of Scope')).toBeInTheDocument()
    })
  })

  it('displays customer summary', async () => {
    setupMocks()
    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Customer Summary')).toBeInTheDocument()
      expect(screen.getByText('Total Customers')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument() // Total customers
    })
  })

  it('shows error state on fetch failure', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument()
    })

    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('retries on error', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    // Setup successful response for retry
    setupMocks()
    fireEvent.click(screen.getByText('Retry'))

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument()
      expect(screen.queryByText('Error:')).not.toBeInTheDocument()
    })
  })

  it('allows manual refresh', async () => {
    setupMocks()
    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument()
    })

    setupMocks()
    fireEvent.click(screen.getByText('Refresh'))

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(4) // 2 initial + 2 refresh
    })
  })

  it('shows recent activity chart', async () => {
    setupMocks()
    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Recent Activity (Last 7 Days)')).toBeInTheDocument()
    })
  })

  it('handles empty data gracefully', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        data: { data: [], pagination: { total: 0, page: 1, limit: 100, totalPages: 0 } },
        status: 200,
        fromCache: false,
      })
      .mockResolvedValueOnce({
        data: [],
        status: 200,
        fromCache: false,
      })

    render(<AnalyticsDashboard />)

    await waitFor(() => {
      expect(screen.getByText('0.0% completion rate')).toBeInTheDocument()
    })
  })
})
