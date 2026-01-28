// Unauthorized access page

import Link from 'next/link'

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const isNotProvisioned = error === 'not_provisioned'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-4 text-red-600">
          {isNotProvisioned ? 'Account Not Provisioned' : 'Access Denied'}
        </h1>

        {isNotProvisioned ? (
          <>
            <p className="text-lg mb-4">
              Your email address has not been provisioned in the system.
            </p>
            <p className="text-gray-600 mb-8">
              Please contact your administrator to request access to TIREApp.
            </p>
          </>
        ) : (
          <>
            <p className="text-lg mb-4">
              You do not have permission to access this page.
            </p>
            <p className="text-gray-600 mb-8">
              This page requires Admin privileges.
            </p>
          </>
        )}

        <Link
          href="/"
          className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Return to Home
        </Link>
      </div>
    </main>
  )
}
