'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Model } from 'survey-core'
import { Survey } from 'survey-react-ui'
import 'survey-core/survey-core.min.css'

import { apiFetch } from '@/lib/api-client'
import { tireAppTheme } from '@/lib/survey-theme'
import {
  convertStrategyQuestionsToSurvey,
  convertStrategyAnswersToSurveyData,
  convertSurveyAnswersToStrategyFormat,
} from '@/lib/survey-converters'
import {
  calculateTirePlacement,
  type StrategyQuestion,
  type TireCategory,
  type TirePlacementResult,
} from '@/lib/tire-scoring'

const TIRE_COLORS: Record<TireCategory, string> = {
  Tolerate: 'bg-blue-500',
  Invest: 'bg-green-500',
  Retain: 'bg-purple-500',
  Replace: 'bg-yellow-500',
  Eliminate: 'bg-red-500',
}

const TIRE_TEXT_COLORS: Record<TireCategory, string> = {
  Tolerate: 'text-blue-700',
  Invest: 'text-green-700',
  Retain: 'text-purple-700',
  Replace: 'text-yellow-700',
  Eliminate: 'text-red-700',
}

interface Props {
  applicationId: string
  questions: StrategyQuestion[]
  existingAnswers: Record<string, unknown>[] | null
  distributionThreshold: number
  tiebreakThreshold: number
  backUrl: string
}

