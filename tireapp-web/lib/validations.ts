import { z } from 'zod'

// Customer creation
export const createCustomerSchema = z.object({
  name: z.string().trim().min(1).max(500),
})

// Single application creation
export const createApplicationSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().trim().min(1).max(500),
  assessmentScope: z.string().optional().default('In Scope'),
  dataCenter: z.string().nullable().optional(),
  environment: z.string().nullable().optional(),
  server: z.string().nullable().optional(),
})

// Batch application creation
export const batchCreateApplicationsSchema = z.object({
  customerId: z.string().min(1),
  applications: z.array(z.object({
    name: z.string().min(1),
    assessmentScope: z.string().optional().default('In Scope'),
    dataCenter: z.string().nullable().optional(),
    environment: z.string().nullable().optional(),
    server: z.string().nullable().optional(),
    treatment: z.string().nullable().optional(),
    solution: z.string().nullable().optional(),
    powerStatus: z.string().nullable().optional(),
    os: z.string().nullable().optional(),
    sqlDetected: z.string().nullable().optional(),
    vmwareDesc: z.string().nullable().optional(),
  })).min(1),
})

// Application update
export const updateApplicationSchema = z.object({
  name: z.string().trim().min(1).max(500).optional(),
  assessmentScope: z.string().optional(),
  initialTirePlacement: z.string().nullable().optional(),
  confirmedTirePlacement: z.string().nullable().optional(),
  appQuestionsCompleted: z.boolean().optional(),
  strategyCompleted: z.boolean().optional(),
  status: z.string().optional(),
  completedAt: z.string().datetime().nullable().optional(),
})

// Questionnaire creation
export const createQuestionnaireSchema = z.object({
  applicationId: z.string().min(1),
  type: z.enum(['app_questions', 'strategy_questions']),
  answers: z.union([z.array(z.any()).min(1), z.object({}).passthrough()]),
  completed: z.boolean().optional(),
  confirmedPlacement: z.enum(['Tolerate', 'Invest', 'Replace', 'Eliminate']).optional(),
})

// Threshold update
export const updateThresholdsSchema = z.object({
  distributionThreshold: z.number().min(0).max(100).optional(),
  tiebreakThreshold: z.number().min(0).max(100).optional(),
}).refine(data => data.distributionThreshold !== undefined || data.tiebreakThreshold !== undefined, {
  message: 'At least one threshold must be provided',
})

// User role update
export const updateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['Admin', 'Consultant', 'Viewer']),
})

// Helper to format Zod errors into user-friendly messages
export function formatZodErrors(error: z.ZodError): string {
  return error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
}
