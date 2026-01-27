import { render, screen } from '@testing-library/react'
import HomePage from '@/app/page'

describe('HomePage', () => {
  it('renders the TIREApp heading', () => {
    render(<HomePage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('TIREApp Web')
  })

  it('renders the sign-in link', () => {
    render(<HomePage />)
    const link = screen.getByRole('link', { name: /sign in with microsoft/i })
    expect(link).toHaveAttribute('href', '/api/auth/signin')
  })

  it('renders the description text', () => {
    render(<HomePage />)
    expect(screen.getByText('TIRE Framework Assessment Tool')).toBeInTheDocument()
  })
})
