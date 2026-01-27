import {
  createCustomerSchema,
  createApplicationSchema,
  batchCreateApplicationsSchema,
  updateApplicationSchema,
  createQuestionnaireSchema,
  updateThresholdsSchema,
  updateUserRoleSchema,
  formatZodErrors,
} from '@/lib/validations'

describe('Zod validation schemas', () => {
  describe('createCustomerSchema', () => {
    it('accepts valid name', () => {
      const result = createCustomerSchema.safeParse({ name: 'Acme Corp' })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.name).toBe('Acme Corp')
    })

    it('trims whitespace', () => {
      const result = createCustomerSchema.safeParse({ name: '  Acme  ' })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.name).toBe('Acme')
    })

    it('rejects empty name', () => {
      const result = createCustomerSchema.safeParse({ name: '' })
      expect(result.success).toBe(false)
    })

    it('rejects whitespace-only name', () => {
      const result = createCustomerSchema.safeParse({ name: '   ' })
      expect(result.success).toBe(false)
    })

    it('rejects name over 500 chars', () => {
      const result = createCustomerSchema.safeParse({ name: 'x'.repeat(501) })
      expect(result.success).toBe(false)
    })

    it('rejects missing name', () => {
      const result = createCustomerSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('rejects non-string name', () => {
      const result = createCustomerSchema.safeParse({ name: 123 })
      expect(result.success).toBe(false)
    })
  })

  describe('createApplicationSchema', () => {
    it('accepts valid input', () => {
      const result = createApplicationSchema.safeParse({
        customerId: 'cust-1',
        name: 'My App',
      })
      expect(result.success).toBe(true)
    })

    it('defaults assessmentScope to In Scope', () => {
      const result = createApplicationSchema.safeParse({
        customerId: 'cust-1',
        name: 'My App',
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.assessmentScope).toBe('In Scope')
    })

    it('rejects missing customerId', () => {
      const result = createApplicationSchema.safeParse({ name: 'App' })
      expect(result.success).toBe(false)
    })

    it('rejects missing name', () => {
      const result = createApplicationSchema.safeParse({ customerId: 'c1' })
      expect(result.success).toBe(false)
    })
  })

  describe('batchCreateApplicationsSchema', () => {
    it('accepts valid batch', () => {
      const result = batchCreateApplicationsSchema.safeParse({
        customerId: 'cust-1',
        applications: [{ name: 'App1' }, { name: 'App2' }],
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty applications array', () => {
      const result = batchCreateApplicationsSchema.safeParse({
        customerId: 'cust-1',
        applications: [],
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing customerId', () => {
      const result = batchCreateApplicationsSchema.safeParse({
        applications: [{ name: 'App1' }],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateApplicationSchema', () => {
    it('accepts partial update with name', () => {
      const result = updateApplicationSchema.safeParse({ name: 'Updated' })
      expect(result.success).toBe(true)
    })

    it('accepts empty object (no fields)', () => {
      const result = updateApplicationSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('rejects name over 500 chars', () => {
      const result = updateApplicationSchema.safeParse({ name: 'x'.repeat(501) })
      expect(result.success).toBe(false)
    })

    it('rejects empty name', () => {
      const result = updateApplicationSchema.safeParse({ name: '' })
      expect(result.success).toBe(false)
    })

    it('accepts boolean fields', () => {
      const result = updateApplicationSchema.safeParse({
        appQuestionsCompleted: true,
        strategyCompleted: false,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('createQuestionnaireSchema', () => {
    it('accepts app_questions with object answers', () => {
      const result = createQuestionnaireSchema.safeParse({
        applicationId: 'app-1',
        type: 'app_questions',
        answers: { q1: 'yes' },
      })
      expect(result.success).toBe(true)
    })

    it('accepts strategy_questions with array answers', () => {
      const result = createQuestionnaireSchema.safeParse({
        applicationId: 'app-1',
        type: 'strategy_questions',
        answers: [{ time: 'Invest', weight: 5 }],
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid type', () => {
      const result = createQuestionnaireSchema.safeParse({
        applicationId: 'app-1',
        type: 'invalid_type',
        answers: [],
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing applicationId', () => {
      const result = createQuestionnaireSchema.safeParse({
        type: 'app_questions',
        answers: { q1: 'yes' },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateThresholdsSchema', () => {
    it('accepts valid thresholds', () => {
      const result = updateThresholdsSchema.safeParse({
        distributionThreshold: 80,
        tiebreakThreshold: 10,
      })
      expect(result.success).toBe(true)
    })

    it('accepts single threshold', () => {
      const result = updateThresholdsSchema.safeParse({
        distributionThreshold: 75,
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty object (no thresholds)', () => {
      const result = updateThresholdsSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('rejects negative threshold', () => {
      const result = updateThresholdsSchema.safeParse({
        distributionThreshold: -1,
      })
      expect(result.success).toBe(false)
    })

    it('rejects threshold over 100', () => {
      const result = updateThresholdsSchema.safeParse({
        distributionThreshold: 101,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateUserRoleSchema', () => {
    it('accepts valid role update', () => {
      const result = updateUserRoleSchema.safeParse({
        userId: 'user-1',
        role: 'Admin',
      })
      expect(result.success).toBe(true)
    })

    it('accepts all valid roles', () => {
      for (const role of ['Admin', 'Consultant', 'Viewer']) {
        const result = updateUserRoleSchema.safeParse({ userId: 'u1', role })
        expect(result.success).toBe(true)
      }
    })

    it('rejects invalid role', () => {
      const result = updateUserRoleSchema.safeParse({
        userId: 'user-1',
        role: 'SuperAdmin',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing userId', () => {
      const result = updateUserRoleSchema.safeParse({ role: 'Admin' })
      expect(result.success).toBe(false)
    })
  })

  describe('formatZodErrors', () => {
    it('formats single error', () => {
      const result = createCustomerSchema.safeParse({})
      expect(result.success).toBe(false)
      if (!result.success) {
        const msg = formatZodErrors(result.error)
        expect(msg).toContain('name')
      }
    })

    it('formats multiple errors with comma separator', () => {
      const result = updateUserRoleSchema.safeParse({})
      expect(result.success).toBe(false)
      if (!result.success) {
        const msg = formatZodErrors(result.error)
        expect(msg).toContain(',')
      }
    })
  })
})
