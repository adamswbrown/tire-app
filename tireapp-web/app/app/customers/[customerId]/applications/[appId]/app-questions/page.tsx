import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { AppQuestionsFormWrapper } from "@/components/AppQuestionsFormWrapper"
import questionsData from "@/lib/app-questions.json"
import { hasCustomerAccess } from "@/lib/auth-helpers"

export default async function AppQuestionsPage({
  params,
}: {
  params: Promise<{ customerId: string; appId: string }>
}) {
  const session = await auth()
  if (!session) redirect('/api/auth/signin')

  const { customerId, appId } = await params

  // Check if user has access to this customer
  const hasAccess = await hasCustomerAccess(
    session.user.id,
    session.user.role,
    customerId
  )
  if (!hasAccess) redirect('/app')

  const application = await prisma.application.findUnique({
    where: { id: appId },
    include: {
      customer: { select: { name: true } },
      questionnaires: {
        where: { type: 'app_questions' },
      },
    },
  })

  if (!application) redirect(`/app/customers/${customerId}/applications`)

  const existingAnswers = application.questionnaires[0]?.answers as Record<string, unknown> | null

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link
          href={`/app/customers/${customerId}/applications`}
          className="text-blue-500 hover:text-blue-700 text-sm"
        >
          &larr; Back to {application.customer.name}
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-2">Application Questions</h1>
      <p className="text-gray-500 mb-6">{application.name}</p>

      <AppQuestionsFormWrapper
        applicationId={appId}
        sections={questionsData as never[]}
        existingAnswers={existingAnswers || {}}
        backUrl={`/app/customers/${customerId}/applications`}
      />
    </div>
  )
}
