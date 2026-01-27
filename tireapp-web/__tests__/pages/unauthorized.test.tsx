import { render, screen } from '@testing-library/react'
import UnauthorizedPage from '@/app/unauthorized/page'

describe('UnauthorizedPage', () => {
  it('renders the Access Denied heading', () => {
    render(<UnauthorizedPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Access Denied')
  })

  it('renders the admin privileges message', () => {
    render(<UnauthorizedPage />)
    expect(screen.getByText('This page requires Admin privileges.')).toBeInTheDocument()
  })

  it('renders a link back to the app', () => {
    render(<UnauthorizedPage />)
    const link = screen.getByRole('link', { name: /return to app/i })
    expect(link).toHaveAttribute('href', '/app')
  })
})
