/**
 * Converters for existing question formats to Survey.js JSON schema
 */

import type { StrategyQuestion, ClientAnswer } from './tire-scoring'

// Types matching existing app-questions.json structure
interface AppQuestion {
  id: string
  question: string
  type: 'text' | 'select' | 'multiselect' | 'textarea'
  options?: string[]
  required?: boolean
  validation?: string
  showIf?: string // e.g., "app_type === 'COTS/ISV'"
}

interface AppSection {
  section: string
  questions: AppQuestion[]
}

// Survey.js JSON types
interface SurveyElement {
  type: string
  name: string
  title?: string
  description?: string
  isRequired?: boolean
  inputType?: string
  choices?: Array<string | { value: string; text: string }>
  visibleIf?: string
  placeholder?: string
  rows?: number
  commentText?: string
  showCommentArea?: boolean
  [key: string]: unknown
}

interface SurveyPage {
  name: string
  title?: string
  elements: SurveyElement[]
}

interface SurveyJson {
  title?: string
  description?: string
  pages: SurveyPage[]
  showProgressBar?: string
  progressBarType?: string
  showQuestionNumbers?: string | boolean
  questionErrorLocation?: string
  completeText?: string
  pagePrevText?: string
  pageNextText?: string
  showNavigationButtons?: boolean | string
  goNextPageAutomatic?: boolean
  checkErrorsMode?: string
  [key: string]: unknown
}

/**
 * Convert showIf expression from app-questions format to Survey.js visibleIf
 * Input: "app_type === 'COTS/ISV'"
 * Output: "{app_type} = 'COTS/ISV'"
 */
function convertShowIfExpression(showIf: string): string {
  // Replace JavaScript-style equality and variable references
  // "field === 'value'" -> "{field} = 'value'"
  return showIf
    .replace(/(\w+)\s*===\s*/g, '{$1} = ')
    .replace(/(\w+)\s*!==\s*/g, '{$1} <> ')
}

/**
 * Convert AppQuestion to Survey.js element
 */
function convertAppQuestion(q: AppQuestion): SurveyElement {
  const base: SurveyElement = {
    type: 'text',
    name: q.id,
    title: q.question,
    isRequired: q.required ?? false,
  }

  // Add visibleIf if showIf is present
  if (q.showIf) {
    base.visibleIf = convertShowIfExpression(q.showIf)
  }

  switch (q.type) {
    case 'text':
      base.type = 'text'
      if (q.validation === 'email') {
        base.inputType = 'email'
      }
      break

    case 'textarea':
      base.type = 'comment'
      base.rows = 3
      break

    case 'select':
      base.type = 'dropdown'
      base.choices = q.options || []
      base.placeholder = '-- Select --'
      break

    case 'multiselect':
      base.type = 'checkbox'
      base.choices = q.options || []
      break
  }

  return base
}

/**
 * Convert app-questions.json sections to Survey.js JSON
 */
export function convertAppQuestionsToSurvey(
  sections: AppSection[],
  options?: {
    title?: string
    showProgressBar?: boolean
  }
): SurveyJson {
  const pages: SurveyPage[] = sections.map((section, index) => ({
    name: `page${index + 1}`,
    title: section.section,
    elements: section.questions.map(convertAppQuestion),
  }))

  return {
    title: options?.title,
    pages,
    showProgressBar: options?.showProgressBar !== false ? 'top' : 'off',
    progressBarType: 'pages',
    showQuestionNumbers: 'on',
    questionErrorLocation: 'bottom',
    showNavigationButtons: 'bottom',
    pagePrevText: 'Previous',
    pageNextText: 'Next',
    completeText: 'Complete',
    checkErrorsMode: 'onValueChanged',
    goNextPageAutomatic: false,
  }
}

/**
 * Convert strategy-questions.json to Survey.js JSON
 *
 * Strategy questions are organized by TIRE category (Tolerate, Invest, Retain, Replace, Eliminate)
 * Each question has:
 * - A radiogroup for the answer (-, Yes, No, Partial/Unsure)
 * - A text field for notes
 * - Display of weight and category info
 */
