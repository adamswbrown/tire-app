import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/api/auth/signin')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/app" className="text-lg font-bold">TIREApp</Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/app" className="hover:text-blue-300">Dashboard</Link>
            {session.user?.role === 'Admin' && (
              <Link href="/admin" className="hover:text-purple-300">Admin</Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span>{session.user?.name} ({session.user?.role})</span>
          <a href="/api/auth/signout" className="text-red-300 hover:text-red-100">
            Sign Out
          </a>
        </div>
      </header>
      <main className="flex-1 bg-gray-50">
        {children}
      </main>
    </div>
  )
}
