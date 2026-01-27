export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white p-4 rounded-lg border">
            <div className="h-6 bg-gray-200 rounded w-16 mx-auto mb-2" />
            <div className="h-4 bg-gray-100 rounded w-24 mx-auto" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg border p-6">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-4 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
