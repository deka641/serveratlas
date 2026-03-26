'use client';

import Link from 'next/link';
import type { DocumentationCoverage } from '@/lib/types';
import Card from '@/components/ui/Card';
import SectionSkeleton from '@/components/ui/SectionSkeleton';
import Button from '@/components/ui/Button';

interface DocumentationCoverageProps {
  loading: boolean;
  coverage: DocumentationCoverage | null;
  refetch: () => void;
}

const MAX_DISPLAY = 10;

export default function DocumentationCoverageWidget({ loading, coverage, refetch }: DocumentationCoverageProps) {
  const percentage = coverage && coverage.total > 0
    ? Math.round((coverage.documented / coverage.total) * 100)
    : 0;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Documentation Coverage</h2>
        <Button variant="secondary" size="sm" onClick={refetch}>
          Refresh
        </Button>
      </div>
      {loading ? (
        <SectionSkeleton height="h-20" />
      ) : coverage ? (
        <Card>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-700">
              {coverage.documented} of {coverage.total} servers documented ({percentage}%)
            </p>
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-200">
              {coverage.total > 0 && coverage.documented > 0 && (
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${(coverage.documented / coverage.total) * 100}%` }}
                />
              )}
            </div>
            {coverage.undocumented_servers.length > 0 && (
              <div className="mt-2">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Undocumented Servers</h3>
                <ul className="space-y-1">
                  {coverage.undocumented_servers.slice(0, MAX_DISPLAY).map((server) => (
                    <li key={server.id}>
                      <Link
                        href={`/servers/${server.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {server.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                {coverage.undocumented_servers.length > MAX_DISPLAY && (
                  <p className="mt-2 text-xs text-gray-500">
                    +{coverage.undocumented_servers.length - MAX_DISPLAY} more
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      ) : null}
    </section>
  );
}