export function convertStrategyQuestionsToSurvey(
  questions: StrategyQuestion[],
  options?: {
    title?: string
    showProgressBar?: boolean
  }
): SurveyJson {
  // Group questions by TIRE category
  const categories = ['Tolerate', 'Invest', 'Retain', 'Replace', 'Eliminate'] as const
  const grouped: Record<string, StrategyQuestion[]> = {}

  categories.forEach(cat => {
    grouped[cat] = questions.filter(q => q.time === cat)
  })

  const pages: SurveyPage[] = categories.map((category, pageIndex) => {
    const categoryQuestions = grouped[category]
    const elements: SurveyElement[] = []

    categoryQuestions.forEach((q, qIndex) => {
      const globalIndex = questions.findIndex(
        orig => orig.question === q.question && orig.time === q.time
      )
      const questionNumber = globalIndex + 1
      const questionId = `q${questionNumber}`

      // Add the main question with radiogroup
      elements.push({
        type: 'radiogroup',
        name: questionId,
        title: q.question,
        description: `Category: ${q.category} | Weight: ${q.weight}`,
        isRequired: false,
        choices: [
          { value: '-', text: 'Not Answered' },
          { value: 'Yes', text: 'Yes' },
          { value: 'No', text: 'No' },
          { value: 'Partial/Unsure', text: 'Partial/Unsure' },
        ],
        colCount: 4,
        defaultValue: '-',
      })

      // Add notes field for each question
      elements.push({
        type: 'text',
        name: `${questionId}_notes`,
        title: 'Notes',
        titleLocation: 'hidden',
        placeholder: 'Add notes for this question...',
        startWithNewLine: false,
      })
    })

    return {
      name: `page_${category.toLowerCase()}`,
      title: `${category} (${categoryQuestions.length} questions)`,
      elements,
    }
  })

  return {
    title: options?.title,
    pages,
    showProgressBar: options?.showProgressBar !== false ? 'top' : 'off',
    progressBarType: 'questions',
    showQuestionNumbers: false,
    questionErrorLocation: 'bottom',
    showNavigationButtons: 'bottom',
    pagePrevText: 'Previous',
    pageNextText: 'Next',
    completeText: 'Complete Assessment',
    checkErrorsMode: 'onComplete',
    goNextPageAutomatic: false,
  }
}

/**
 * Convert Survey.js answers back to app-questions format
 */
export function convertSurveyAnswersToAppFormat(
  surveyData: Record<string, unknown>
): Record<string, unknown> {
  // Survey.js data is already in {questionId: value} format
  // which matches what the API expects
  return surveyData
}

/**
 * Convert Survey.js answers back to strategy-questions format
 */
export function convertSurveyAnswersToStrategyFormat(
  surveyData: Record<string, unknown>,
  originalQuestions: StrategyQuestion[]
): StrategyQuestion[] {
  const validAnswers: ClientAnswer[] = ['-', 'Yes', 'No', 'Partial/Unsure']

  return originalQuestions.map((q, index) => {
    const questionId = `q${index + 1}`
    const rawAnswer = surveyData[questionId] as string || '-'
    // Validate and cast to ClientAnswer type
    const answer: ClientAnswer = validAnswers.includes(rawAnswer as ClientAnswer)
      ? (rawAnswer as ClientAnswer)
      : '-'
    const notes = surveyData[`${questionId}_notes`] as string || ''

    // Calculate score based on answer and weight
    let score = 0
    if (answer === 'Yes') {
      score = q.weight
    } else if (answer === 'Partial/Unsure') {
      score = Math.floor(q.weight / 2)
    }

    return {
      ...q,
      clientAnswer: answer,
      clientScore: score,
      extendedAnswer: notes,
    }
  })
}

/**
 * Convert existing app answers to Survey.js data format
 */
export function convertAppAnswersToSurveyData(
  answers: Record<string, unknown> | null
): Record<string, unknown> {
  return answers || {}
}

/**
 * Convert existing strategy answers to Survey.js data format
 */
export function convertStrategyAnswersToSurveyData(
  answers: StrategyQuestion[] | null,
  originalQuestions: StrategyQuestion[]
): Record<string, unknown> {
  if (!answers || !Array.isArray(answers)) {
    // Return default values
    const data: Record<string, unknown> = {}
    originalQuestions.forEach((_, index) => {
      data[`q${index + 1}`] = '-'
    })
    return data
  }

  const data: Record<string, unknown> = {}
  answers.forEach((a, index) => {
    const questionId = `q${index + 1}`
    data[questionId] = a.clientAnswer || '-'
    if (a.extendedAnswer) {
      data[`${questionId}_notes`] = a.extendedAnswer
    }
  })
  return data
}