export function SurveyStrategyQuestionsForm({
  applicationId,
  questions: initialQuestions,
  existingAnswers,
  distributionThreshold,
  tiebreakThreshold,
  backUrl,
}: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedPlacement, setSelectedPlacement] = useState<TireCategory | ''>('')
  const [placement, setPlacement] = useState<TirePlacementResult | null>(null)
  const [answeredCount, setAnsweredCount] = useState(0)

  // Merge existing answers into questions for initial data
  const mergedQuestions = useMemo(() => {
    if (existingAnswers && Array.isArray(existingAnswers)) {
      return initialQuestions.map((q, i) => {
        const existing = existingAnswers[i] as unknown as StrategyQuestion | undefined
        if (existing) {
          return {
            ...q,
            clientAnswer: existing.clientAnswer || '-',
            clientScore: existing.clientScore || 0,
            extendedAnswer: existing.extendedAnswer || '',
          }
        }
        return q
      })
    }
    return initialQuestions
  }, [initialQuestions, existingAnswers])

  // Convert to Survey.js format
  const surveyJson = useMemo(
    () => convertStrategyQuestionsToSurvey(initialQuestions, {
      title: 'Strategy Assessment',
      showProgressBar: true,
    }),
    [initialQuestions]
  )

  // Convert existing answers to Survey.js data format
  const initialData = useMemo(
    () => convertStrategyAnswersToSurveyData(
      existingAnswers as StrategyQuestion[] | null,
      initialQuestions
    ),
    [existingAnswers, initialQuestions]
  )

  // Create survey model
  const survey = useMemo(() => {
    const model = new Model(surveyJson)
    model.applyTheme(tireAppTheme)
    model.data = initialData
    model.showCompletedPage = false
    model.showNavigationButtons = 'none'
    return model
  }, [surveyJson, initialData])

  // Calculate placement and count on data change
  useEffect(() => {
    const updateScores = () => {
      const currentQuestions = convertSurveyAnswersToStrategyFormat(survey.data, mergedQuestions)
      const newPlacement = calculateTirePlacement(currentQuestions, distributionThreshold, tiebreakThreshold)
      setPlacement(newPlacement)
      setAnsweredCount(currentQuestions.filter(q => q.clientAnswer !== '-').length)
    }

    // Initial calculation
    updateScores()

    // Listen to value changes for real-time scoring
    survey.onValueChanged.add(updateScores)
    return () => {
      survey.onValueChanged.remove(updateScores)
    }
  }, [survey, mergedQuestions, distributionThreshold, tiebreakThreshold])

  // Handle save
  const handleSave = useCallback(async (completed: boolean = false) => {
    setSaving(true)
    setMessage('')

    const questionsWithAnswers = convertSurveyAnswersToStrategyFormat(
      survey.data,
      mergedQuestions
    )

    try {
      const { status, data } = await apiFetch<{ success?: boolean; error?: string }>(
        '/api/questionnaires',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationId,
            type: 'strategy_questions',
            answers: questionsWithAnswers,
            completed,
            ...(selectedPlacement && { confirmedPlacement: selectedPlacement }),
          }),
        }
      )

      if (status >= 200 && status < 300) {
        if (!completed) {
          router.push(backUrl)
        } else {
          setMessage('Assessment complete!')
          router.refresh()
        }
      } else {
        setMessage(`Error: ${(data as { error: string }).error}`)
      }
    } catch {
      setMessage('Error: Failed to save')
    }
    setSaving(false)
  }, [applicationId, survey, router, backUrl, selectedPlacement, mergedQuestions])

  // Default placement while loading
  const displayPlacement = placement || {
    scores: {
      Tolerate: { totalScore: 0, maxPossibleScore: 0, percentageScore: 0, answeredQuestions: 0 },
      Invest: { totalScore: 0, maxPossibleScore: 0, percentageScore: 0, answeredQuestions: 0 },
      Retain: { totalScore: 0, maxPossibleScore: 0, percentageScore: 0, answeredQuestions: 0 },
      Replace: { totalScore: 0, maxPossibleScore: 0, percentageScore: 0, answeredQuestions: 0 },
      Eliminate: { totalScore: 0, maxPossibleScore: 0, percentageScore: 0, answeredQuestions: 0 },
    },
    confirmedPlacement: 'Not Set',
    tiebreakNeeded: false,
    tiedCategories: [] as TireCategory[],
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Fixed header with scores, placement, and action buttons */}
      <div className="flex-shrink-0 bg-gray-50 -mx-6 px-6 pt-2 pb-4 border-b">
        {/* Action buttons at top */}
        <div className="flex items-center justify-end gap-3 mb-4">
          {message && (
            <span
              role="status"
              className={`text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}
            >
              {message}
            </span>
          )}
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            Save Progress
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !selectedPlacement}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Complete Assessment
          </button>
        </div>

        {/* TIRE Score Dashboard */}
        <div className="grid grid-cols-5 gap-3 mb-3">
          {(['Tolerate', 'Invest', 'Retain', 'Replace', 'Eliminate'] as TireCategory[]).map(cat => {
            const score = displayPlacement.scores[cat]
            return (
              <div
                key={cat}
                className={`bg-white rounded-lg border p-3 ${
                  selectedPlacement === cat ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-bold text-sm ${TIRE_TEXT_COLORS[cat]}`}>{cat}</span>
                  <span className="text-xl font-bold">{score.percentageScore}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${TIRE_COLORS[cat]} h-2 rounded-full transition-all`}
                    style={{ width: `${score.percentageScore}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {score.totalScore}/{score.maxPossibleScore} pts
                </p>
              </div>
            )
          })}
        </div>

        {/* Placement result and navigation */}
        <div className="bg-white rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Placement:</span>
                <select
                  value={selectedPlacement}
                  onChange={e => setSelectedPlacement(e.target.value as TireCategory | '')}
                  className="border border-gray-300 rounded px-3 py-1.5 font-bold text-sm bg-white cursor-pointer hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  {(['Tolerate', 'Invest', 'Retain', 'Replace', 'Eliminate'] as TireCategory[]).map(
                    cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <span className="text-sm text-gray-500">Calculated: </span>
                <span
                  className={`font-bold ${
                    TIRE_TEXT_COLORS[displayPlacement.confirmedPlacement as TireCategory] || 'text-gray-700'
                  }`}
                >
                  {displayPlacement.confirmedPlacement}
                </span>
                {displayPlacement.tiebreakNeeded && (
                  <span className="ml-2 text-xs text-orange-500">
                    (Tie: {displayPlacement.tiedCategories.join(', ')})
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span
                className={`text-sm ${selectedPlacement ? 'text-green-600' : 'text-orange-500'}`}
              >
                {answeredCount}/{initialQuestions.length} answered
              </span>
              {/* Page navigation */}
              <div className="flex items-center gap-2 border-l pl-4">
                <button
                  onClick={() => survey.prevPage()}
                  disabled={survey.isFirstPage}
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-500">
                  {survey.currentPageNo + 1}/{survey.visiblePageCount}
                </span>
                <button
                  onClick={() => survey.nextPage()}
                  disabled={survey.isLastPage}
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Survey.js form */}
      <div className="flex-1 overflow-y-auto mt-4">
        <div className="bg-white rounded-lg border overflow-hidden">
          <Survey model={survey} />
        </div>
      </div>
    </div>
  )
}
