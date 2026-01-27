'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

export function AppQuestionsForm({
  applicationId,
  sections,
  existingAnswers,
}: {
  applicationId: string
  sections: Section[]
  existingAnswers: Record<string, unknown>
}) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, unknown>>(existingAnswers)
  const [currentSection, setCurrentSection] = useState(0)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const section = sections[currentSection]

  // Filter questions by showIf conditions
  const visibleQuestions = section.questions.filter(q => {
    if (!q.showIf) return true
    return answers[q.showIf.field] === q.showIf.value
  })

  // Count answered questions
  const totalQuestions = sections.flatMap(s => s.questions).length
  const answeredCount = Object.keys(answers).filter(k => {
    const v = answers[k]
    return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
  }).length

  function updateAnswer(id: string, value: unknown) {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }

  async function handleSave(completed: boolean = false) {
    setSaving(true)
    setMessage('')

    const res = await fetch('/api/questionnaires', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId,
        type: 'app_questions',
        answers,
        completed,
      }),
    })

    if (res.ok) {
      setMessage(completed ? 'Saved and marked complete!' : 'Progress saved.')
      router.refresh()
    } else {
      const data = await res.json()
      setMessage(`Error: ${data.error}`)
    }
    setSaving(false)
  }

  return (
    <div>
      {/* Section tabs */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {sections.map((s, i) => (
          <button
            key={s.section}
            onClick={() => setCurrentSection(i)}
            className={`px-3 py-1.5 rounded text-xs ${
              i === currentSection
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.section}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{answeredCount} / {totalQuestions} answered</span>
          <span>{Math.round((answeredCount / totalQuestions) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="bg-white rounded-lg border p-6 space-y-6">
        <h2 className="text-lg font-semibold border-b pb-2">{section.section}</h2>

        {visibleQuestions.map(q => (
          <div key={q.id}>
            <label className="block text-sm font-medium mb-1">
              {q.question}
              {q.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {q.type === 'text' && (
              <input
                type={q.validation === 'email' ? 'email' : 'text'}
                value={(answers[q.id] as string) || ''}
                onChange={e => updateAnswer(q.id, e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            )}

            {q.type === 'textarea' && (
              <textarea
                value={(answers[q.id] as string) || ''}
                onChange={e => updateAnswer(q.id, e.target.value)}
                rows={3}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            )}

            {q.type === 'select' && q.options && (
              <select
                value={(answers[q.id] as string) || ''}
                onChange={e => updateAnswer(q.id, e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">-- Select --</option>
                {q.options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}

            {q.type === 'multiselect' && q.options && (
              <div className="space-y-1">
                {q.options.map(opt => {
                  const selected = Array.isArray(answers[q.id])
                    ? (answers[q.id] as string[]).includes(opt)
                    : false
                  return (
                    <label key={opt} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={e => {
                          const current = Array.isArray(answers[q.id])
                            ? (answers[q.id] as string[])
                            : []
                          updateAnswer(
                            q.id,
                            e.target.checked
                              ? [...current, opt]
                              : current.filter(v => v !== opt)
                          )
                        }}
                      />
                      {opt}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation & Save */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
            disabled={currentSection === 0}
            className="px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}
            disabled={currentSection === sections.length - 1}
            className="px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            Next
          </button>
        </div>

        <div className="flex items-center gap-3">
          {message && (
            <span className={`text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
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
  )
}
