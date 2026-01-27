import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExcelUpload } from '@/components/ExcelUpload'

const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

describe('ExcelUpload', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders upload button', () => {
    render(<ExcelUpload customerId="cust-1" />)
    expect(screen.getByText('Upload Excel')).toBeInTheDocument()
  })

  it('shows success message after upload', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ created: 5, duplicatesRemoved: 2 }),
    })

    render(<ExcelUpload customerId="cust-1" />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['data'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/Imported 5 applications/)).toBeInTheDocument()
    })
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('shows error message on failed upload', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Missing required sheet' }),
    })

    render(<ExcelUpload customerId="cust-1" />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['data'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/Error: Missing required sheet/)).toBeInTheDocument()
    })
  })

  it('sends correct form data', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ created: 1, duplicatesRemoved: 0 }),
    })

    render(<ExcelUpload customerId="cust-1" />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['data'], 'apps.xlsx')

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/upload', {
        method: 'POST',
        body: expect.any(FormData),
      })
    })

    const formData = mockFetch.mock.calls[0][1].body as FormData
    expect(formData.get('customerId')).toBe('cust-1')
    expect(formData.get('file')).toBeTruthy()
  })
})
