// Unauthorized access page (insufficient permissions)

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4 text-red-600">
          Access Denied
        </h1>
        <p className="text-lg mb-8">
          You do not have permission to access this page.
        </p>
        <p className="text-gray-600 mb-8">
          This page requires Admin privileges.
        </p>

        <a
          href="/app"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Return to App
        </a>
      </div>
    </main>
  )
}
