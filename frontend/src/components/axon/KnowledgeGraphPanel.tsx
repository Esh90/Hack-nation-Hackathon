import KnowledgeGraph from './KnowledgeGraph';
import type { GraphNode, GraphEdge } from "@/lib/api";

interface KnowledgeGraphPanelProps {
  nodeCount?: number;
  connectionCount?: number;
  nodes?: GraphNode[];
  edges?: GraphEdge[];
}

export function KnowledgeGraphPanel({ 
  nodeCount, 
  connectionCount,
  nodes,
  edges 
}: KnowledgeGraphPanelProps) {
  const legendItems = [
    { color: 'bg-success', label: 'Active' },
    { color: 'bg-warning', label: 'Aging' },
    { color: 'bg-error', label: 'Conflicted' },
    { color: 'bg-text-hint opacity-40', label: 'Stale' },
  ];

  return (
    <div className="h-full flex flex-col panel min-h-0">
      {/* Header */}
      <div className="panel-header">
        <div>
          <h2 className="text-sm font-medium text-foreground">Knowledge Map</h2>
          <p className="text-[11px] text-text-muted">Live organizational structure</p>
        </div>
        <span className="font-mono text-[10px] text-text-tertiary">
          {nodeCount || nodes?.length || 0} nodes • {connectionCount || edges?.length || 0} connections
        </span>
      </div>

      {/* Graph Area */}
      <div 
        className="flex-1 relative grid-pattern min-h-0"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(0 0% 6%) 0%, hsl(0 0% 3%) 100%)'
        }}
      >
        {nodes && edges ? (
          <KnowledgeGraph 
            nodes={nodes} 
            edges={edges} 
            nodeCount={nodes.length} 
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-text-hint text-sm">Graph initializing...</span>
            <div className="mt-4 w-8 h-8 rounded-full bg-text-hint/20 animate-fade-pulse" />
          </div>
        )}
      </div>

      {/* Bottom section: Node Status + minimap lives in graph (styled dark) - uses empty space below nodes */}
      <div className="shrink-0 flex items-center gap-3 px-2 py-2 border-t border-[#1a1a1a] bg-[#0a0a0a]">
        {/* Node Status box - black theme, no gray/white */}
        <div className="flex items-center gap-2 px-2 py-1.5 border border-[#1a1a1a] bg-[#0f0f0f]">
          <h3 className="text-[9px] uppercase tracking-widest text-text-tertiary">
            Node Status
          </h3>
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
              <span className="text-[10px] text-text-secondary">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
