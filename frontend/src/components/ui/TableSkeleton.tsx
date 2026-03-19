'use client';

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export default function TableSkeleton({ columns = 5, rows = 8 }: TableSkeletonProps) {
  return (
    <div className="w-full animate-pulse">
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 flex">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="flex-1 px-4 py-3">
              <div className="h-4 w-20 rounded bg-gray-200" />
            </div>
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex border-b border-gray-100 last:border-b-0">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <div key={colIdx} className="flex-1 px-4 py-3">
                <div
                  className="h-4 rounded bg-gray-100"
                  style={{ width: `${50 + ((rowIdx + colIdx) % 4) * 12}%` }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
