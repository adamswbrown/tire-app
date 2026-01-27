import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Prisma Schema', () => {
  const schemaPath = join(__dirname, '..', 'prisma', 'schema.prisma')
  const schema = readFileSync(schemaPath, 'utf-8')

  it('validates without errors', () => {
    const result = execSync('npx prisma validate', {
      cwd: join(__dirname, '..'),
      encoding: 'utf-8',
    })
    expect(result).toContain('is valid')
  })

  it('defines all Auth.js required models', () => {
    expect(schema).toContain('model User')
    expect(schema).toContain('model Account')
    expect(schema).toContain('model Session')
    expect(schema).toContain('model VerificationToken')
  })

  it('defines TIREApp domain models', () => {
    expect(schema).toContain('model Customer')
    expect(schema).toContain('model Application')
    expect(schema).toContain('model Questionnaire')
    expect(schema).toContain('model Response')
    expect(schema).toContain('model Export')
    expect(schema).toContain('model Threshold')
  })

  it('has role field on User model with Consultant default', () => {
    expect(schema).toMatch(/role\s+String\s+@default\("Consultant"\)/)
  })

  it('uses postgresql as database provider', () => {
    expect(schema).toContain('provider  = "postgresql"')
  })

  it('maps User to lowercase table name', () => {
    expect(schema).toContain('@@map("users")')
  })

  it('has cascade delete on Account-User relation', () => {
    expect(schema).toContain('onDelete: Cascade')
  })
})
