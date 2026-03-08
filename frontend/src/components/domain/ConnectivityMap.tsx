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
  status: ServerStatus;
  color: string;
}

interface GraphLinkData {
  source: number;
  target: number;
  label: string;
}

export default function ConnectivityMap({ graph }: ConnectivityMapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const nodes: GraphNodeData[] = graph.nodes.map((node) => ({
    id: node.id,
    name: node.name,
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

  return (
    <div ref={containerRef} className="h-full w-full" style={{ minHeight: 500 }}>
      <ForceGraph2D
        graphData={{ nodes, links }}
        width={dimensions.width}
        height={dimensions.height}
        nodeLabel="name"
        nodeColor="color"
        nodeRelSize={8}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkLabel="label"
        onNodeClick={handleNodeClick}
        linkColor={() => '#cbd5e1'}
        backgroundColor="transparent"
      />
    </div>
  );
}
