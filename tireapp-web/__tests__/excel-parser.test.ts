import * as XLSX from 'xlsx'
import { parseExcelFile } from '@/lib/excel-parser'

function createTestWorkbook(data: (string | undefined)[][], sheetName: string = 'App-to-Server List'): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return buffer
}

describe('parseExcelFile', () => {
  it('parses valid App-to-Server List sheet', () => {
    const data = [
      ['Row 1 placeholder'],
      ['Row 2 placeholder'],
      ['Row 3 placeholder'],
      ['Application Name', 'Assessment Scope', 'Data Center'],
      ['App One', 'In Scope', 'US-East'],
      ['App Two', 'Out of Scope', 'EU-West'],
    ]

    const result = parseExcelFile(createTestWorkbook(data))

    expect(result.applications).toHaveLength(2)
    expect(result.applications[0].name).toBe('App One')
    expect(result.applications[0].assessmentScope).toBe('In Scope')
    expect(result.applications[0].dataCenter).toBe('US-East')
    expect(result.applications[1].name).toBe('App Two')
    expect(result.errors).toHaveLength(0)
  })

  it('deduplicates applications by name', () => {
    const data = [
      ['placeholder'],
      ['placeholder'],
      ['placeholder'],
      ['Application Name', 'Assessment Scope'],
      ['App One', 'In Scope'],
      ['App One', 'Out of Scope'],
      ['App Two', 'In Scope'],
    ]

    const result = parseExcelFile(createTestWorkbook(data))

    expect(result.applications).toHaveLength(2)
    expect(result.duplicatesRemoved).toBe(1)
  })

  it('filters out Unassociated entries', () => {
    const data = [
      ['placeholder'],
      ['placeholder'],
      ['placeholder'],
      ['Application Name'],
      ['App One'],
      ['Unassociated'],
      ['unassociated'],
    ]

    const result = parseExcelFile(createTestWorkbook(data))
    expect(result.applications).toHaveLength(1)
  })

  it('returns error when sheet not found', () => {
    const result = parseExcelFile(createTestWorkbook([['test']], 'Wrong Sheet'))
    expect(result.applications).toHaveLength(0)
    expect(result.errors[0]).toContain('not found')
  })

  it('returns error when Application Name column missing', () => {
    const data = [
      ['placeholder'],
      ['placeholder'],
      ['placeholder'],
      ['Wrong Column', 'Another Column'],
      ['Value1', 'Value2'],
    ]

    const result = parseExcelFile(createTestWorkbook(data))
    expect(result.errors[0]).toContain('Application Name')
  })

  it('handles sheet with fewer than 5 rows', () => {
    const data = [
      ['Only one row'],
    ]

    const result = parseExcelFile(createTestWorkbook(data))
    expect(result.applications).toHaveLength(0)
    expect(result.errors[0]).toContain('fewer than 5 rows')
  })
})
