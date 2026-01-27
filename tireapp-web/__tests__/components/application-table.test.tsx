import { render, screen, fireEvent } from '@testing-library/react'
import { ApplicationTable } from '@/components/ApplicationTable'

const mockApps = [
  {
    id: 'app-1',
    name: 'Web Portal',
    assessmentScope: 'In Scope',
    status: 'completed',
    appQuestionsCompleted: true,
    strategyCompleted: true,
    initialTirePlacement: 'Invest',
    confirmedTirePlacement: 'Invest',
    questionnaires: [
      { type: 'app_questions', completedAt: '2025-01-01' },
      { type: 'strategy_questions', completedAt: '2025-01-02' },
    ],
  },
  {
    id: 'app-2',
    name: 'API Gateway',
    assessmentScope: 'In Scope',
    status: 'in_progress',
    appQuestionsCompleted: false,
    strategyCompleted: false,
    initialTirePlacement: null,
    confirmedTirePlacement: null,
    questionnaires: [],
  },
  {
    id: 'app-3',
    name: 'Legacy System',
    assessmentScope: 'Out of Scope',
    status: 'in_progress',
    appQuestionsCompleted: false,
    strategyCompleted: false,
    initialTirePlacement: null,
    confirmedTirePlacement: null,
    questionnaires: [],
  },
]

describe('ApplicationTable', () => {
  it('renders all applications', () => {
    render(<ApplicationTable applications={mockApps} customerId="cust-1" />)
    expect(screen.getByText('Web Portal')).toBeInTheDocument()
    expect(screen.getByText('API Gateway')).toBeInTheDocument()
    expect(screen.getByText('Legacy System')).toBeInTheDocument()
  })

  it('filters by search term', () => {
    render(<ApplicationTable applications={mockApps} customerId="cust-1" />)
    fireEvent.change(screen.getByPlaceholderText('Search applications...'), {
      target: { value: 'portal' },
    })
    expect(screen.getByText('Web Portal')).toBeInTheDocument()
    expect(screen.queryByText('API Gateway')).not.toBeInTheDocument()
  })

  it('filters by In Scope', () => {
    render(<ApplicationTable applications={mockApps} customerId="cust-1" />)
    // Click the filter button (not the badge in the table)
    const filterButtons = screen.getAllByText('In Scope')
    const filterBtn = filterButtons.find(el => el.tagName === 'BUTTON')!
    fireEvent.click(filterBtn)
    expect(screen.getByText('Web Portal')).toBeInTheDocument()
    expect(screen.getByText('API Gateway')).toBeInTheDocument()
    expect(screen.queryByText('Legacy System')).not.toBeInTheDocument()
  })

  it('filters by Completed', () => {
    render(<ApplicationTable applications={mockApps} customerId="cust-1" />)
    fireEvent.click(screen.getByText('Completed'))
    expect(screen.getByText('Web Portal')).toBeInTheDocument()
    expect(screen.queryByText('API Gateway')).not.toBeInTheDocument()
  })

  it('shows empty state when no matches', () => {
    render(<ApplicationTable applications={mockApps} customerId="cust-1" />)
    fireEvent.change(screen.getByPlaceholderText('Search applications...'), {
      target: { value: 'nonexistent' },
    })
    expect(screen.getByText('No applications match your filter.')).toBeInTheDocument()
  })

  it('displays TIRE placement badge', () => {
    render(<ApplicationTable applications={mockApps} customerId="cust-1" />)
    expect(screen.getByText('Invest')).toBeInTheDocument()
  })

  it('shows check marks for completed questionnaires', () => {
    render(<ApplicationTable applications={mockApps} customerId="cust-1" />)
    // Web Portal has both completed - check marks should be present
    const checkMarks = screen.getAllByText('\u2713')
    expect(checkMarks.length).toBe(2) // appQ + strategy for Web Portal
  })

  it('generates correct links', () => {
    render(<ApplicationTable applications={mockApps} customerId="cust-1" />)
    const appLink = screen.getByText('Web Portal').closest('a')
    expect(appLink).toHaveAttribute('href', '/app/customers/cust-1/applications/app-1')
  })
})
