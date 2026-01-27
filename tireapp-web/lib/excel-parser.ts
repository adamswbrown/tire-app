// Excel parser for "App-to-Server List" sheet
// Ports the upload-file logic from Electron main.js

import * as XLSX from 'xlsx'

export interface ParsedApplication {
  name: string
  assessmentScope: string
  dataCenter: string | null
  environment: string | null
  server: string | null
  treatment: string | null
  solution: string | null
  powerStatus: string | null
  os: string | null
  sqlDetected: string | null
  vmwareDesc: string | null
}

export interface ParseResult {
  applications: ParsedApplication[]
  errors: string[]
  duplicatesRemoved: number
}

// Column header mappings from the Electron app
const HEADER_MAP: Record<string, keyof ParsedApplication> = {
  'Application Name': 'name',
  'Assessment Scope': 'assessmentScope',
  'Data Center': 'dataCenter',
  'Environment': 'environment',
  'Server': 'server',
  'Treatment': 'treatment',
  'Solution': 'solution',
  'Power Status': 'powerStatus',
  'OS': 'os',
  'SQL Detected': 'sqlDetected',
  'VMWare Description': 'vmwareDesc',
}

export function parseExcelFile(buffer: ArrayBuffer): ParseResult {
  const errors: string[] = []

  const workbook = XLSX.read(buffer, { type: 'array' })

  // Find the "App-to-Server List" sheet
  const sheetName = workbook.SheetNames.find(
    name => name.toLowerCase().includes('app-to-server') ||
            name.toLowerCase().includes('app to server')
  )

  if (!sheetName) {
    return {
      applications: [],
      errors: [`Sheet "App-to-Server List" not found. Available sheets: ${workbook.SheetNames.join(', ')}`],
      duplicatesRemoved: 0,
    }
  }

  const sheet = workbook.Sheets[sheetName]
  const rawData = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
  }) as unknown as string[][]

  if (rawData.length < 5) {
    return {
      applications: [],
      errors: ['Sheet has fewer than 5 rows. Expected headers at row 4 and data from row 5.'],
      duplicatesRemoved: 0,
    }
  }

  // Headers are at row 4 (index 3)
  const headers = rawData[3]
  if (!headers || headers.length === 0) {
    return {
      applications: [],
      errors: ['No headers found at row 4.'],
      duplicatesRemoved: 0,
    }
  }

  // Map header positions
  const columnMap: Record<number, keyof ParsedApplication> = {}
  for (let i = 0; i < headers.length; i++) {
    const headerText = String(headers[i]).trim()
    if (HEADER_MAP[headerText]) {
      columnMap[i] = HEADER_MAP[headerText]
    }
  }

  if (!Object.values(columnMap).includes('name')) {
    return {
      applications: [],
      errors: ['Required column "Application Name" not found in headers.'],
      duplicatesRemoved: 0,
    }
  }

  // Parse data rows (starting at row 5, index 4)
  const seen = new Set<string>()
  const applications: ParsedApplication[] = []
  let duplicatesRemoved = 0

  for (let i = 4; i < rawData.length; i++) {
    const row = rawData[i]
    if (!row || row.every(cell => !cell)) continue

    const app: ParsedApplication = {
      name: '',
      assessmentScope: 'In Scope',
      dataCenter: null,
      environment: null,
      server: null,
      treatment: null,
      solution: null,
      powerStatus: null,
      os: null,
      sqlDetected: null,
      vmwareDesc: null,
    }

    for (const [colIndex, field] of Object.entries(columnMap)) {
      const value = String(row[Number(colIndex)] || '').trim()
      if (value) {
        (app as unknown as Record<string, string | null>)[field] = value
      }
    }

    // Skip empty names or "Unassociated"
    if (!app.name || app.name.toLowerCase() === 'unassociated') continue

    // Deduplicate by name
    const key = app.name.toLowerCase()
    if (seen.has(key)) {
      duplicatesRemoved++
      continue
    }
    seen.add(key)
    applications.push(app)
  }

  if (applications.length === 0) {
    errors.push('No valid applications found in the spreadsheet.')
  }

  return { applications, errors, duplicatesRemoved }
}
