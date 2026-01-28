// Landing page with integrated login

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import LoginForm from "@/components/LoginForm"

export default async function HomePage() {
  const session = await auth()

  // If already logged in, redirect to app
  if (session) {
    redirect("/app")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-2">TIREApp</h1>
        <p className="text-sm mb-6 text-gray-600">TIRE Framework Assessment Tool</p>
        <LoginForm />
        <div className="mt-6 text-xs text-gray-400">
          Test: consultant@test.com / consultant123
        </div>
      </div>
    </main>
  );
}
