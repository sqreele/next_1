// ./app/dashboard/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-6 w-full animate-pulse p-4 sm:p-8">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-8 bg-gray-200 rounded w-24"></div>
      </div>
      
      {/* Tabs skeleton */}
      <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
      
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
      
      {/* Pagination skeleton */}
      <div className="flex justify-center mt-8">
        <div className="h-10 bg-gray-200 rounded w-64"></div>
      </div>
    </div>
  );
}
