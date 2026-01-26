// Protected application home (requires authentication)

import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function AppPage() {
  const session = await auth()

  if (!session) {
    redirect('/api/auth/signin')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">
          Welcome, {session.user?.name}!
        </h1>
        <p className="text-lg mb-4">
          Role: <span className="font-semibold">{session.user?.role}</span>
        </p>
        <p className="text-gray-600 mb-8">
          You have successfully authenticated.
        </p>

        <div className="space-x-4">
          {session.user?.role === 'Admin' && (
            <a
              href="/admin"
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            >
              Admin Dashboard
            </a>
          )}
          <a
            href="/api/auth/signout"
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Sign Out
          </a>
        </div>
      </div>
    </main>
  )
}
