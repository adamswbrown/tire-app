import {
  calculateClientScore,
  calculateTireScores,
  calculateTirePlacement,
  type StrategyQuestion,
  type ClientAnswer,
  type TireCategory,
} from '@/lib/tire-scoring'

function makeQuestion(
  time: TireCategory,
  weight: number,
  clientAnswer: ClientAnswer = '-',
): StrategyQuestion {
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
    const questions: StrategyQuestion[] = [
      makeQuestion('Tolerate', 5, 'Yes'),
      makeQuestion('Tolerate', 3, 'No'),
      makeQuestion('Invest', 4, 'Yes'),
      makeQuestion('Replace', 5, 'Partial/Unsure'),
      makeQuestion('Eliminate', 3, '-'),
    ]

    const scores = calculateTireScores(questions)

    expect(scores.Tolerate.totalScore).toBe(5) // Yes(5) + No(0)
    expect(scores.Tolerate.maxPossibleScore).toBe(8) // 5 + 3
    expect(scores.Tolerate.percentageScore).toBe(63) // 5/8 = 62.5% → 63%
    expect(scores.Tolerate.answeredQuestions).toBe(2)

    expect(scores.Invest.totalScore).toBe(4)
    expect(scores.Invest.maxPossibleScore).toBe(4)
    expect(scores.Invest.percentageScore).toBe(100)

    expect(scores.Replace.totalScore).toBe(2.5) // Partial(5/2)
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
    const questions: StrategyQuestion[] = [
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
    const questions: StrategyQuestion[] = [
      makeQuestion('Tolerate', 5, 'No'),
      makeQuestion('Invest', 5, 'Partial/Unsure'), // 50%
      makeQuestion('Replace', 5, 'No'),
      makeQuestion('Eliminate', 5, 'No'),
    ]

    const result = calculateTirePlacement(questions, 78, 6)

    expect(result.confirmedPlacement).toContain('Below Threshold')
  })

  it('detects tiebreak when multiple categories tied', () => {
    const questions: StrategyQuestion[] = [
      makeQuestion('Tolerate', 5, 'Yes'), // 100%
      makeQuestion('Invest', 5, 'Yes'),    // 100%
      makeQuestion('Replace', 5, 'No'),    // 0%
      makeQuestion('Eliminate', 5, 'No'),  // 0%
    ]

    const result = calculateTirePlacement(questions, 78, 6)

    expect(result.tiebreakNeeded).toBe(true)
    expect(result.confirmedPlacement).toBe('Multiple Placements')
    expect(result.tiedCategories).toContain('Tolerate')
    expect(result.tiedCategories).toContain('Invest')
  })

  it('uses default thresholds when not provided', () => {
    const questions: StrategyQuestion[] = [
      makeQuestion('Replace', 5, 'Yes'),
    ]
    const result = calculateTirePlacement(questions)
    expect(result.confirmedPlacement).toBe('Replace')
  })
})
