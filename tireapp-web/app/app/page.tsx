// Dashboard - Customer list with create/upload functionality

import type { Metadata } from "next"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { CustomerActions } from "@/components/CustomerActions"
import { DeleteCustomerButton } from "@/components/DeleteCustomerButton"

export const metadata: Metadata = {
  title: "Dashboard",
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/api/auth/signin')

  const isAdmin = session.user?.role === 'Admin'
  const userId = session.user?.id

  // Admins see all customers, others only see assigned customers
  const customers = await prisma.customer.findMany({
    where: isAdmin ? {} : {
      users: { some: { userId } },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { applications: true } },
    },
  })

  // Get customer IDs for filtering stats
  const customerIds = customers.map(c => c.id)

  // Aggregate TIRE stats (filtered by accessible customers)
  const tireCounts = await prisma.application.groupBy({
    by: ['confirmedTirePlacement'],
    _count: { id: true },
    where: {
      confirmedTirePlacement: { not: null },
      ...(isAdmin ? {} : { customerId: { in: customerIds } }),
    },
  })

  const totalApps = await prisma.application.count({
    where: isAdmin ? {} : { customerId: { in: customerIds } },
  })
  const completedApps = await prisma.application.count({
    where: {
      status: 'completed',
      ...(isAdmin ? {} : { customerId: { in: customerIds } }),
    },
  })

  const tireMap: Record<string, number> = {}
  for (const row of tireCounts) {
    if (row.confirmedTirePlacement) {
      tireMap[row.confirmedTirePlacement] = row._count.id
    }
  }

  const tireColors: Record<string, string> = {
    Tolerate: 'text-blue-600',
    Invest: 'text-green-600',
    Replace: 'text-yellow-600',
    Eliminate: 'text-red-600',
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Customer Assessments</h1>
        <CustomerActions />
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <div className="bg-white p-3 rounded-lg border text-center">
          <p className="text-2xl font-bold">{customers.length}</p>
          <p className="text-xs text-gray-500">Customers</p>
        </div>
        <div className="bg-white p-3 rounded-lg border text-center">
          <p className="text-2xl font-bold">{totalApps}</p>
          <p className="text-xs text-gray-500">Total Apps</p>
        </div>
        {['Tolerate', 'Invest', 'Replace', 'Eliminate'].map(cat => (
          <div key={cat} className="bg-white p-3 rounded-lg border text-center">
            <p className={`text-2xl font-bold ${tireColors[cat]}`}>{tireMap[cat] || 0}</p>
            <p className="text-xs text-gray-500">{cat}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {totalApps > 0 && (
        <div className="bg-white p-4 rounded-lg border mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Completion</span>
            <span className="text-sm text-gray-500">{completedApps}/{totalApps} applications</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-green-500 h-2.5 rounded-full transition-all"
              style={{ width: `${Math.round((completedApps / totalApps) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {customers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500 text-lg mb-4">
            {isAdmin ? 'No customers yet' : 'No customers assigned'}
          </p>
          <p className="text-gray-400">
            {isAdmin
              ? 'Create a customer to get started with TIRE assessments.'
              : 'Contact an administrator to be assigned to customers.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {customers.map(customer => (
            <div
              key={customer.id}
              className="bg-white rounded-lg border hover:border-blue-400 transition-colors flex items-stretch"
            >
              <Link
                href={`/app/customers/${customer.id}/applications`}
                className="flex-1 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{customer.name}</h2>
                    <p className="text-sm text-gray-500">
                      Created {customer.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-blue-600">
                      {customer._count.applications}
                    </span>
                    <p className="text-sm text-gray-500">applications</p>
                  </div>
                </div>
              </Link>
              {isAdmin && (
                <div className="flex items-center pr-4">
                  <DeleteCustomerButton
                    customerId={customer.id}
                    customerName={customer.name}
                    applicationCount={customer._count.applications}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
