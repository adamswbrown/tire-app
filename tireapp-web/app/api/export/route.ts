import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// GET /api/export?customerId=xxx&format=xlsx
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
