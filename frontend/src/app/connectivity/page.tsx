'use client';

import { useRef, useState } from 'react';
import { useConnectionGraph } from '@/hooks/useSshConnections';
import { useDebounce } from '@/hooks/useDebounce';
import PageContainer from '@/components/PageContainer';
import ConnectivityMap from '@/components/domain/ConnectivityMap';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const legendItems = [
  { color: 'bg-green-500', label: 'Active' },
  { color: 'bg-gray-400', label: 'Inactive' },
  { color: 'bg-orange-500', label: 'Maintenance' },
  { color: 'bg-red-500', label: 'Decommissioned' },
];

export default function ConnectivityPage() {
  const { data: graph, loading, error, refetch } = useConnectionGraph();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  function handleExportPng() {
    const canvas = mapContainerRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'connectivity-map.png';
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const hasData = graph && graph.nodes.length > 0;

  return (
    <PageContainer title="Connectivity Map" loading={loading} error={error} onRetry={refetch}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search nodes by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="secondary" onClick={handleExportPng}>
            Export PNG
          </Button>
        </div>

        {hasData ? (
          <div ref={mapContainerRef} className="rounded-lg border border-gray-200 bg-white shadow-sm h-[50vh] min-h-[400px] md:h-[600px]">
            <ConnectivityMap graph={graph} searchTerm={debouncedSearchTerm} />
          </div>
        ) : (
          graph && (
            <EmptyState
              message="No connectivity data"
              description="There are no SSH connections to visualize. Add SSH connections between servers to see the connectivity map."
            />
          )
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Legend</h3>
          <div className="flex flex-wrap gap-4">
            {legendItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span
                  className={`inline-block h-3 w-3 rounded-full ${item.color}`}
                />
                <span className="text-sm text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Click on a node to navigate to the server detail page. Arrows indicate SSH connection direction.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
