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
  { color: '#22c55e', label: 'Active' },
  { color: '#9ca3af', label: 'Inactive' },
  { color: '#f97316', label: 'Maintenance' },
  { color: '#ef4444', label: 'Decommissioned' },
];

const legendBgClasses: Record<string, string> = {
  Active: 'bg-green-500',
  Inactive: 'bg-gray-400',
  Maintenance: 'bg-orange-500',
  Decommissioned: 'bg-red-500',
};

export default function ConnectivityPage() {
  const { data: graph, loading, error, refetch } = useConnectionGraph();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  function handleExportPng() {
    const sourceCanvas = mapContainerRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!sourceCanvas) return;

    const scale = 2;
    const pad = 40;
    const headerHeight = 60;
    const legendHeight = 50;
    const footerHeight = 30;
    const totalHeight = headerHeight + sourceCanvas.height + legendHeight + footerHeight + pad * 2;
    const totalWidth = Math.max(sourceCanvas.width + pad * 2, 600);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = totalWidth * scale;
    exportCanvas.height = totalHeight * scale;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, totalWidth - 1, totalHeight - 1);

    // Title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ServerAtlas \u2013 Connectivity Map', totalWidth / 2, pad + 24);

    // Date
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Inter, system-ui, sans-serif';
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText(dateStr, totalWidth / 2, pad + 44);

    // Graph
    const graphY = pad + headerHeight;
    const graphX = (totalWidth - sourceCanvas.width) / 2;
    ctx.drawImage(sourceCanvas, graphX, graphY);

    // Legend
    const legendY = graphY + sourceCanvas.height + 20;
    ctx.textAlign = 'left';
    let legendX = pad;
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#374151';
    ctx.fillText('Legend:', legendX, legendY + 12);
    legendX += 60;

    for (const item of legendItems) {
      ctx.beginPath();
      ctx.arc(legendX + 6, legendY + 8, 6, 0, Math.PI * 2);
      ctx.fillStyle = item.color;
      ctx.fill();
      ctx.fillStyle = '#4b5563';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.fillText(item.label, legendX + 18, legendY + 12);
      legendX += ctx.measureText(item.label).width + 40;
    }

    // Summary
    if (graph) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.fillText(`${graph.nodes.length} servers \u00b7 ${graph.edges.length} connections`, totalWidth / 2, legendY + 32);
    }

    // Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.fillText(`Generated ${new Date().toLocaleString()}`, totalWidth / 2, totalHeight - 10);

    // Download
    const url = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    link.download = `connectivity-map-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleExportSvg() {
    if (!graph || graph.nodes.length === 0) return;
    const width = 800;
    const height = 600;
    const nodeRadius = 20;

    // Simple circular layout
    const nodePositions = graph.nodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / graph.nodes.length;
      const cx = width / 2 + (width / 3) * Math.cos(angle);
      const cy = height / 2 + (height / 3) * Math.sin(angle);
      return { ...node, cx, cy };
    });

    const nodeMap = new Map(nodePositions.map(n => [n.id, n]));

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
    svg += `<rect width="${width}" height="${height}" fill="white" stroke="#e5e7eb"/>\n`;
    svg += `<text x="${width/2}" y="30" text-anchor="middle" font-size="16" font-weight="bold" fill="#1e293b">ServerAtlas - Connectivity Map</text>\n`;

    // Arrow marker
    svg += `<defs><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#cbd5e1"/></marker></defs>\n`;

    // Draw edges
    for (const edge of graph.edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (source && target) {
        svg += `<line x1="${source.cx}" y1="${source.cy}" x2="${target.cx}" y2="${target.cy}" stroke="#cbd5e1" stroke-width="1.5" marker-end="url(#arrow)"/>\n`;
      }
    }

    // Draw nodes
    for (const node of nodePositions) {
      const color: Record<string, string> = {active: '#22c55e', inactive: '#9ca3af', maintenance: '#f97316', decommissioned: '#ef4444'};
      const fill = color[node.status] || '#9ca3af';
      svg += `<circle cx="${node.cx}" cy="${node.cy}" r="${nodeRadius}" fill="${fill}" stroke="white" stroke-width="2"/>\n`;
      svg += `<text x="${node.cx}" y="${node.cy + nodeRadius + 14}" text-anchor="middle" font-size="11" fill="#1f2937">${node.name}</text>\n`;
    }

    svg += `</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    link.download = `connectivity-map-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          <Button variant="secondary" onClick={handleExportSvg}>
            Export SVG
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
          <div className="flex items-center justify-between">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Legend</h3>
            {graph && (
              <span className="text-xs text-gray-500">
                {graph.nodes.length} server{graph.nodes.length !== 1 ? 's' : ''} &middot; {graph.edges.length} connection{graph.edges.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            {legendItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span
                  className={`inline-block h-3 w-3 rounded-full ${legendBgClasses[item.label]}`}
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
