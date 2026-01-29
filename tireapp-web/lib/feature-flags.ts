/**
 * Feature Flags for experimental features
 *
 * NEXT_PUBLIC_USE_SURVEYJS - Enable Survey.js-based questionnaire forms
 *
 * To enable Survey.js (pivot test):
 * 1. Add to .env.local: NEXT_PUBLIC_USE_SURVEYJS=true
 * 2. Restart the dev server
 *
 * To rollback to original forms:
 * 1. Remove or set to false: NEXT_PUBLIC_USE_SURVEYJS=false
 * 2. Restart the dev server
 */

/**
 * Check if Survey.js questionnaire forms should be used
 */
export function useSurveyJs(): boolean {
  return process.env.NEXT_PUBLIC_USE_SURVEYJS === 'true'
}

/**
 * Feature flags object for type-safe access
 */
export const featureFlags = {
  get useSurveyJs() {
    return process.env.NEXT_PUBLIC_USE_SURVEYJS === 'true'
  },
} as const
