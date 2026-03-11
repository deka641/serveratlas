'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { ConnectivityGraph, ServerStatus } from '@/lib/types';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
});

interface ConnectivityMapProps {
  graph: ConnectivityGraph;
  searchTerm?: string;
}

const statusColorMap: Record<ServerStatus, string> = {
  active: '#22c55e',
  inactive: '#9ca3af',
  maintenance: '#f97316',
  decommissioned: '#ef4444',
};

interface GraphNodeData {
  id: number;
  name: string;
  ip_v4: string | null;
  status: ServerStatus;
  color: string;
}

interface GraphLinkData {
  source: number;
  target: number;
  label: string;
}

export default function ConnectivityMap({ graph, searchTerm }: ConnectivityMapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function updateSize() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (containerRef.current) {
          setDimensions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      }, 150);
    }
    // Initial size without debounce
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }
    window.addEventListener('resize', updateSize);
    return () => { window.removeEventListener('resize', updateSize); clearTimeout(timer); };
  }, []);

  const nodes: GraphNodeData[] = graph.nodes.map((node) => ({
    id: node.id,
    name: node.name,
    ip_v4: node.ip_v4,
    status: node.status,
    color: statusColorMap[node.status] ?? '#9ca3af',
  }));

  const links: GraphLinkData[] = graph.edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
    label: edge.ssh_user || edge.purpose || '',
  }));

  const handleNodeClick = useCallback(
    (node: { id?: string | number }) => {
      if (node.id != null) {
        router.push(`/servers/${node.id}`);
      }
    },
    [router]
  );

  const nodeCanvasObject = useCallback(
    (node: Record<string, unknown>, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = (node.x as number) ?? 0;
      const y = (node.y as number) ?? 0;
      const label = node.name as string;
      const color = node.color as string;

      const isSearching = !!searchTerm && searchTerm.trim().length > 0;
      const isMatch = isSearching && label.toLowerCase().includes(searchTerm.toLowerCase());
      const radius = isMatch ? 12 : 8;

      // Reduce alpha for non-matched nodes when searching
      if (isSearching && !isMatch) {
        ctx.globalAlpha = 0.3;
      }

      // Draw circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw white glow effect for matched nodes
      if (isMatch) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, 2 * Math.PI, false);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Draw label below node
      const fontSize = Math.max(12 / globalScale, 3);
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#1f2937';
      ctx.fillText(label, x, y + radius + 2);

      // Restore alpha
      if (isSearching && !isMatch) {
        ctx.globalAlpha = 1;
      }
    },
    [searchTerm]
  );

  const nodePointerAreaPaint = useCallback(
    (node: Record<string, unknown>, color: string, ctx: CanvasRenderingContext2D) => {
      const x = (node.x as number) ?? 0;
      const y = (node.y as number) ?? 0;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI, false);
      ctx.fillStyle = color;
      ctx.fill();
    },
    []
  );

  const nodeLabel = useCallback(
    (node: Record<string, unknown>) => {
      const name = node.name as string;
      const ip = node.ip_v4 as string | null;
      const status = node.status as string;
      const parts = [name];
      if (ip) parts.push(`IP: ${ip}`);
      parts.push(`Status: ${status}`);
      return parts.join('\n');
    },
    []
  );

  const linkCanvasObject = useCallback(
    (link: Record<string, unknown>, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (globalScale < 0.8) return;
      const source = link.source as Record<string, unknown>;
      const target = link.target as Record<string, unknown>;
      if (!source || !target) return;
      const sx = (source.x as number) ?? 0;
      const sy = (source.y as number) ?? 0;
      const tx = (target.x as number) ?? 0;
      const ty = (target.y as number) ?? 0;
      const mx = (sx + tx) / 2;
      const my = (sy + ty) / 2;
      const label = link.label as string;
      if (!label) return;

      const fontSize = Math.max(10 / globalScale, 2);
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(label, mx, my);
    },
    []
  );

  return (
    <div ref={containerRef} className="h-full w-full" style={{ minHeight: 400 }}>
      <ForceGraph2D
        graphData={{ nodes, links }}
        width={dimensions.width}
        height={dimensions.height}
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={nodePointerAreaPaint}
        nodeLabel={nodeLabel}
        nodeRelSize={8}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkCanvasObjectMode={() => 'after'}
        linkCanvasObject={linkCanvasObject}
        onNodeClick={handleNodeClick}
        linkColor={() => '#cbd5e1'}
        backgroundColor="transparent"
      />
    </div>
  );
}
