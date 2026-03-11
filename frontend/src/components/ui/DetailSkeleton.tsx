'use client';

interface DetailSkeletonProps {
  cards?: number;
  fieldsPerCard?: number;
}

export default function DetailSkeleton({ cards = 4, fieldsPerCard = 4 }: DetailSkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {Array.from({ length: cards }).map((_, cardIdx) => (
        <div
          key={cardIdx}
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 h-5 w-32 animate-pulse rounded bg-gray-200" />
          <div className="space-y-4">
            {Array.from({ length: fieldsPerCard }).map((_, fieldIdx) => (
              <div key={fieldIdx}>
                <div className="mb-1 h-3 w-20 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
