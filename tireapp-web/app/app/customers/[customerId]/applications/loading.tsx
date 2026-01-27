export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 bg-gray-200 rounded w-48" />
        <div className="h-9 bg-gray-200 rounded w-32" />
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-7 bg-gray-100 rounded w-16" />
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg border">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 bg-gray-50 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
