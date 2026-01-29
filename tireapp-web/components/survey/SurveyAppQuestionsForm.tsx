'use client'

import { useCallback, useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Model } from 'survey-core'
import { Survey } from 'survey-react-ui'
import 'survey-core/defaultV2.min.css'

import { apiFetch } from '@/lib/api-client'
import { tireAppTheme } from '@/lib/survey-theme'
import {
  convertAppQuestionsToSurvey,
  convertAppAnswersToSurveyData,
  convertSurveyAnswersToAppFormat,
} from '@/lib/survey-converters'

interface Question {
  id: string
  question: string
  type: 'text' | 'select' | 'multiselect' | 'textarea'
  options?: string[]
  required?: boolean
  validation?: string
  showIf?: string
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

export function SurveyAppQuestionsForm({
  applicationId,
  sections,
  existingAnswers,
  backUrl,
}: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [answeredCount, setAnsweredCount] = useState(0)

  // Convert to Survey.js format
  const surveyJson = useMemo(
    () => convertAppQuestionsToSurvey(sections, {
      title: 'Application Questions',
      showProgressBar: true,
    }),
    [sections]
  )

  // Convert existing answers to Survey.js data format
  const initialData = useMemo(
    () => convertAppAnswersToSurveyData(existingAnswers),
    [existingAnswers]
  )

  // Create and configure survey model
  const survey = useMemo(() => {
    const model = new Model(surveyJson)
    model.applyTheme(tireAppTheme)
    model.data = initialData

    // Disable auto-complete - we'll handle saving manually
    model.showCompletedPage = false
    model.showNavigationButtons = 'none' // We'll use our own buttons

    return model
  }, [surveyJson, initialData])

  // Update answered count when survey data changes
  useEffect(() => {
    const updateCount = () => {
      const data = survey.data
      const count = Object.keys(data).filter(k => {
        const v = data[k]
        return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
      }).length
      setAnsweredCount(count)
    }

    // Initial count
    updateCount()

    // Listen for changes
    survey.onValueChanged.add(updateCount)
    return () => {
      survey.onValueChanged.remove(updateCount)
    }
  }, [survey])

  // Handle save
  const handleSave = useCallback(async (completed: boolean = false) => {
    setSaving(true)
    setMessage('')

    const answers = convertSurveyAnswersToAppFormat(survey.data)

    try {
      const { status, data } = await apiFetch<{ success?: boolean; error?: string }>(
        '/api/questionnaires',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationId,
            type: 'app_questions',
            answers,
            completed,
          }),
        }
      )

      if (status >= 200 && status < 300) {
        if (!completed) {
          router.push(backUrl)
        } else {
          setMessage('Saved and marked complete!')
          router.refresh()
        }
      } else {
        setMessage(`Error: ${(data as { error: string }).error}`)
      }
    } catch {
      setMessage('Error: Failed to save')
    }
    setSaving(false)
  }, [applicationId, survey, router, backUrl])

  const totalQuestions = useMemo(
    () => sections.flatMap(s => s.questions).length,
    [sections]
  )

  return (
    <div>
      {/* Sticky header with action buttons */}
      <div className="sticky top-0 z-10 bg-gray-50 -mx-6 px-6 pt-2 pb-4 border-b mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {answeredCount} / {totalQuestions} answered
            </span>
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
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
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Save & Complete
            </button>
          </div>
        </div>
      </div>

      {/* Survey.js form */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <Survey model={survey} />
      </div>

      {/* Navigation buttons - Survey.js pages */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex gap-2">
          <button
            onClick={() => survey.prevPage()}
            disabled={survey.isFirstPage}
            className="px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => survey.nextPage()}
            disabled={survey.isLastPage}
            className="px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <span className="text-sm text-gray-500">
          Page {survey.currentPageNo + 1} of {survey.visiblePageCount}
        </span>
      </div>
    </div>
  )
}
