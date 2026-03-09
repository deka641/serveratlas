'use client';

interface SectionSkeletonProps {
  height?: string;
}

export default function SectionSkeleton({ height = 'h-32' }: SectionSkeletonProps) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-100 ${height}`} />
  );
}
