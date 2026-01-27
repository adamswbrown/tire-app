import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ApplicationDetail } from "@/components/ApplicationDetail"

export default async function ApplicationPage({
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
    },
  })

  if (!application) redirect(`/app/customers/${customerId}/applications`)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link
          href={`/app/customers/${customerId}/applications`}
          className="text-blue-500 hover:text-blue-700"
        >
          &larr; {application.customer.name}
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-2">{application.name}</h1>
      <div className="flex gap-2 mb-6">
        <Link
          href={`/app/customers/${customerId}/applications/${appId}/app-questions`}
          className="px-3 py-1.5 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          App Questions
        </Link>
        <Link
          href={`/app/customers/${customerId}/applications/${appId}/strategy-questions`}
          className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Strategy Questions
        </Link>
      </div>

      <ApplicationDetail
        application={JSON.parse(JSON.stringify(application))}
        customerId={customerId}
      />
    </div>
  )
}
