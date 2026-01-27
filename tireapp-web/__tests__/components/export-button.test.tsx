import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExportButton } from '@/components/ExportButton'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:test')
global.URL.revokeObjectURL = jest.fn()

describe('ExportButton', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders Excel and CSV export buttons', () => {
    render(<ExportButton customerId="cust-1" />)
    expect(screen.getByText('Export Excel')).toBeInTheDocument()
    expect(screen.getByText('CSV')).toBeInTheDocument()
  })

  it('calls export API with xlsx format on Excel button click', async () => {
    const blob = new Blob(['test'], { type: 'application/octet-stream' })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(blob),
      headers: new Headers({
        'Content-Disposition': 'attachment; filename="test.xlsx"',
      }),
    })

    render(<ExportButton customerId="cust-123" />)
    fireEvent.click(screen.getByText('Export Excel'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/export?customerId=cust-123&format=xlsx')
    })
  })

  it('calls export API with csv format on CSV button click', async () => {
    const blob = new Blob(['test'], { type: 'text/csv' })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(blob),
      headers: new Headers({
        'Content-Disposition': 'attachment; filename="test.csv"',
      }),
    })

    render(<ExportButton customerId="cust-456" />)
    fireEvent.click(screen.getByText('CSV'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/export?customerId=cust-456&format=csv')
    })
  })

  it('shows error alert on failed export', async () => {
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {})
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Customer not found' }),
    })

    render(<ExportButton customerId="bad-id" />)
    fireEvent.click(screen.getByText('Export Excel'))

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('Export failed: Customer not found')
    })

    alertMock.mockRestore()
  })
})
