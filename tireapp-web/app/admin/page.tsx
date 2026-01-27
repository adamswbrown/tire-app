import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ThresholdManager } from "@/components/ThresholdManager"
import { prisma } from "@/lib/prisma"

export default async function AdminPage() {
  const session = await auth()

  if (!session || session.user?.role !== 'Admin') {
    redirect('/unauthorized')
  }

  const [customerCount, appCount, completedCount] = await Promise.all([
    prisma.customer.count(),
    prisma.application.count(),
    prisma.application.count({ where: { status: 'completed' } }),
  ])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4">
        <Link href="/app" className="text-blue-500 hover:text-blue-700 text-sm">
          &larr; Back to App
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-gray-500 mb-6">Welcome, {session.user?.name}</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border text-center">
          <p className="text-2xl font-bold">{customerCount}</p>
          <p className="text-xs text-gray-500">Customers</p>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <p className="text-2xl font-bold">{appCount}</p>
          <p className="text-xs text-gray-500">Applications</p>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
      </div>

      {/* Threshold Manager */}
      <ThresholdManager />
    </div>
  )
}
