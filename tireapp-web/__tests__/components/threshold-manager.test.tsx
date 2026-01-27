import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ThresholdManager } from '@/components/ThresholdManager'
import { apiFetch } from '@/lib/api-client'

jest.mock('@/lib/api-client')
const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>

describe('ThresholdManager', () => {
  beforeEach(() => {
    mockApiFetch.mockReset()
  })

  it('shows loading state initially', () => {
    mockApiFetch.mockReturnValue(new Promise(() => {})) // never resolves
    render(<ThresholdManager />)
    expect(screen.getByText('Loading thresholds...')).toBeInTheDocument()
  })

  it('renders thresholds after loading', async () => {
    mockApiFetch.mockResolvedValueOnce({
      data: { distributionThreshold: 78, tiebreakThreshold: 6 },
      status: 200,
      fromCache: false,
    })

    render(<ThresholdManager />)

    await waitFor(() => {
      expect(screen.getByText('TIRE Scoring Thresholds')).toBeInTheDocument()
    })

    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs).toHaveLength(2)
    expect(inputs[0]).toHaveValue(78)
    expect(inputs[1]).toHaveValue(6)
  })

  it('saves updated thresholds', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        data: { distributionThreshold: 78, tiebreakThreshold: 6 },
        status: 200,
        fromCache: false,
      })
      .mockResolvedValueOnce({
        data: { success: true },
        status: 200,
        fromCache: false,
      })

    render(<ThresholdManager />)

    await waitFor(() => {
      expect(screen.getByText('Save Thresholds')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Save Thresholds'))

    await waitFor(() => {
      expect(screen.getByText('Thresholds saved successfully.')).toBeInTheDocument()
    })

    expect(mockApiFetch).toHaveBeenCalledTimes(2)
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/thresholds', expect.objectContaining({
      method: 'PUT',
    }))
  })

  it('shows error on failed load', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<ThresholdManager />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load thresholds')).toBeInTheDocument()
    })
  })
})
