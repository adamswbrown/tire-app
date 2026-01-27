// TIRE Scoring Engine - ported from Electron strategy-questions.js
// Calculates Tolerate/Invest/Replace/Eliminate placement scores

export type TireCategory = 'Tolerate' | 'Invest' | 'Replace' | 'Eliminate'
export type ClientAnswer = 'Yes' | 'No' | 'Partial/Unsure' | '-'

export interface StrategyQuestion {
  time: TireCategory
  characteristics: string
  question: string
  category: string
  weight: number
  clientAnswer: ClientAnswer
  clientScore: number
  extendedAnswer: string
  sampleDrivers: string
}

export interface TireCategoryScore {
  totalScore: number
  maxPossibleScore: number
  percentageScore: number
  answeredQuestions: number
}

export interface TireScores {
  Tolerate: TireCategoryScore
  Invest: TireCategoryScore
  Replace: TireCategoryScore
  Eliminate: TireCategoryScore
}

export interface TirePlacementResult {
  initialPlacement: string
  confirmedPlacement: string
  scores: TireScores
  tiebreakNeeded: boolean
  tiedCategories: TireCategory[]
}

const TIRE_CATEGORIES: TireCategory[] = ['Tolerate', 'Invest', 'Replace', 'Eliminate']

export function calculateClientScore(clientAnswer: ClientAnswer, weight: number): number {
  switch (clientAnswer) {
    case 'Yes': return weight
    case 'No': return 0
    case 'Partial/Unsure': return weight / 2
    case '-':
    default: return 0
  }
}

export function calculateTireScores(questions: StrategyQuestion[]): TireScores {
  const scores: TireScores = {
    Tolerate: { totalScore: 0, maxPossibleScore: 0, percentageScore: 0, answeredQuestions: 0 },
    Invest: { totalScore: 0, maxPossibleScore: 0, percentageScore: 0, answeredQuestions: 0 },
    Replace: { totalScore: 0, maxPossibleScore: 0, percentageScore: 0, answeredQuestions: 0 },
    Eliminate: { totalScore: 0, maxPossibleScore: 0, percentageScore: 0, answeredQuestions: 0 },
  }

  for (const q of questions) {
    const category = q.time as TireCategory
    if (!scores[category]) continue

    scores[category].maxPossibleScore += q.weight
    if (q.clientAnswer && q.clientAnswer !== '-') {
      scores[category].answeredQuestions++
      scores[category].totalScore += calculateClientScore(q.clientAnswer, q.weight)
    }
  }

  for (const cat of TIRE_CATEGORIES) {
    const s = scores[cat]
    s.percentageScore = s.maxPossibleScore > 0
      ? Math.round((s.totalScore / s.maxPossibleScore) * 100)
      : 0
  }

  return scores
}

export function calculateTirePlacement(
  questions: StrategyQuestion[],
  distributionThreshold: number = 78,
  tiebreakThreshold: number = 6,
): TirePlacementResult {
  const scores = calculateTireScores(questions)

  // Find categories above distribution threshold
  const aboveThreshold = TIRE_CATEGORIES.filter(
    cat => scores[cat].percentageScore >= distributionThreshold
  )

  let initialPlacement: string = 'Not Set'
  let confirmedPlacement: string = 'Not Set'
  let tiebreakNeeded = false
  let tiedCategories: TireCategory[] = []

  if (aboveThreshold.length === 0) {
    const highest = TIRE_CATEGORIES.reduce((a, b) =>
      scores[a].percentageScore > scores[b].percentageScore ? a : b
    )
    initialPlacement = `Below Threshold (${scores[highest].percentageScore}%)`
    confirmedPlacement = initialPlacement
  } else if (aboveThreshold.length === 1) {
    initialPlacement = aboveThreshold[0]
    confirmedPlacement = aboveThreshold[0]
  } else {
    // Multiple categories above threshold - check for tiebreak
    const highestScore = Math.max(...aboveThreshold.map(c => scores[c].percentageScore))
    tiedCategories = aboveThreshold.filter(
      c => highestScore - scores[c].percentageScore <= tiebreakThreshold
    )

    initialPlacement = tiedCategories[0] // highest scoring
    if (tiedCategories.length > 1) {
      tiebreakNeeded = true
      confirmedPlacement = 'Multiple Placements'
    } else {
      confirmedPlacement = tiedCategories[0]
    }
  }

  return {
    initialPlacement,
    confirmedPlacement,
    scores,
    tiebreakNeeded,
    tiedCategories,
  }
}
