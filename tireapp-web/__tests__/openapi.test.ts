/**
 * @jest-environment node
 */
import { openApiSpec } from '@/lib/openapi'

describe('OpenAPI Specification', () => {
  it('has valid OpenAPI version', () => {
    expect(openApiSpec.openapi).toBe('3.1.0')
  })

  it('has info with title and version', () => {
    expect(openApiSpec.info.title).toBe('TIREApp API')
    expect(openApiSpec.info.version).toBe('1.0.0')
  })

  it('defines all API paths', () => {
    const paths = Object.keys(openApiSpec.paths)
    expect(paths).toContain('/health')
    expect(paths).toContain('/customers')
    expect(paths).toContain('/applications')
    expect(paths).toContain('/applications/{id}')
    expect(paths).toContain('/questionnaires')
    expect(paths).toContain('/thresholds')
    expect(paths).toContain('/users')
    expect(paths).toContain('/upload')
    expect(paths).toContain('/export')
  })

  it('has all expected tags', () => {
    const tagNames = openApiSpec.tags.map((t: { name: string }) => t.name)
    expect(tagNames).toContain('System')
    expect(tagNames).toContain('Customers')
    expect(tagNames).toContain('Applications')
    expect(tagNames).toContain('Questionnaires')
    expect(tagNames).toContain('Admin')
    expect(tagNames).toContain('Import/Export')
  })

  it('defines security scheme', () => {
    expect(openApiSpec.components.securitySchemes.session).toBeDefined()
    expect(openApiSpec.components.securitySchemes.session.type).toBe('apiKey')
  })

  it('health endpoint has no security requirement', () => {
    const healthGet = openApiSpec.paths['/health'].get
    expect(healthGet.security).toEqual([])
  })

  it('defines all component schemas', () => {
    const schemas = Object.keys(openApiSpec.components.schemas)
    expect(schemas).toContain('Customer')
    expect(schemas).toContain('Application')
    expect(schemas).toContain('Questionnaire')
    expect(schemas).toContain('User')
    expect(schemas).toContain('Thresholds')
    expect(schemas).toContain('Pagination')
    expect(schemas).toContain('ApiError')
    expect(schemas).toContain('HealthResponse')
  })

  it('defines standard error responses', () => {
    const responses = Object.keys(openApiSpec.components.responses)
    expect(responses).toContain('Unauthorized')
    expect(responses).toContain('Forbidden')
    expect(responses).toContain('ValidationError')
    expect(responses).toContain('RateLimited')
  })

  it('GET endpoints include ETag header in responses', () => {
    const customersGet = openApiSpec.paths['/customers'].get
    expect(customersGet.responses[200].headers?.ETag).toBeDefined()

    const applicationsGet = openApiSpec.paths['/applications'].get
    expect(applicationsGet.responses[200].headers?.ETag).toBeDefined()
  })
})
