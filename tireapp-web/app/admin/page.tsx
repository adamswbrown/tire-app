// Admin dashboard (Admin role only)

import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function AdminPage() {
  const session = await auth()

  // Double-check role (middleware already protects, but defense in depth)
  if (!session || session.user?.role !== 'Admin') {
    redirect('/unauthorized')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
        <p className="text-lg mb-8">
          Welcome, {session.user?.name} (Admin)
        </p>

        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-8">
          <p className="font-bold">M1: Foundation Complete</p>
          <p>Admin features will be implemented in M6 (Admin + Thresholds)</p>
        </div>

        <a
          href="/app"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Back to App
        </a>
      </div>
    </main>
  )
}
