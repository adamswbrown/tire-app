import {
  calculateClientScore,
  calculateTireScores,
  calculateTirePlacement,
} from '@/lib/tire-scoring'

function makeQuestion(
  time: 'Tolerate' | 'Invest' | 'Replace' | 'Eliminate',
  weight: number,
  clientAnswer: 'Yes' | 'No' | 'Partial/Unsure' | '-' = '-',
) {
  return {
    time,
    characteristics: 'IT Qualities',
    question: `Test question for ${time}`,
    category: 'test',
    weight,
    clientAnswer,
    clientScore: calculateClientScore(clientAnswer, weight),
    extendedAnswer: '',
    sampleDrivers: '',
  }
}

describe('calculateClientScore', () => {
  it('returns full weight for Yes', () => {
    expect(calculateClientScore('Yes', 5)).toBe(5)
    expect(calculateClientScore('Yes', 3)).toBe(3)
  })

  it('returns 0 for No', () => {
    expect(calculateClientScore('No', 5)).toBe(0)
  })

  it('returns half weight for Partial/Unsure', () => {
    expect(calculateClientScore('Partial/Unsure', 4)).toBe(2)
    expect(calculateClientScore('Partial/Unsure', 5)).toBe(2.5)
  })

  it('returns 0 for unanswered (-)', () => {
    expect(calculateClientScore('-', 5)).toBe(0)
  })
})

describe('calculateTireScores', () => {
  it('calculates scores for each TIRE category', () => {
    const questions = [
      makeQuestion('Tolerate', 5, 'Yes'),
      makeQuestion('Tolerate', 3, 'No'),
      makeQuestion('Invest', 4, 'Yes'),
      makeQuestion('Replace', 5, 'Partial/Unsure'),
      makeQuestion('Eliminate', 3, '-'),
    ]

    const scores = calculateTireScores(questions)

    expect(scores.Tolerate.totalScore).toBe(5)
    expect(scores.Tolerate.maxPossibleScore).toBe(8)
    expect(scores.Tolerate.percentageScore).toBe(63)
    expect(scores.Tolerate.answeredQuestions).toBe(2)

    expect(scores.Invest.totalScore).toBe(4)
    expect(scores.Invest.maxPossibleScore).toBe(4)
    expect(scores.Invest.percentageScore).toBe(100)

    expect(scores.Replace.totalScore).toBe(2.5)
    expect(scores.Replace.percentageScore).toBe(50)

    expect(scores.Eliminate.totalScore).toBe(0)
    expect(scores.Eliminate.answeredQuestions).toBe(0)
  })

  it('handles empty questions array', () => {
    const scores = calculateTireScores([])
    expect(scores.Tolerate.percentageScore).toBe(0)
    expect(scores.Invest.percentageScore).toBe(0)
  })
})

