import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const APP_STRATEGY_INSTRUCTIONS = `Selecting an Application Strategy provides guidance for technical planning, ensuring that migration treatments align with desired business outcomes. This is a strategic, non technical exercise, aimed at assessing the current role and future potential of each application in your business. Use the guide below to choose the strategy that best fits each application's current plans or overall usage. If the strategy is unknown for an application, simply proceed to the next one.`

// GET /api/export?customerId=xxx&format=xlsx&type=full|app_strategies
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = checkRateLimit(getClientIp(request.headers), { limit: 10, windowSeconds: 60 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const customerId = request.nextUrl.searchParams.get('customerId')
  const format = request.nextUrl.searchParams.get('format') || 'xlsx'
  const exportType = request.nextUrl.searchParams.get('type') || 'full'

  if (!customerId) {
    return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const applications = await prisma.application.findMany({
      where: { customerId },
      orderBy: { name: 'asc' },
      include: {
        questionnaires: true,
      },
    })

    const wb = XLSX.utils.book_new()

    // Export type: app_strategies - Simple format matching the template
    if (exportType === 'app_strategies') {
      // Build the sheet data with exact format from template
      const sheetData: (string | undefined)[][] = [
        ['Instructions'],
        [APP_STRATEGY_INSTRUCTIONS],
        [], // Empty row 2
        ['Application', 'Select Application Strategy'], // Headers at row 3
      ]

      // Add application data starting at row 4
      applications.forEach(app => {
        sheetData.push([
          app.name,
          app.initialTirePlacement || '', // Use initialTirePlacement (user's selection)
        ])
      })

      const sheet = XLSX.utils.aoa_to_sheet(sheetData)

      // Set column widths
      sheet['!cols'] = [
        { wch: 40 }, // Application column
        { wch: 30 }, // Strategy column
      ]

      XLSX.utils.book_append_sheet(wb, sheet, 'App Strategies')

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
      const filename = `${customer.name}-Application Strategy Export - ${timestamp}.xlsx`

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    // Default: Full export with multiple sheets

    // Sheet 1: Completed Applications Summary
    const summaryData = applications.map(app => ({
      'Application Name': app.name,
      'Assessment Scope': app.assessmentScope,
      'Status': app.status,
      'App Questions': app.appQuestionsCompleted ? 'Complete' : 'Incomplete',
      'Strategy Questions': app.strategyCompleted ? 'Complete' : 'Incomplete',
      'Initial TIRE': app.initialTirePlacement || 'Not Set',
      'Confirmed TIRE': app.confirmedTirePlacement || 'Not Set',
      'Data Center': app.dataCenter || '',
      'Environment': app.environment || '',
      'Completed On': app.completedAt
        ? app.completedAt.toISOString().split('T')[0]
        : '',
    }))

    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Applications Summary')

    // Sheet 2: Strategy Scores (for completed assessments)
    const strategyData = applications
      .filter(app => app.strategyCompleted)
      .map(app => {
        const stratQ = app.questionnaires.find(q => q.type === 'strategy_questions')
        const summary = stratQ?.summary as Record<string, unknown> | null
        const tireScores = summary?.tireScores as Record<string, Record<string, number>> | undefined

        return {
          'Application Name': app.name,
          'Confirmed TIRE': app.confirmedTirePlacement || 'Not Set',
          'Tolerate %': tireScores?.Tolerate?.percentageScore ?? '',
          'Invest %': tireScores?.Invest?.percentageScore ?? '',
          'Replace %': tireScores?.Replace?.percentageScore ?? '',
          'Eliminate %': tireScores?.Eliminate?.percentageScore ?? '',
          'Tolerate Score': tireScores?.Tolerate?.totalScore ?? '',
          'Invest Score': tireScores?.Invest?.totalScore ?? '',
          'Replace Score': tireScores?.Replace?.totalScore ?? '',
          'Eliminate Score': tireScores?.Eliminate?.totalScore ?? '',
        }
      })

    if (strategyData.length > 0) {
      const strategySheet = XLSX.utils.json_to_sheet(strategyData)
      XLSX.utils.book_append_sheet(wb, strategySheet, 'TIRE Scores')
    }

    // Sheet 3: App Questions Answers (pivot table)
    const appQData = applications
      .filter(app => app.appQuestionsCompleted)
      .map(app => {
        const appQ = app.questionnaires.find(q => q.type === 'app_questions')
        const answers = appQ?.answers as Record<string, unknown> | null
        return {
          'Application Name': app.name,
          ...Object.fromEntries(
            Object.entries(answers || {}).map(([key, value]) => [
              key,
              Array.isArray(value) ? value.join(', ') : String(value ?? ''),
            ])
          ),
        }
      })

    if (appQData.length > 0) {
      const appQSheet = XLSX.utils.json_to_sheet(appQData)
      XLSX.utils.book_append_sheet(wb, appQSheet, 'Application Questions')
    }

    // Generate buffer
    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: format === 'csv' ? 'csv' : 'xlsx',
    })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    const filename = `${customer.name}-TIRE-Export-${timestamp}.${format === 'csv' ? 'csv' : 'xlsx'}`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': format === 'csv'
          ? 'text/csv'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 })
  }
}
