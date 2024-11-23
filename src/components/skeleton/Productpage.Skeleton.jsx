
export const LoadingSkeleton = () => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-green-50">
        {/* Header Skeleton */}
        <div className="p-4 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-sm z-10">
          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
          </div>
        </div>
  
        {/* Product Details Skeleton */}
        <div className="flex flex-col md:flex-row">
          <div className="p-4 w-full md:w-1/2">
            <div className="w-full aspect-square rounded-3xl bg-gray-200 animate-pulse" />
          </div>
          <div className="p-4 w-full md:w-1/2">
            <div className="h-8 w-3/4 bg-gray-200 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-1/2 bg-gray-200 rounded-lg animate-pulse mb-4" />
            <div className="flex gap-2">
              <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
  
        {/* Score Skeleton */}
        <div className="p-4 flex items-center justify-center gap-4">
          <div className="w-32 h-32 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1 max-w-[200px]">
            <div className="h-6 w-32 bg-gray-200 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-48 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>
  
        {/* Dietary Information Skeleton */}
        <div className="p-4">
          <div className="h-6 w-40 bg-gray-200 rounded-lg animate-pulse mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-black/10"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse" />
                  <div className="h-4 w-24 bg-gray-200 rounded-lg animate-pulse" />
                </div>
                <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
  
        {/* Nutrition Values Skeleton */}
        <div className="p-4">
          <div className="h-6 w-40 bg-gray-200 rounded-lg animate-pulse mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/50 rounded-xl border border-black/10 p-4">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-20 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-4 w-16 bg-gray-200 rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
  
        {/* Nutrition Analysis Skeleton */}
        <div className="p-4">
          <div className="h-6 w-40 bg-gray-200 rounded-lg animate-pulse mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/50 rounded-xl border border-black/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse" />
                    <div className="h-4 w-24 bg-gray-200 rounded-lg animate-pulse" />
                  </div>
                  <div className="h-4 w-16 bg-gray-200 rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };