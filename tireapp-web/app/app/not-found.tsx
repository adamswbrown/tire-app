import Link from "next/link"

export default function NotFound() {
  return (
    <div className="p-6 max-w-4xl mx-auto text-center py-20">
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-gray-500 mb-6">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/app"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
