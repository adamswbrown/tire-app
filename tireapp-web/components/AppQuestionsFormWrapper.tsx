'use client'

import dynamic from 'next/dynamic'
import { useSurveyJs } from '@/lib/feature-flags'
import { AppQuestionsForm } from './AppQuestionsForm'

// Dynamic import for Survey.js component (SSR disabled)
const SurveyAppQuestionsForm = dynamic(
  () => import('./survey/SurveyAppQuestionsForm').then(mod => mod.SurveyAppQuestionsForm),
  { ssr: false, loading: () => <div className="p-4 text-gray-500">Loading Survey.js...</div> }
)

interface Question {
  id: string
  question: string
  type: 'text' | 'select' | 'multiselect' | 'textarea'
  options?: string[]
  required?: boolean
  validation?: string
  showIf?: { field: string; value: string }
}

interface Section {
  section: string
  questions: Question[]
}

interface Props {
  applicationId: string
  sections: Section[]
  existingAnswers: Record<string, unknown>
  backUrl: string
}

/**
 * Wrapper component that conditionally renders either:
 * - Original AppQuestionsForm (default)
 * - SurveyAppQuestionsForm (when NEXT_PUBLIC_USE_SURVEYJS=true)
 *
 * This enables easy A/B testing and rollback between implementations.
 */
export function AppQuestionsFormWrapper(props: Props) {
  const useSurvey = useSurveyJs()

  if (useSurvey) {
    // Convert sections to Survey.js compatible format
    // The Survey.js component expects showIf as a string expression
    const sectionsWithStringShowIf = props.sections.map(section => ({
      ...section,
      questions: section.questions.map(q => ({
        ...q,
        showIf: q.showIf ? `${q.showIf.field} === '${q.showIf.value}'` : undefined,
      })),
    }))

    return <SurveyAppQuestionsForm {...props} sections={sectionsWithStringShowIf} />
  }

  return <AppQuestionsForm {...props} />
}