describe('calculateTirePlacement', () => {
  it('returns single placement when one category dominates', () => {
    const questions = [
      makeQuestion('Invest', 5, 'Yes'),
      makeQuestion('Invest', 5, 'Yes'),
      makeQuestion('Invest', 5, 'Yes'),
      makeQuestion('Tolerate', 5, 'No'),
      makeQuestion('Replace', 5, 'No'),
      makeQuestion('Eliminate', 5, 'No'),
    ]

    const result = calculateTirePlacement(questions, 78, 6)

    expect(result.confirmedPlacement).toBe('Invest')
    expect(result.tiebreakNeeded).toBe(false)
  })

  it('returns Below Threshold when no category reaches threshold', () => {
    const questions = [
      makeQuestion('Tolerate', 5, 'No'),
      makeQuestion('Invest', 5, 'Partial/Unsure'),
      makeQuestion('Replace', 5, 'No'),
      makeQuestion('Eliminate', 5, 'No'),
    ]

    const result = calculateTirePlacement(questions, 78, 6)

    expect(result.confirmedPlacement).toContain('Below Threshold')
  })

  it('detects tiebreak when multiple categories tied', () => {
    const questions = [
      makeQuestion('Tolerate', 5, 'Yes'),
      makeQuestion('Invest', 5, 'Yes'),
      makeQuestion('Replace', 5, 'No'),
      makeQuestion('Eliminate', 5, 'No'),
    ]

    const result = calculateTirePlacement(questions, 78, 6)

    expect(result.tiebreakNeeded).toBe(true)
    expect(result.confirmedPlacement).toBe('Multiple Placements')
    expect(result.tiedCategories).toContain('Tolerate')
    expect(result.tiedCategories).toContain('Invest')
  })

  it('uses default thresholds when not provided', () => {
    const questions = [
      makeQuestion('Replace', 5, 'Yes'),
    ]
    const result = calculateTirePlacement(questions)
    expect(result.confirmedPlacement).toBe('Replace')
  })

  it('handles all unanswered questions', () => {
    const questions = [
      makeQuestion('Tolerate', 5, '-'),
      makeQuestion('Invest', 5, '-'),
      makeQuestion('Replace', 5, '-'),
      makeQuestion('Eliminate', 5, '-'),
    ]
    const result = calculateTirePlacement(questions, 78, 6)
    expect(result.confirmedPlacement).toContain('Below Threshold')
    expect(result.scores.Tolerate.answeredQuestions).toBe(0)
    expect(result.scores.Invest.answeredQuestions).toBe(0)
  })

  it('handles all Partial/Unsure answers (50% each)', () => {
    const questions = [
      makeQuestion('Tolerate', 4, 'Partial/Unsure'),
      makeQuestion('Invest', 4, 'Partial/Unsure'),
      makeQuestion('Replace', 4, 'Partial/Unsure'),
      makeQuestion('Eliminate', 4, 'Partial/Unsure'),
    ]
    const result = calculateTirePlacement(questions, 78, 6)
    expect(result.confirmedPlacement).toContain('Below Threshold')
    expect(result.scores.Tolerate.percentageScore).toBe(50)
  })

  it('resolves tiebreak when scores differ within threshold', () => {
    const questions = [
      makeQuestion('Tolerate', 5, 'Yes'),
      makeQuestion('Invest', 10, 'Yes'),
      makeQuestion('Invest', 2, 'Partial/Unsure'),
      makeQuestion('Replace', 5, 'No'),
      makeQuestion('Eliminate', 5, 'No'),
    ]
    const result = calculateTirePlacement(questions, 78, 10)
    expect(result.tiebreakNeeded).toBe(true)
    expect(result.tiedCategories).toContain('Tolerate')
    expect(result.tiedCategories).toContain('Invest')
  })

  it('resolves clear winner when multiple above threshold but outside tiebreak', () => {
    const questions = [
      makeQuestion('Tolerate', 5, 'Yes'),
      makeQuestion('Invest', 5, 'Yes'),
      makeQuestion('Invest', 5, 'No'),
      makeQuestion('Replace', 5, 'No'),
      makeQuestion('Eliminate', 5, 'Yes'),
    ]
    const result = calculateTirePlacement(questions, 78, 6)
    expect(result.tiebreakNeeded).toBe(true)
    expect(result.tiedCategories).toHaveLength(2)
  })

  it('handles custom low distribution threshold', () => {
    const questions = [
      makeQuestion('Tolerate', 4, 'Partial/Unsure'),
      makeQuestion('Invest', 5, 'No'),
      makeQuestion('Replace', 5, 'No'),
      makeQuestion('Eliminate', 5, 'No'),
    ]
    const result = calculateTirePlacement(questions, 40, 6)
    expect(result.confirmedPlacement).toBe('Tolerate')
  })

  it('handles weight=0 questions gracefully', () => {
    const questions = [
      makeQuestion('Tolerate', 0, 'Yes'),
      makeQuestion('Invest', 5, 'Yes'),
    ]
    const result = calculateTirePlacement(questions, 78, 6)
    expect(result.scores.Tolerate.percentageScore).toBe(0)
    expect(result.confirmedPlacement).toBe('Invest')
  })

  it('handles many questions per category', () => {
    const questions = []
    for (let i = 0; i < 10; i++) {
      questions.push(makeQuestion('Tolerate', 3, 'Yes'))
    }
    for (let i = 0; i < 5; i++) {
      questions.push(makeQuestion('Invest', 3, 'Yes'))
    }
    for (let i = 0; i < 5; i++) {
      questions.push(makeQuestion('Invest', 3, 'No'))
    }
    questions.push(makeQuestion('Replace', 5, 'No'))
    questions.push(makeQuestion('Eliminate', 5, 'No'))

    const result = calculateTirePlacement(questions, 78, 6)
    expect(result.confirmedPlacement).toBe('Tolerate')
    expect(result.scores.Tolerate.percentageScore).toBe(100)
    expect(result.scores.Invest.percentageScore).toBe(50)
    expect(result.scores.Tolerate.answeredQuestions).toBe(10)
  })

  it('handles exact threshold boundary', () => {
    const questions = [
      { ...makeQuestion('Tolerate', 50, '-'), clientAnswer: 'Yes' as const, clientScore: 50 },
      { ...makeQuestion('Tolerate', 50, '-'), clientAnswer: 'No' as const, clientScore: 0 },
      makeQuestion('Invest', 5, 'No'),
      makeQuestion('Replace', 5, 'No'),
      makeQuestion('Eliminate', 5, 'No'),
    ]
    const result = calculateTirePlacement(questions, 50, 6)
    expect(result.confirmedPlacement).toBe('Tolerate')
  })
})
