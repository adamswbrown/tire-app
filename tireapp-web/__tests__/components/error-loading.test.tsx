import { render, screen, fireEvent } from '@testing-library/react'
import ErrorPage from '@/app/app/error'
import Loading from '@/app/app/loading'
import NotFound from '@/app/app/not-found'

describe('Error Boundary', () => {
  it('renders error message', () => {
    const error = new globalThis.Error('Database connection failed')
    const reset = jest.fn()
    render(<ErrorPage error={error} reset={reset} />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Database connection failed')).toBeInTheDocument()
  })

  it('renders fallback message when no error message', () => {
    const error = new globalThis.Error()
    const reset = jest.fn()
    render(<ErrorPage error={error} reset={reset} />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('calls reset when Try Again clicked', () => {
    const error = new globalThis.Error('Test error')
    const reset = jest.fn()
    render(<ErrorPage error={error} reset={reset} />)
    fireEvent.click(screen.getByText('Try Again'))
    expect(reset).toHaveBeenCalledTimes(1)
  })
})

describe('Loading', () => {
  it('renders skeleton loading state', () => {
    const { container } = render(<Loading />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })
})

describe('NotFound', () => {
  it('renders 404 page', () => {
    render(<NotFound />)
    expect(screen.getByText('Page Not Found')).toBeInTheDocument()
    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
  })

  it('links back to dashboard', () => {
    render(<NotFound />)
    const link = screen.getByText('Back to Dashboard')
    expect(link.closest('a')).toHaveAttribute('href', '/app')
  })
})
