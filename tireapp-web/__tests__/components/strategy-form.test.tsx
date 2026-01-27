import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StrategyQuestionsForm } from '@/components/StrategyQuestionsForm'

// Mock useRouter
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockQuestions = [
  {
    time: 'Tolerate' as const,
    characteristics: 'IT Qualities',
    question: 'Is the application stable?',
    category: 'Stability',
    weight: 5,
    clientAnswer: '-' as const,
    clientScore: 0,
    extendedAnswer: '',
    sampleDrivers: 'Uptime, reliability',
  },
  {
    time: 'Invest' as const,
    characteristics: 'Business Value',
    question: 'Does the app drive revenue?',
    category: 'Value',
    weight: 3,
    clientAnswer: '-' as const,
    clientScore: 0,
    extendedAnswer: '',
    sampleDrivers: 'Revenue impact',
  },
  {
    time: 'Replace' as const,
    characteristics: 'Technology',
    question: 'Is the technology outdated?',
    category: 'Tech Debt',
    weight: 4,
    clientAnswer: '-' as const,
    clientScore: 0,
    extendedAnswer: '',
    sampleDrivers: 'Legacy stack',
  },
  {
    time: 'Eliminate' as const,
    characteristics: 'Usage',
    question: 'Is the app rarely used?',
    category: 'Adoption',
    weight: 3,
    clientAnswer: '-' as const,
    clientScore: 0,
    extendedAnswer: '',
    sampleDrivers: 'User count',
  },
]

describe('StrategyQuestionsForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('renders all questions', () => {
    render(
      <StrategyQuestionsForm
        applicationId="app-1"
        questions={mockQuestions}
        existingAnswers={null}
        distributionThreshold={78}
        tiebreakThreshold={6}
      />
    )
    expect(screen.getByText('Is the application stable?')).toBeInTheDocument()
    expect(screen.getByText('Does the app drive revenue?')).toBeInTheDocument()
    expect(screen.getByText('Is the technology outdated?')).toBeInTheDocument()
    expect(screen.getByText('Is the app rarely used?')).toBeInTheDocument()
  })

  it('renders TIRE score dashboard with four categories', () => {
    render(
      <StrategyQuestionsForm
        applicationId="app-1"
        questions={mockQuestions}
        existingAnswers={null}
        distributionThreshold={78}
        tiebreakThreshold={6}
      />
    )
    expect(screen.getByText('Tolerate')).toBeInTheDocument()
    expect(screen.getByText('Invest')).toBeInTheDocument()
    expect(screen.getByText('Replace')).toBeInTheDocument()
    expect(screen.getByText('Eliminate')).toBeInTheDocument()
  })

  it('shows 0/4 answered initially', () => {
    render(
      <StrategyQuestionsForm
        applicationId="app-1"
        questions={mockQuestions}
        existingAnswers={null}
        distributionThreshold={78}
        tiebreakThreshold={6}
      />
    )
    expect(screen.getByText('0/4 answered')).toBeInTheDocument()
  })

  it('updates answer count when answering questions', () => {
    render(
      <StrategyQuestionsForm
        applicationId="app-1"
        questions={mockQuestions}
        existingAnswers={null}
        distributionThreshold={78}
        tiebreakThreshold={6}
      />
    )

    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'Yes' } })

    expect(screen.getByText('1/4 answered')).toBeInTheDocument()
  })

  it('disables Complete Assessment when not all answered', () => {
    render(
      <StrategyQuestionsForm
        applicationId="app-1"
        questions={mockQuestions}
        existingAnswers={null}
        distributionThreshold={78}
        tiebreakThreshold={6}
      />
    )
    expect(screen.getByText('Complete Assessment')).toBeDisabled()
  })

  it('enables Complete Assessment when all answered', () => {
    render(
      <StrategyQuestionsForm
        applicationId="app-1"
        questions={mockQuestions}
        existingAnswers={null}
        distributionThreshold={78}
        tiebreakThreshold={6}
      />
    )

    const selects = screen.getAllByRole('combobox')
    selects.forEach(select => {
      fireEvent.change(select, { target: { value: 'Yes' } })
    })

    expect(screen.getByText('Complete Assessment')).not.toBeDisabled()
  })

  it('saves progress via API', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    render(
      <StrategyQuestionsForm
        applicationId="app-1"
        questions={mockQuestions}
        existingAnswers={null}
        distributionThreshold={78}
        tiebreakThreshold={6}
      />
    )

    fireEvent.click(screen.getByText('Save Progress'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/questionnaires',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"strategy_questions"'),
        })
      )
    })
  })

  it('shows save error message', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Save failed' }),
    })

    render(
      <StrategyQuestionsForm
        applicationId="app-1"
        questions={mockQuestions}
        existingAnswers={null}
        distributionThreshold={78}
        tiebreakThreshold={6}
      />
    )

    fireEvent.click(screen.getByText('Save Progress'))

    await waitFor(() => {
      expect(screen.getByText('Error: Save failed')).toBeInTheDocument()
    })
  })

  it('merges existing answers into questions', () => {
    const existingAnswers = [
      { clientAnswer: 'Yes', clientScore: 5, extendedAnswer: 'Stable' },
      { clientAnswer: 'No', clientScore: 0, extendedAnswer: '' },
      null,
      null,
    ]

    render(
      <StrategyQuestionsForm
        applicationId="app-1"
        questions={mockQuestions}
        existingAnswers={existingAnswers}
        distributionThreshold={78}
        tiebreakThreshold={6}
      />
    )

    expect(screen.getByText('2/4 answered')).toBeInTheDocument()
  })

  it('filters questions by category', () => {
    render(
      <StrategyQuestionsForm
        applicationId="app-1"
        questions={mockQuestions}
        existingAnswers={null}
        distributionThreshold={78}
        tiebreakThreshold={6}
      />
    )

    // Click Tolerate filter - find the button in the filter section
    const filterButtons = screen.getAllByText(/Tolerate/)
    const filterBtn = filterButtons.find(el => el.tagName === 'BUTTON')
    if (filterBtn) fireEvent.click(filterBtn)

    // Only Tolerate question should be visible
    expect(screen.getByText('Is the application stable?')).toBeInTheDocument()
    expect(screen.queryByText('Does the app drive revenue?')).not.toBeInTheDocument()
  })
})
