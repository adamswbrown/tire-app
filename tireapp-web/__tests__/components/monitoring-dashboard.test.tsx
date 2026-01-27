import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MonitoringDashboard } from '@/components/MonitoringDashboard'
import { apiFetch } from '@/lib/api-client'

jest.mock('@/lib/api-client')
const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>

const mockHealthData = {
  status: 'healthy',
  timestamp: '2025-01-20T12:00:00Z',
  database: {
    connected: true,
    latency: 5,
  },
  uptime: 86400, // 1 day
  memory: {
    used: 536870912, // 512 MB
    total: 1073741824, // 1 GB
    percent: 50,
  },
}

describe('MonitoringDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('shows loading state initially', () => {
    mockApiFetch.mockReturnValue(new Promise(() => {})) // never resolves

    render(<MonitoringDashboard />)

    expect(screen.getByText('Loading health status...')).toBeInTheDocument()
  })

  it('displays health status after loading', async () => {
    mockApiFetch.mockResolvedValueOnce({
      data: mockHealthData,
      status: 200,
      fromCache: false,
    })

    render(<MonitoringDashboard />)

    await waitFor(() => {
      expect(screen.getByText('HEALTHY')).toBeInTheDocument()
    })

    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByText('1d 0h')).toBeInTheDocument()
    expect(screen.getByText('50.0%')).toBeInTheDocument()
  })

  it('displays database latency', async () => {
    mockApiFetch.mockResolvedValueOnce({
      data: mockHealthData,
      status: 200,
      fromCache: false,
    })

    render(<MonitoringDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Latency: 5ms')).toBeInTheDocument()
    })
  })

  it('formats uptime correctly', async () => {
    const testCases = [
      { uptime: 300, expected: '5m' },
      { uptime: 3600, expected: '1h 0m' },
      { uptime: 86400, expected: '1d 0h' },
      { uptime: 90000, expected: '1d 1h' },
    ]

    for (const { uptime, expected } of testCases) {
      mockApiFetch.mockResolvedValueOnce({
        data: { ...mockHealthData, uptime },
        status: 200,
        fromCache: false,
      })

      const { unmount } = render(<MonitoringDashboard />)

      await waitFor(() => {
        expect(screen.getByText(expected)).toBeInTheDocument()
      })

      unmount()
    }
  })

  it('formats memory usage correctly', async () => {
    mockApiFetch.mockResolvedValueOnce({
      data: {
        ...mockHealthData,
        memory: {
          used: 1073741824, // 1 GB
          total: 2147483648, // 2 GB
          percent: 50,
        },
      },
      status: 200,
      fromCache: false,
    })

    render(<MonitoringDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/1\.00 GB \/ 2\.00 GB/)).toBeInTheDocument()
    })
  })

  it('shows error state on fetch failure', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<MonitoringDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument()
    })

    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('retries on error', async () => {
    mockApiFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        data: mockHealthData,
        status: 200,
        fromCache: false,
      })

    render(<MonitoringDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Retry'))

    await waitFor(() => {
      expect(screen.getByText('HEALTHY')).toBeInTheDocument()
    })
  })

  it('allows manual refresh', async () => {
    mockApiFetch.mockResolvedValue({
      data: mockHealthData,
      status: 200,
      fromCache: false,
    })

    render(<MonitoringDashboard />)

    await waitFor(() => {
      expect(screen.getByText('HEALTHY')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Refresh Now'))

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(2)
    })
  })

  it('has auto-refresh checkbox enabled by default', async () => {
    mockApiFetch.mockResolvedValue({
      data: mockHealthData,
      status: 200,
      fromCache: false,
    })

    render(<MonitoringDashboard />)

    await waitFor(() => {
      expect(screen.getByText('HEALTHY')).toBeInTheDocument()
    })

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('allows toggling auto-refresh', async () => {
    mockApiFetch.mockResolvedValue({
      data: mockHealthData,
      status: 200,
      fromCache: false,
    })

    render(<MonitoringDashboard />)

    await waitFor(() => {
      expect(screen.getByText('HEALTHY')).toBeInTheDocument()
    })

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()

    fireEvent.click(checkbox)
    expect(checkbox).not.toBeChecked()

    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it('has refresh interval selector', async () => {
    mockApiFetch.mockResolvedValue({
      data: mockHealthData,
      status: 200,
      fromCache: false,
    })

    render(<MonitoringDashboard />)

    await waitFor(() => {
      expect(screen.getByText('HEALTHY')).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(select).toHaveValue('5000') // Default 5s
  })

  it('shows unhealthy status with red styling', async () => {
    mockApiFetch.mockResolvedValueOnce({
      data: {
        ...mockHealthData,
        status: 'unhealthy',
        database: {
          connected: false,
        },
      },
      status: 200,
      fromCache: false,
    })

    render(<MonitoringDashboard />)

    await waitFor(() => {
      expect(screen.getByText('UNHEALTHY')).toBeInTheDocument()
      expect(screen.getByText('Disconnected')).toBeInTheDocument()
    })
  })

  it('shows memory bar colors based on usage', async () => {
    const testCases = [
      { percent: 50, expectedClass: 'bg-green-500' },
      { percent: 70, expectedClass: 'bg-yellow-500' },
      { percent: 85, expectedClass: 'bg-red-500' },
    ]

    for (const { percent } of testCases) {
      mockApiFetch.mockResolvedValueOnce({
        data: {
          ...mockHealthData,
          memory: { ...mockHealthData.memory, percent },
        },
        status: 200,
        fromCache: false,
      })

      const { unmount } = render(<MonitoringDashboard />)

      await waitFor(() => {
        expect(screen.getByText(`${percent.toFixed(1)}%`)).toBeInTheDocument()
      })

      unmount()
    }
  })
})
