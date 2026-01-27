import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ThresholdManager } from '@/components/ThresholdManager'

const mockFetch = jest.fn()
global.fetch = mockFetch

describe('ThresholdManager', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {})) // never resolves
    render(<ThresholdManager />)
    expect(screen.getByText('Loading thresholds...')).toBeInTheDocument()
  })

  it('renders thresholds after loading', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ distributionThreshold: 78, tiebreakThreshold: 6 }),
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
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ distributionThreshold: 78, tiebreakThreshold: 6 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

    render(<ThresholdManager />)

    await waitFor(() => {
      expect(screen.getByText('Save Thresholds')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Save Thresholds'))

    await waitFor(() => {
      expect(screen.getByText('Thresholds saved successfully.')).toBeInTheDocument()
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenLastCalledWith('/api/thresholds', expect.objectContaining({
      method: 'PUT',
    }))
  })

  it('shows error on failed load', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<ThresholdManager />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load thresholds')).toBeInTheDocument()
    })
  })
})
