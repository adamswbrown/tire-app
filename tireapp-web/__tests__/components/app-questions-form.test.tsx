import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AppQuestionsForm } from '@/components/AppQuestionsForm'
import { apiFetch } from '@/lib/api-client'

// Mock useRouter
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

// Mock apiFetch
jest.mock('@/lib/api-client')
const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>

const mockSections = [
  {
    section: 'General Info',
    questions: [
      {
        id: 'q1',
        question: 'Application owner?',
        type: 'text' as const,
        required: true,
      },
      {
        id: 'q2',
        question: 'Primary use case?',
        type: 'select' as const,
        options: ['Internal', 'External', 'Both'],
      },
    ],
  },
  {
    section: 'Technical Details',
    questions: [
      {
        id: 'q3',
        question: 'Describe the architecture',
        type: 'textarea' as const,
      },
      {
        id: 'q4',
        question: 'Supported platforms?',
        type: 'multiselect' as const,
        options: ['Web', 'Mobile', 'Desktop'],
      },
    ],
  },
  {
    section: 'Conditional',
    questions: [
      {
        id: 'q5',
        question: 'Always visible question',
        type: 'text' as const,
      },
      {
        id: 'q6',
        question: 'Only if External',
        type: 'text' as const,
        showIf: { field: 'q2', value: 'External' },
      },
    ],
  },
]

