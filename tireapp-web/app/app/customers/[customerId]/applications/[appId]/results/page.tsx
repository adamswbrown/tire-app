import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

interface TireScore {
  totalScore: number
  maxPossibleScore: number
  percentageScore: number
  answeredQuestions: number
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ customerId: string; appId: string }>
}) {
  const session = await auth()
  if (!session) redirect('/api/auth/signin')

  const { customerId, appId } = await params

  const application = await prisma.application.findUnique({
    where: { id: appId },
    include: {
      customer: { select: { name: true } },
      questionnaires: true,
    },
  })

  if (!application) redirect(`/app/customers/${customerId}/applications`)

  const stratQ = application.questionnaires.find(q => q.type === 'strategy_questions')
  const summary = stratQ?.summary as Record<string, unknown> | null
  const tireScores = summary?.tireScores as Record<string, TireScore> | undefined
  const confirmedPlacement = application.confirmedTirePlacement
  const initialPlacement = application.initialTirePlacement

  const categories = ['Tolerate', 'Invest', 'Replace', 'Eliminate'] as const
  const colors: Record<string, { bg: string; text: string; bar: string }> = {
    Tolerate: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
    Invest: { bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-500' },
    Replace: { bg: 'bg-yellow-50', text: 'text-yellow-700', bar: 'bg-yellow-500' },
    Eliminate: { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' },
  }

  const descriptions: Record<string, string> = {
    Tolerate: 'Application is stable and acceptable. Maintain current state with minimal investment.',
    Invest: 'Application has strategic value. Allocate resources for improvement and modernization.',
    Replace: 'Application should be replaced with a better alternative. Plan migration path.',
    Eliminate: 'Application provides little value. Plan decommissioning and removal.',
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4">
        <Link
          href={`/app/customers/${customerId}/applications/${appId}`}
          className="text-blue-500 hover:text-blue-700 text-sm"
        >
          &larr; Back to {application.name}
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-2">TIRE Assessment Results</h1>
      <p className="text-gray-500 mb-6">{application.name} &mdash; {application.customer.name}</p>

      {/* Placement Result */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">Confirmed TIRE Placement</p>
          <p className={`text-4xl font-bold mb-2 ${
            confirmedPlacement ? colors[confirmedPlacement]?.text || '' : 'text-gray-400'
          }`}>
            {confirmedPlacement || 'Not Set'}
          </p>
          {confirmedPlacement && (
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              {descriptions[confirmedPlacement]}
            </p>
          )}
          {initialPlacement && initialPlacement !== confirmedPlacement && (
            <p className="text-xs text-gray-400 mt-2">
              Initial placement: {initialPlacement}
            </p>
          )}
        </div>
      </div>

      {/* Score Breakdown */}
      {tireScores ? (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Score Breakdown</h2>
          <div className="space-y-4">
            {categories.map(cat => {
              const score = tireScores[cat]
              if (!score) return null
              const isPlacement = cat === confirmedPlacement
              return (
                <div
                  key={cat}
                  className={`p-4 rounded-lg ${isPlacement ? colors[cat].bg : 'bg-gray-50'} ${
                    isPlacement ? 'ring-2 ring-offset-1 ring-blue-400' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-bold ${colors[cat].text}`}>{cat}</span>
                    <span className="text-2xl font-bold">{score.percentageScore}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div
                      className={`${colors[cat].bar} h-3 rounded-full transition-all`}
                      style={{ width: `${score.percentageScore}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{score.totalScore}/{score.maxPossibleScore} points</span>
                    <span>{score.answeredQuestions} questions answered</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{descriptions[cat]}</p>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border p-6 mb-6 text-center text-gray-400">
          <p>Strategy assessment not yet completed. Complete the strategy questions to see score breakdown.</p>
        </div>
      )}

      {/* Status */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-bold mb-4">Assessment Status</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${application.appQuestionsCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm">Application Questions</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${application.strategyCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm">Strategy Questions</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 mt-6">
        <Link
          href={`/app/customers/${customerId}/applications/${appId}/app-questions`}
          className="px-4 py-2 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          App Questions
        </Link>
        <Link
          href={`/app/customers/${customerId}/applications/${appId}/strategy-questions`}
          className="px-4 py-2 text-sm bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Strategy Questions
        </Link>
      </div>
    </div>
  )
}
