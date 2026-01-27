import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ExcelUpload } from "@/components/ExcelUpload"
import { ApplicationTable } from "@/components/ApplicationTable"

export default async function ApplicationsPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const session = await auth()
  if (!session) redirect('/api/auth/signin')

  const { customerId } = await params

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  })

  if (!customer) redirect('/app')

  const applications = await prisma.application.findMany({
    where: { customerId },
    orderBy: { name: 'asc' },
    include: {
      questionnaires: {
        select: { type: true, completedAt: true },
      },
    },
  })

  // Calculate metrics
  const total = applications.length
  const inScope = applications.filter(a => a.assessmentScope === 'In Scope').length
  const completed = applications.filter(a => a.status === 'completed').length
  const appQDone = applications.filter(a => a.appQuestionsCompleted).length
  const stratDone = applications.filter(a => a.strategyCompleted).length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-4">
        <Link href="/app" className="text-blue-500 hover:text-blue-700 text-sm">
          &larr; All Customers
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{customer.name}</h1>
        <ExcelUpload customerId={customerId} />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Apps', value: total, color: 'text-gray-900' },
          { label: 'In Scope', value: inScope, color: 'text-blue-600' },
          { label: 'Completed', value: completed, color: 'text-green-600' },
          { label: 'App Q Done', value: appQDone, color: 'text-purple-600' },
          { label: 'Strategy Done', value: stratDone, color: 'text-orange-600' },
        ].map(m => (
          <div key={m.label} className="bg-white p-3 rounded-lg border text-center">
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-500">{m.label}</p>
          </div>
        ))}
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500 text-lg mb-2">No applications yet</p>
          <p className="text-gray-400 text-sm">
            Upload an Excel file with an &quot;App-to-Server List&quot; sheet to get started.
          </p>
        </div>
      ) : (
        <ApplicationTable
          applications={JSON.parse(JSON.stringify(applications))}
          customerId={customerId}
        />
      )}
    </div>
  )
}
