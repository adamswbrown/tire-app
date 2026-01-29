'use client'

import dynamic from 'next/dynamic'
import { useSurveyJs } from '@/lib/feature-flags'
import { StrategyQuestionsForm } from './StrategyQuestionsForm'
import type { StrategyQuestion } from '@/lib/tire-scoring'

// Dynamic import for Survey.js component (SSR disabled)
const SurveyStrategyQuestionsForm = dynamic(
  () => import('./survey/SurveyStrategyQuestionsForm').then(mod => mod.SurveyStrategyQuestionsForm),
  { ssr: false, loading: () => <div className="p-4 text-gray-500">Loading Survey.js...</div> }
)

interface Props {
  applicationId: string
  questions: StrategyQuestion[]
  existingAnswers: Record<string, unknown>[] | null
  distributionThreshold: number
  tiebreakThreshold: number
  backUrl: string
}

/**
 * Wrapper component that conditionally renders either:
 * - Original StrategyQuestionsForm (default)
 * - SurveyStrategyQuestionsForm (when NEXT_PUBLIC_USE_SURVEYJS=true)
 *
 * This enables easy A/B testing and rollback between implementations.
 */
export function StrategyQuestionsFormWrapper(props: Props) {
  const useSurvey = useSurveyJs()

  if (useSurvey) {
    return <SurveyStrategyQuestionsForm {...props} />
  }

  return <StrategyQuestionsForm {...props} />
}
