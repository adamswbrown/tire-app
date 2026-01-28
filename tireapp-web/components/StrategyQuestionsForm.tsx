'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api-client'
import {
  calculateClientScore,
  calculateTirePlacement,
  type StrategyQuestion,
  type ClientAnswer,
  type TireCategory,
} from '@/lib/tire-scoring'

const ANSWER_OPTIONS: ClientAnswer[] = ['-', 'Yes', 'No', 'Partial/Unsure']

const TIRE_COLORS: Record<TireCategory, string> = {
  Tolerate: 'bg-blue-500',
  Invest: 'bg-green-500',
  Replace: 'bg-yellow-500',
  Eliminate: 'bg-red-500',
}

const TIRE_TEXT_COLORS: Record<TireCategory, string> = {
  Tolerate: 'text-blue-700',
  Invest: 'text-green-700',
  Replace: 'text-yellow-700',
  Eliminate: 'text-red-700',
}

export function StrategyQuestionsForm({
  applicationId,
  questions: initialQuestions,
  existingAnswers,
  distributionThreshold,
  tiebreakThreshold,
  backUrl,
}: {
  applicationId: string
  questions: StrategyQuestion[]
  existingAnswers: Record<string, unknown>[] | null
  distributionThreshold: number
  tiebreakThreshold: number
  backUrl: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [filterCategory, setFilterCategory] = useState<TireCategory | 'all'>('all')
  const [selectedPlacement, setSelectedPlacement] = useState<TireCategory | ''>('')
  const stickyHeaderRef = useRef<HTMLDivElement>(null)
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState(0)

  useEffect(() => {
    if (!stickyHeaderRef.current) return
    const updateHeight = () => {
      if (stickyHeaderRef.current) {
        setStickyHeaderHeight(stickyHeaderRef.current.offsetHeight)
      }
    }
    const observer = new ResizeObserver(() => updateHeight())
    observer.observe(stickyHeaderRef.current)
    updateHeight() // Initial measurement
    return () => observer.disconnect()
  }, [])

  // Merge existing answers into questions
  const [questions, setQuestions] = useState<StrategyQuestion[]>(() => {
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
  })

  // Calculate TIRE scores in real-time
  const placement = useMemo(() => {
    return calculateTirePlacement(questions, distributionThreshold, tiebreakThreshold)
  }, [questions, distributionThreshold, tiebreakThreshold])

  const answeredCount = useMemo(
    () => questions.filter(q => q.clientAnswer !== '-').length,
    [questions]
  )

  const updateAnswer = useCallback((index: number, answer: ClientAnswer) => {
    setQuestions(prev => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        clientAnswer: answer,
        clientScore: calculateClientScore(answer, updated[index].weight),
      }
      return updated
    })
  }, [])

  const updateExtended = useCallback((index: number, value: string) => {
    setQuestions(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], extendedAnswer: value }
      return updated
    })
  }, [])

  const handleSave = useCallback(async (completed: boolean = false) => {
    setSaving(true)
    setMessage('')

    try {
      const { status, data } = await apiFetch<{ success?: boolean; error?: string }>('/api/questionnaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          type: 'strategy_questions',
          answers: questions,
          completed,
          ...(selectedPlacement && { confirmedPlacement: selectedPlacement }),
        }),
      })

      if (status >= 200 && status < 300) {
        if (!completed) {
          // Redirect back to applications list after saving progress
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
  }, [applicationId, questions, router, backUrl, selectedPlacement])

  const filtered = useMemo(
    () => filterCategory === 'all'
      ? questions
      : questions.filter(q => q.time === filterCategory),
    [questions, filterCategory]
  )

  return (
    <div>
      {/* Sticky header with scores, placement, and action buttons */}
      <div ref={stickyHeaderRef} className="sticky top-0 z-10 bg-gray-50 -mx-6 px-6 pt-2 pb-4 border-b mb-4">
        {/* Action buttons at top */}
        <div className="flex items-center justify-end gap-3 mb-4">
          {message && (
            <span role="status" className={`text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
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
            disabled={saving || answeredCount < questions.length}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Complete Assessment
          </button>
        </div>

        {/* TIRE Score Dashboard */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          {(['Tolerate', 'Invest', 'Replace', 'Eliminate'] as TireCategory[]).map(cat => {
            const score = placement.scores[cat]
            return (
              <div
                key={cat}
                className={`bg-white rounded-lg border p-3 cursor-pointer ${
                  placement.confirmedPlacement === cat ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
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

        {/* Placement result */}
        <div className="bg-white rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Initial:</span>
                <select
                  value={selectedPlacement}
                  onChange={e => setSelectedPlacement(e.target.value as TireCategory | '')}
                  className="border border-gray-300 rounded px-3 py-1.5 font-bold text-sm bg-white cursor-pointer hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  {(['Tolerate', 'Invest', 'Replace', 'Eliminate'] as TireCategory[]).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <span className="text-sm text-gray-500">Confirmed: </span>
                <span className={`font-bold ${TIRE_TEXT_COLORS[placement.confirmedPlacement as TireCategory] || 'text-gray-700'}`}>
                  {placement.confirmedPlacement}
                </span>
                {placement.tiebreakNeeded && (
                  <span className="ml-2 text-xs text-orange-500">
                    (Tie: {placement.tiedCategories.join(', ')})
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className={`text-sm ${answeredCount < questions.length ? 'text-orange-500' : 'text-green-600'}`}>
                {answeredCount}/{questions.length} answered
              </span>
              {answeredCount < questions.length && (
                <p className="text-xs text-gray-400">Answer all to complete</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-1 mb-4">
        {(['all', 'Tolerate', 'Invest', 'Replace', 'Eliminate'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1 rounded text-xs ${
              filterCategory === cat
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat === 'all' ? `All (${questions.length})` : `${cat} (${questions.filter(q => q.time === cat).length})`}
          </button>
        ))}
      </div>

      {/* Questions Table */}
      <div className="bg-white rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b sticky z-[5]" style={{ top: stickyHeaderHeight }}>
            <tr>
              <th className="text-left px-3 py-2 font-medium w-8">#</th>
              <th className="text-left px-3 py-2 font-medium">Category</th>
              <th className="text-left px-3 py-2 font-medium">Question</th>
              <th className="text-center px-3 py-2 font-medium w-16">Weight</th>
              <th className="text-center px-3 py-2 font-medium w-36">Answer</th>
              <th className="text-center px-3 py-2 font-medium w-16">Score</th>
              <th className="text-left px-3 py-2 font-medium w-48">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((q) => {
              const globalIndex = questions.indexOf(q)
              return (
                <tr key={globalIndex} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400">{globalIndex + 1}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      TIRE_COLORS[q.time]
                    } text-white`}>
                      {q.time.charAt(0)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-sm">{q.question}</div>
                    <div className="text-xs text-gray-400">{q.category}</div>
                  </td>
                  <td className="px-3 py-2 text-center font-mono">{q.weight}</td>
                  <td className="px-3 py-2 text-center">
                    <select
                      aria-label={`Answer for question ${globalIndex + 1}`}
                      value={q.clientAnswer}
                      onChange={e => updateAnswer(globalIndex, e.target.value as ClientAnswer)}
                      className={`border rounded px-2 py-1 text-sm w-full ${
                        q.clientAnswer === 'Yes'
                          ? 'bg-green-50 border-green-300'
                          : q.clientAnswer === 'No'
                          ? 'bg-red-50 border-red-300'
                          : q.clientAnswer === 'Partial/Unsure'
                          ? 'bg-yellow-50 border-yellow-300'
                          : ''
                      }`}
                    >
                      {ANSWER_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center font-mono">
                    {q.clientScore}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      aria-label={`Notes for question ${globalIndex + 1}`}
                      value={q.extendedAnswer || ''}
                      onChange={e => updateExtended(globalIndex, e.target.value)}
                      placeholder="Notes..."
                      className="border rounded px-2 py-1 text-xs w-full"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}
