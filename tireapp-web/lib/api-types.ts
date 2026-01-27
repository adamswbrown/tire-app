/**
 * Shared API response types for type-safe frontend/backend communication
 */

// Pagination
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

// Error response
export interface ApiError {
  error: string
  errors?: string[]
}

// Customer
export interface CustomerResponse {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  _count: { applications: number }
}

// Application
export interface ApplicationResponse {
  id: string
  name: string
  customerId: string
  assessmentScope: string
  status: string
  dataCenter: string | null
  environment: string | null
  server: string | null
  initialTirePlacement: string | null
  confirmedTirePlacement: string | null
  appQuestionsCompleted: boolean
  strategyCompleted: boolean
  completedAt: string | null
  createdAt: string
  updatedAt: string
  questionnaires?: QuestionnaireResponse[]
  customer?: { id: string; name: string }
  _count?: { assessmentHistory: number }
}

// Questionnaire
export interface QuestionnaireResponse {
  id: string
  applicationId: string
  type: 'app_questions' | 'strategy_questions'
  answers: unknown
  summary: unknown
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

// TIRE Placement
export interface TirePlacement {
  initialPlacement: string
  confirmedPlacement: string
  scores: Record<string, TireScore>
  tiebreakNeeded: boolean
  tiedCategories: string[]
}

export interface TireScore {
  totalScore: number
  maxPossibleScore: number
  percentageScore: number
  answeredQuestions: number
}

// Health check
export interface HealthResponse {
  status: 'ok' | 'degraded'
  timestamp: string
  database: 'connected' | 'disconnected' | 'unknown'
  uptime: number
}

// User
export interface UserResponse {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
}

// Thresholds
export interface ThresholdsResponse {
  distributionThreshold: number
  tiebreakThreshold: number
  [key: string]: number
}

// Upload response
export interface UploadResponse {
  created: number
  total: number
  duplicatesRemoved: number
  warnings: string[]
}

// Batch creation
export interface BatchCreateResponse {
  count: number
}
