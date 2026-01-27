import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { StrategyQuestionsForm } from "@/components/StrategyQuestionsForm"
import strategyData from "@/lib/strategy-questions.json"

export default async function StrategyQuestionsPage({
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
      questionnaires: {
        where: { type: 'strategy_questions' },
      },
    },
  })

  if (!application) redirect(`/app/customers/${customerId}/applications`)

  // Get thresholds
  const thresholds = await prisma.threshold.findMany()
  const thresholdMap: Record<string, number> = {
    distributionThreshold: 78,
    tiebreakThreshold: 6,
  }
  for (const t of thresholds) {
    thresholdMap[t.key] = t.value
  }

  // Extract config from first item if it exists
  const questions = strategyData.filter((q: Record<string, unknown>) => q.question)

  const existingAnswers = application.questionnaires[0]?.answers as Record<string, unknown>[] | null

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <Link
          href={`/app/customers/${customerId}/applications`}
          className="text-blue-500 hover:text-blue-700 text-sm"
        >
          &larr; Back to {application.customer.name}
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-2">Strategy Questions</h1>
      <p className="text-gray-500 mb-6">{application.name}</p>

      <StrategyQuestionsForm
        applicationId={appId}
        questions={JSON.parse(JSON.stringify(questions))}
        existingAnswers={existingAnswers}
        distributionThreshold={thresholdMap.distributionThreshold}
        tiebreakThreshold={thresholdMap.tiebreakThreshold}
      />
    </div>
  )
}