describe('AppQuestionsForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders section tabs', () => {
    render(
      <AppQuestionsForm
        applicationId="app-1"
        sections={mockSections}
        existingAnswers={{}}
      />
    )
    const tabs = screen.getAllByText('General Info')
    expect(tabs.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Technical Details')).toBeInTheDocument()
    expect(screen.getByText('Conditional')).toBeInTheDocument()
  })

  it('renders first section questions by default', () => {
    render(
      <AppQuestionsForm
        applicationId="app-1"
        sections={mockSections}
        existingAnswers={{}}
      />
    )
    expect(screen.getByText('Application owner?')).toBeInTheDocument()
    expect(screen.getByText('Primary use case?')).toBeInTheDocument()
    // Second section not visible
    expect(screen.queryByText('Describe the architecture')).not.toBeInTheDocument()
  })

  it('switches sections on tab click', () => {
    render(
      <AppQuestionsForm
        applicationId="app-1"
        sections={mockSections}
        existingAnswers={{}}
      />
    )
    fireEvent.click(screen.getByText('Technical Details'))
    expect(screen.getByText('Describe the architecture')).toBeInTheDocument()
    expect(screen.getByText('Supported platforms?')).toBeInTheDocument()
    expect(screen.queryByText('Application owner?')).not.toBeInTheDocument()
  })

  it('shows progress bar with 0 answered initially', () => {
    render(
      <AppQuestionsForm
        applicationId="app-1"
        sections={mockSections}
        existingAnswers={{}}
      />
    )
    expect(screen.getByText('0 / 6 answered')).toBeInTheDocument()
  })

  it('updates answer count when filling text input', () => {
    render(
      <AppQuestionsForm
        applicationId="app-1"
        sections={mockSections}
        existingAnswers={{}}
      />
    )
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'John' } })
    expect(screen.getByText('1 / 6 answered')).toBeInTheDocument()
  })

  it('renders select options', () => {
    render(
      <AppQuestionsForm
        applicationId="app-1"
        sections={mockSections}
        existingAnswers={{}}
      />
    )
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(screen.getByText('Internal')).toBeInTheDocument()
    expect(screen.getByText('External')).toBeInTheDocument()
  })

  it('navigates sections with Previous/Next buttons', () => {
    render(
      <AppQuestionsForm
        applicationId="app-1"
        sections={mockSections}
        existingAnswers={{}}
      />
    )
    // Previous disabled on first section
    expect(screen.getByText('Previous')).toBeDisabled()

    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByText('Describe the architecture')).toBeInTheDocument()

    // Now Previous is enabled
    expect(screen.getByText('Previous')).not.toBeDisabled()
  })

  it('disables Next on last section', () => {
    render(
      <AppQuestionsForm
        applicationId="app-1"
        sections={mockSections}
        existingAnswers={{}}
      />
    )
    // Navigate to last section
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByText('Next')).toBeDisabled()
  })

  it('saves progress via API', async () => {
    mockApiFetch.mockResolvedValueOnce({
      data: { success: true },
      status: 200,
      fromCache: false,
    })

    render(
      <AppQuestionsForm
        applicationId="app-1"
        sections={mockSections}
        existingAnswers={{}}
      />
    )
    fireEvent.click(screen.getByText('Save Progress'))

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/questionnaires',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"app_questions"'),
        })
      )
    })
    expect(screen.getByText('Progress saved.')).toBeInTheDocument()
  })

  it('saves and completes via API', async () => {
    mockApiFetch.mockResolvedValueOnce({
      data: { success: true },
      status: 200,
      fromCache: false,
    })

    render(
      <AppQuestionsForm
        applicationId="app-1"
        sections={mockSections}
        existingAnswers={{}}
      />
    )
    fireEvent.click(screen.getByText('Save & Complete'))

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/questionnaires',
        expect.objectContaining({
          body: expect.stringContaining('"completed":true'),
        })
      )
    })
    expect(screen.getByText('Saved and marked complete!')).toBeInTheDocument()
  })

  it('shows error on save failure', async () => {
    mockApiFetch.mockResolvedValueOnce({
      data: { error: 'DB error' },
      status: 500,
      fromCache: false,
    })

    render(
      <AppQuestionsForm
        applicationId="app-1"
        sections={mockSections}
        existingAnswers={{}}
      />
    )
    fireEvent.click(screen.getByText('Save Progress'))

    await waitFor(() => {
      expect(screen.getByText('Error: DB error')).toBeInTheDocument()
    })
  })

  it('loads existing answers', () => {
    render(
      <AppQuestionsForm
        applicationId="app-1"
        sections={mockSections}
        existingAnswers={{ q1: 'Jane', q2: 'External' }}
      />
    )
    expect(screen.getByDisplayValue('Jane')).toBeInTheDocument()
    expect(screen.getByText('2 / 6 answered')).toBeInTheDocument()
  })

  it('renders multiselect checkboxes', () => {
    render(
      <AppQuestionsForm
        applicationId="app-1"
        sections={mockSections}
        existingAnswers={{}}
      />
    )
    fireEvent.click(screen.getByText('Technical Details'))
    expect(screen.getByText('Web')).toBeInTheDocument()
    expect(screen.getByText('Mobile')).toBeInTheDocument()
    expect(screen.getByText('Desktop')).toBeInTheDocument()
  })

  it('toggles multiselect checkboxes and updates count', () => {
    render(
      <AppQuestionsForm
        applicationId="app-1"
        sections={mockSections}
        existingAnswers={{}}
      />
    )
    fireEvent.click(screen.getByText('Technical Details'))

    const webCheckbox = screen.getByRole('checkbox', { name: 'Web' })
    fireEvent.click(webCheckbox)
    expect(screen.getByText('1 / 6 answered')).toBeInTheDocument()
  })

  it('hides conditional questions when condition not met', () => {
    render(
      <AppQuestionsForm
        applicationId="app-1"
        sections={mockSections}
        existingAnswers={{}}
      />
    )
    fireEvent.click(screen.getByText('Conditional'))
    expect(screen.getByText('Always visible question')).toBeInTheDocument()
    expect(screen.queryByText('Only if External')).not.toBeInTheDocument()
  })

  it('shows conditional question when condition met', () => {
    render(
      <AppQuestionsForm
        applicationId="app-1"
        sections={mockSections}
        existingAnswers={{ q2: 'External' }}
      />
    )
    fireEvent.click(screen.getByText('Conditional'))
    expect(screen.getByText('Always visible question')).toBeInTheDocument()
    expect(screen.getByText('Only if External')).toBeInTheDocument()
  })

  it('shows required indicator', () => {
    render(
      <AppQuestionsForm
        applicationId="app-1"
        sections={mockSections}
        existingAnswers={{}}
      />
    )
    // The required question should have a * marker
    const label = screen.getByText('Application owner?')
    const asterisk = label.parentElement?.querySelector('.text-red-500')
    expect(asterisk).toBeInTheDocument()
    expect(asterisk?.textContent).toBe('*')
  })
})
